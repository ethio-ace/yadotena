"""Money controls: paid status, cancel/void/refund rules, ticket numbers,
table moves, recipe stock, guest QR key and the day-close report."""
from decimal import Decimal

from apps.core.models import RestaurantSetting
from apps.core.tests import API
from apps.orders.models import Order
from apps.orders.tests import OrderFlowBase
from apps.payments.models import Payment
from apps.products.models import MenuIngredient, Product
from apps.tables.models import Table


class ControlBase(OrderFlowBase):
    def pay(self, order_id, method='CASH'):
        return self.client.post(f'{API}/payments', {'orderId': order_id, 'method': method}, format='json')

    def cook_and_serve(self, order_id):
        for action in ('START', 'READY', 'SERVE'):
            self.kitchen_act(order_id, action)

    def order(self, oid):
        return Order.objects.get(id=oid)


class PaymentStatusLockTests(ControlBase):
    def test_staff_cannot_patch_payment_status(self):
        oid = self.new_order()
        self.login(self.waiter)
        res = self.client.patch(f'{API}/orders/{oid}', {'paymentStatus': 'PAID'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(self.order(oid).payment_status, 'PENDING')

    def test_guest_cannot_create_a_paid_order(self):
        res = self.place_order(as_user=None, type='DINE_IN', tableId='t1', paymentStatus='PAID')
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(self.order(res.data['id']).payment_status, 'PENDING')
        self.assertFalse(Payment.objects.exists())

    def test_payment_create_ignores_status(self):
        oid = self.new_order()
        self.login(self.waiter)
        res = self.client.post(f'{API}/payments', {'orderId': oid, 'status': 'REFUNDED'}, format='json')
        self.assertEqual(res.data['status'], 'PAID')
        self.assertEqual(self.order(oid).payment_status, 'PAID')

    def test_order_edit_cannot_touch_money_or_closed_tickets(self):
        oid = self.new_order()
        self.login(self.waiter)
        self.client.patch(f'{API}/orders/{oid}', {'total': '1.00', 'notes': 'no sugar'}, format='json')
        order = self.order(oid)
        self.assertEqual(order.notes, 'no sugar')
        self.assertEqual(order.total, Decimal('50.00'))

    def test_orders_cannot_be_deleted(self):
        oid = self.new_order()
        self.login(self.owner)
        self.assertEqual(self.client.delete(f'{API}/orders/{oid}').status_code, 405)


class CancelAndVoidTests(ControlBase):
    def test_cancel_needs_a_reason(self):
        oid = self.new_order()
        self.login(self.waiter)
        self.assertEqual(self.client.post(f'{API}/orders/{oid}/cancel', {}, format='json').status_code, 400)

    def test_waiter_can_cancel_untouched_ticket(self):
        oid = self.new_order()
        self.login(self.waiter)
        res = self.client.post(f'{API}/orders/{oid}/cancel', {'reason': 'Entered twice'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'CANCELLED')
        self.assertEqual(res.data['cancelReason'], 'Entered twice')

    def test_waiter_cannot_cancel_served_ticket(self):
        oid = self.new_order()
        self.cook_and_serve(oid)
        self.login(self.waiter)
        res = self.client.post(f'{API}/orders/{oid}/cancel', {'reason': 'left'}, format='json')
        self.assertEqual(res.status_code, 403)
        self.assertEqual(self.order(oid).status, 'SERVED')

    def test_waiter_cannot_cancel_paid_ticket(self):
        oid = self.new_order()
        self.login(self.waiter)
        self.pay(oid)
        res = self.client.post(f'{API}/orders/{oid}/cancel', {'reason': 'left'}, format='json')
        self.assertEqual(res.status_code, 403)

    def test_manager_cancel_of_paid_ticket_records_refund(self):
        oid = self.new_order()
        self.login(self.waiter)
        self.pay(oid)
        self.login(self.manager)
        res = self.client.post(f'{API}/orders/{oid}/cancel', {'reason': 'Food was cold'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        order = self.order(oid)
        self.assertEqual(order.status, 'CANCELLED')
        self.assertEqual(order.payment_status, 'REFUNDED')
        refund = order.payments.get(status='REFUNDED')
        self.assertEqual(refund.amount, Decimal('50.00'))
        self.assertEqual(refund.recorded_by, self.manager)

    def test_void_served_item_is_manager_only_and_needs_reason(self):
        oid = self.new_order(items=[{'menuItemId': self.item.id, 'quantity': 2}])
        self.cook_and_serve(oid)
        item_id = self.order(oid).items.first().id
        self.login(self.waiter)
        self.assertEqual(self.kitchen_act(oid, 'VOID', itemIds=[item_id], reason='wrong').status_code, 403)
        self.login(self.manager)
        self.assertEqual(self.kitchen_act(oid, 'VOID', itemIds=[item_id]).status_code, 400)
        res = self.kitchen_act(oid, 'VOID', itemIds=[item_id], reason='Wrong dish served')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(self.order(oid).total, Decimal('0.00'))

    def test_void_on_paid_ticket_refunds_the_difference(self):
        milk2 = self.item.__class__.objects.create(name='Tea', price='30.00', category=self.category)
        oid = self.new_order(items=[{'menuItemId': self.item.id, 'quantity': 1},
                                    {'menuItemId': milk2.id, 'quantity': 1}])
        self.cook_and_serve(oid)
        self.login(self.waiter)
        self.pay(oid)
        tea = self.order(oid).items.get(name='Tea')
        self.login(self.manager)
        self.kitchen_act(oid, 'VOID', itemIds=[tea.id], reason='Guest complaint')
        order = self.order(oid)
        self.assertEqual(order.total, Decimal('50.00'))
        self.assertEqual(order.payments.get(status='REFUNDED').amount, Decimal('30.00'))
        self.assertEqual(order.payment_status, 'PAID')

    def test_refund_endpoint_limits_and_permissions(self):
        oid = self.new_order()
        self.login(self.waiter)
        self.pay(oid)
        self.assertEqual(self.client.post(f'{API}/orders/{oid}/refund', {'amount': 10, 'reason': 'x y z'},
                                          format='json').status_code, 403)
        self.login(self.manager)
        too_much = self.client.post(f'{API}/orders/{oid}/refund', {'amount': 60, 'reason': 'overcharged'}, format='json')
        self.assertEqual(too_much.status_code, 400)
        res = self.client.post(f'{API}/orders/{oid}/refund', {'amount': 20, 'reason': 'Overcharged'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['amountPaid'], 30.0)
        self.assertEqual(res.data['balanceDue'], 20.0)
        self.assertEqual(res.data['paymentStatus'], 'PENDING')


class TicketNumberAndOwnerTests(ControlBase):
    def test_daily_numbers_count_up_and_record_waiter(self):
        a = self.place_order().data
        b = self.place_order().data
        self.assertEqual((a['dailyNumber'], b['dailyNumber']), (1, 2))
        self.assertEqual(a['createdByName'], self.waiter.name or self.waiter.email)

    def test_guest_order_owner_is_approving_waiter(self):
        oid = self.place_order(as_user=None, type='DINE_IN', tableId='t1').data['id']
        self.assertIsNone(self.order(oid).created_by)
        self.login(self.waiter)
        self.kitchen_act(oid, 'APPROVE')
        self.assertEqual(self.order(oid).created_by, self.waiter)

    def test_search_by_ticket_number(self):
        self.place_order()
        oid = self.place_order().data['id']
        self.login(self.waiter)
        res = self.client.get(f'{API}/orders', {'search': '#2'})
        self.assertEqual([o['id'] for o in res.data], [oid])

    def test_guest_cannot_see_staff_names(self):
        oid = self.new_order()
        self.anon()
        data = self.client.get(f'{API}/orders/{oid}').data
        self.assertNotIn('createdByName', data)


class MoveTableTests(ControlBase):
    def setUp(self):
        super().setUp()
        self.t2 = Table.objects.create(id='t2', name='Table 02')

    def test_move_to_free_table(self):
        oid = self.new_order(type='DINE_IN', tableId='t1')
        self.login(self.waiter)
        res = self.client.post(f'{API}/orders/{oid}/move', {'tableId': 't2'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['tableId'], 't2')
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'AVAILABLE')

    def test_move_to_busy_table_merges(self):
        a = self.new_order(type='DINE_IN', tableId='t1')
        self.login(self.waiter)
        self.pay(a)
        b = self.new_order(type='DINE_IN', tableId='t2')
        self.login(self.waiter)
        res = self.client.post(f'{API}/orders/{a}/move', {'tableId': 't2'}, format='json')
        self.assertEqual(res.data['id'], b)
        target = self.order(b)
        self.assertEqual(target.items.count(), 2)
        self.assertEqual(sorted(target.items.values_list('round_number', flat=True)), [1, 2])
        self.assertEqual(target.total, Decimal('110.00'))  # 2 x 50 + 10% service
        self.assertEqual(target.payments.count(), 1)     # payment followed the food
        self.assertEqual(target.payment_status, 'PENDING')  # 55 of 110 paid
        source = self.order(a)
        self.assertEqual((source.status, source.merged_into_id), ('CANCELLED', b))


class SettingsTests(ControlBase):
    def test_vat_off_by_default_and_delivery_fee_from_settings(self):
        RestaurantSetting.objects.update_or_create(id=1, defaults={'delivery_fee': Decimal('70.00')})
        res = self.place_order(type='DELIVERY', deliveryAddress='Bole')
        self.assertEqual(res.data['deliveryFee'], Decimal('70.00'))
        self.assertEqual(res.data['tax'], Decimal('0.00'))

    def test_guest_order_needs_qr_key_when_enforced(self):
        RestaurantSetting.objects.update_or_create(id=1, defaults={'require_table_qr_key': True})
        bad = self.place_order(as_user=None, type='DINE_IN', tableId='t1')
        self.assertEqual(bad.status_code, 400)
        self.assertIn('tableKey', bad.data)
        ok = self.place_order(as_user=None, type='DINE_IN', tableId='t1', tableKey=self.table.qr_token)
        self.assertEqual(ok.status_code, 201, ok.data)


class RecipeStockTests(ControlBase):
    def test_stock_taken_once_when_cooking_starts(self):
        milk = Product.objects.create(name='Milk', price='0', unit='L', stock_quantity='10.00')
        MenuIngredient.objects.create(menu_item=self.item, product=milk, quantity=Decimal('0.25'))
        oid = self.new_order(items=[{'menuItemId': self.item.id, 'quantity': 2}])
        milk.refresh_from_db()
        self.assertEqual(milk.stock_quantity, Decimal('10.00'))   # not yet cooked
        self.cook_and_serve(oid)
        milk.refresh_from_db()
        self.assertEqual(milk.stock_quantity, Decimal('9.50'))

    def test_counter_sale_takes_stock_immediately(self):
        milk = Product.objects.create(name='Milk', price='0', unit='L', stock_quantity='1.00')
        MenuIngredient.objects.create(menu_item=self.item, product=milk, quantity=Decimal('1'))
        self.place_order(status='COMPLETED')
        milk.refresh_from_db()
        self.assertEqual(milk.stock_quantity, Decimal('0.00'))


class DayCloseTests(ControlBase):
    def test_report_counts_cash_refunds_and_voids(self):
        oid = self.new_order(items=[{'menuItemId': self.item.id, 'quantity': 2}])
        self.cook_and_serve(oid)
        self.login(self.waiter)
        self.pay(oid)
        self.login(self.manager)
        self.client.post(f'{API}/orders/{oid}/refund', {'amount': 20, 'reason': 'Overcharged'}, format='json')
        report = self.client.get(f'{API}/reports/day-close').data
        self.assertEqual(report['totals']['collected'], 100.0)
        self.assertEqual(report['totals']['refunded'], 20.0)
        self.assertEqual(report['cash']['expected'], 80.0)
        self.assertEqual(report['byStaff'][0]['name'], self.waiter.name or self.waiter.email)
        self.assertEqual(len(report['refunds']), 1)

        res = self.client.post(f'{API}/reports/day-close', {'countedCash': 75, 'notes': 'short 5'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['closed']['difference'], -5.0)

    def test_day_close_is_manager_only(self):
        self.login(self.waiter)
        self.assertEqual(self.client.get(f'{API}/reports/day-close').status_code, 403)
