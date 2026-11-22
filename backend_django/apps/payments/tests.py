from apps.core.tests import API, BaseAPITest
from apps.orders.models import Order
from apps.payments.models import Payment, PaymentMethod


class PaymentTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.order_id = self.place_order(type='DINE_IN', tableId='t1').data['id']
        self.login(self.waiter)

    def pay(self, **extra):
        return self.client.post(f'{API}/payments', {'orderId': self.order_id, 'method': 'telebirr', **extra}, format='json')

    def test_default_methods_seeded(self):
        self.assertEqual(set(PaymentMethod.objects.values_list('code', flat=True)), {'CASH', 'TELEBIRR', 'CBE', 'BOA', 'EBIRR'})

    def test_amount_is_server_authoritative(self):
        res = self.pay(amount=1, transactionRef='TX1')
        self.assertEqual(res.status_code, 201, res.json())
        order = Order.objects.get(id=self.order_id)
        self.assertEqual(float(res.json()['amount']), float(order.total))
        self.assertEqual(res.json()['method'], 'TELEBIRR')
        self.assertEqual(res.json()['transactionRef'], 'TX1')
        self.assertEqual(order.payment_status, 'PAID')

    def test_settling_twice_returns_existing_payment(self):
        first = self.pay().json()
        second = self.pay()
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()['id'], first['id'])
        self.assertEqual(Payment.objects.count(), 1)

    def test_served_ticket_completes_and_frees_table(self):
        self.client.post(f'{API}/orders/{self.order_id}/status', {'status': 'PREPARING'}, format='json')
        self.client.post(f'{API}/orders/{self.order_id}/status', {'status': 'READY'}, format='json')
        self.client.post(f'{API}/orders/{self.order_id}/status', {'status': 'SERVED'}, format='json')
        self.pay()
        self.assertEqual(Order.objects.get(id=self.order_id).status, 'COMPLETED')
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'AVAILABLE')

    def test_unserved_ticket_stays_open_after_payment(self):
        self.pay()
        self.assertEqual(Order.objects.get(id=self.order_id).status, 'PENDING')

    def test_unknown_or_disabled_method_rejected(self):
        self.assertEqual(self.pay(method='BITCOIN').status_code, 400)
        PaymentMethod.objects.filter(code='CBE').update(is_active=False)
        self.assertEqual(self.pay(method='CBE').status_code, 400)

    def test_order_embeds_payments(self):
        self.pay()
        data = self.client.get(f'{API}/orders/{self.order_id}').json()
        self.assertEqual(len(data['payments']), 1)

    def test_customer_cannot_pay_or_list(self):
        self.anon()
        self.assertIn(self.pay().status_code, (401, 403))
        self.assertIn(self.client.get(f'{API}/payments').status_code, (401, 403))


class PaymentMethodTests(BaseAPITest):
    def test_public_sees_active_methods_only(self):
        PaymentMethod.objects.filter(code='BOA').update(is_active=False)
        codes = {m['code'] for m in self.client.get(f'{API}/payment-methods').json()}
        self.assertNotIn('BOA', codes)
        self.assertIn('CASH', codes)
        self.login(self.manager)
        all_codes = {m['code'] for m in self.client.get(f'{API}/payment-methods?all=true').json()}
        self.assertIn('BOA', all_codes)

    def test_manager_crud_with_camelcase(self):
        self.login(self.manager)
        res = self.client.post(f'{API}/payment-methods', {
            'name': 'Awash Bank', 'code': 'awash', 'type': 'digital',
            'accountNumber': '0132', 'accountName': 'Hilif', 'isActive': True,
        }, format='json')
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()['code'], 'AWASH')
        pk = res.json()['id']
        self.assertEqual(self.client.patch(f'{API}/payment-methods/{pk}', {'isActive': False}, format='json').json()['isActive'], False)
        self.assertEqual(self.client.post(f'{API}/payment-methods', {'name': 'dup', 'code': 'AWASH'}, format='json').status_code, 400)
        self.assertEqual(self.client.delete(f'{API}/payment-methods/{pk}').status_code, 204)

    def test_waiter_cannot_edit_methods(self):
        self.login(self.waiter)
        self.assertEqual(self.client.post(f'{API}/payment-methods', {'name': 'x', 'code': 'X'}, format='json').status_code, 403)
