"""Kitchen lifecycle, whole-order status rules and order lookup (Go parity)."""
from datetime import timedelta

from django.utils import timezone

from apps.core.tests import API, BaseAPITest
from apps.orders.models import Order


class OrderFlowBase(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.login(self.kitchen)

    def new_order(self, **extra):
        res = self.place_order(**extra)
        self.assertEqual(res.status_code, 201, res.data)
        return res.data['id']

    def kitchen_act(self, order_id, action, **extra):
        return self.client.post(f'{API}/orders/{order_id}/kitchen', {'action': action, **extra}, format='json')

    def set_status(self, order_id, new_status, **extra):
        return self.client.post(f'{API}/orders/{order_id}/status', {'status': new_status, **extra}, format='json')

    def item_statuses(self, order_id):
        return sorted(Order.objects.get(id=order_id).items.values_list('round_number', 'status'))


class KitchenActionTests(OrderFlowBase):
    def test_round_lifecycle_derives_order_status(self):
        oid = self.new_order()
        res = self.kitchen_act(oid, 'START', roundNumber=1)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'PREPARING')
        self.assertIsNotNone(res.data['items'][0]['startedAt'])
        self.assertEqual(self.kitchen_act(oid, 'READY', roundNumber=1).data['status'], 'READY')
        self.assertEqual(self.kitchen_act(oid, 'SERVE', roundNumber=1).data['status'], 'SERVED')

    def test_ineligible_action_is_409(self):
        oid = self.new_order()
        res = self.kitchen_act(oid, 'READY', roundNumber=1)  # still PENDING
        self.assertEqual(res.status_code, 409)
        self.assertIn('eligible', res.data['detail'])

    def test_unknown_action_is_400(self):
        self.assertEqual(self.kitchen_act(self.new_order(), 'FRY').status_code, 400)

    def test_rounds_are_independent(self):
        oid = self.new_order()
        self.kitchen_act(oid, 'START', roundNumber=1)
        self.kitchen_act(oid, 'READY', roundNumber=1)
        self.login(self.waiter)
        self.client.post(f'{API}/orders/{oid}/add-items', {'items': [{'menuItemId': self.item.id, 'quantity': 1}]}, format='json')
        self.login(self.kitchen)
        # Round 1 READY wins over new round 2 PENDING.
        self.assertEqual(Order.objects.get(id=oid).status, 'READY')
        self.kitchen_act(oid, 'START', roundNumber=2)
        self.assertEqual(self.item_statuses(oid), [(1, 'READY'), (2, 'PREPARING')])

    def test_new_round_on_served_ticket_reopens_kitchen(self):
        oid = self.new_order()
        for action in ('START', 'READY', 'SERVE'):
            self.kitchen_act(oid, action)
        self.login(self.waiter)
        res = self.client.post(f'{API}/orders/{oid}/add-items', {'items': [{'menuItemId': self.item.id, 'quantity': 1}]}, format='json')
        self.assertEqual(res.data['status'], 'PENDING')

    def test_cancel_only_unstarted_or_cooking_items(self):
        oid = self.new_order()
        self.assertEqual(self.kitchen_act(oid, 'CANCEL').status_code, 200)
        self.assertEqual(self.item_statuses(oid), [(1, 'CANCELLED')])

    def test_customer_cannot_drive_kitchen(self):
        oid = self.new_order()
        self.anon()
        self.assertIn(self.kitchen_act(oid, 'START').status_code, (401, 403))


class WholeOrderStatusTests(OrderFlowBase):
    def test_status_change_translates_to_items(self):
        oid = self.new_order()
        self.assertEqual(self.set_status(oid, 'PREPARING').data['status'], 'PREPARING')
        self.assertEqual(self.item_statuses(oid), [(1, 'PREPARING')])

    def test_complete_requires_payment(self):
        oid = self.new_order()
        res = self.set_status(oid, 'COMPLETED')
        self.assertEqual(res.status_code, 409)
        self.assertIn('payment', res.data['detail'].lower())

    def test_complete_blocked_while_cooking(self):
        oid = self.new_order()
        Order.objects.filter(id=oid).update(payment_status='PAID')
        self.set_status(oid, 'PREPARING')
        self.assertEqual(self.set_status(oid, 'COMPLETED').status_code, 409)

    def test_paid_ticket_completes_when_served(self):
        oid = self.new_order()
        Order.objects.filter(id=oid).update(payment_status='PAID')
        for s in ('PREPARING', 'READY'):
            self.set_status(oid, s)
        self.assertEqual(self.set_status(oid, 'SERVED').data['status'], 'COMPLETED')

    def test_terminal_orders_are_immutable(self):
        oid = self.new_order()
        self.assertEqual(self.set_status(oid, 'CANCELLED', reason='Customer left').data['status'], 'CANCELLED')
        self.assertEqual(self.item_statuses(oid), [(1, 'CANCELLED')])
        self.assertEqual(self.set_status(oid, 'PREPARING').status_code, 409)
        self.assertEqual(self.set_status(oid, 'CANCELLED', reason='again').status_code, 200)  # idempotent

    def test_patch_order_with_status_is_status_change(self):
        oid = self.new_order()
        res = self.client.patch(f'{API}/orders/{oid}', {'status': 'PREPARING'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['status'], 'PREPARING')

    def test_dine_in_table_freed_on_cancel(self):
        oid = self.new_order(type='DINE_IN', tableId='t1')
        self.table.refresh_from_db()
        self.assertNotEqual(self.table.status, 'AVAILABLE')
        self.set_status(oid, 'CANCELLED', reason='Wrong table')
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'AVAILABLE')


class OrderQueryTests(OrderFlowBase):
    def test_lookup_by_suffix_is_public_and_masked(self):
        oid = self.new_order()
        self.anon()
        res = self.client.get(f'{API}/orders/lookup', {'number': oid[-6:].lower()})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], oid)
        self.assertNotIn('customerPhone', res.data)
        self.assertEqual(self.client.get(f'{API}/orders/lookup', {'number': 'ZZZZZZ'}).status_code, 404)

    def test_since_filter_and_case_insensitive_filters(self):
        old = self.new_order()
        Order.objects.filter(id=old).update(updated_at=timezone.now() - timedelta(hours=2))
        fresh = self.new_order()
        since = (timezone.now() - timedelta(minutes=5)).isoformat()
        ids = [o['id'] for o in self.client.get(f'{API}/orders', {'since': since}).data]
        self.assertEqual(ids, [fresh])
        self.assertEqual(len(self.client.get(f'{API}/orders', {'status': 'pending'}).data), 2)
        self.assertEqual(self.client.get(f'{API}/orders', {'since': 'yesterday'}).status_code, 400)

    def test_money_is_numeric(self):
        data = self.client.get(f'{API}/orders/{self.new_order()}').json()
        self.assertIsInstance(data['total'], (int, float))
        self.assertIsInstance(data['items'][0]['price'], (int, float))


class GuestOrderTests(OrderFlowBase):
    """Public-menu orders arrive as DRAFT and need a waiter's approval."""

    def guest_order(self, **extra):
        res = self.place_order(as_user=None, type='DINE_IN', tableId='t1',
                               customerPhone='0911', deliveryAddress='x', **extra)
        self.assertEqual(res.status_code, 201, res.data)
        return res.data['id']

    def test_guest_order_is_draft_until_approved(self):
        oid = self.guest_order()
        order = Order.objects.get(id=oid)
        self.assertEqual((order.status, order.type), ('DRAFT', 'DINE_IN'))
        self.assertEqual((order.customer_phone, order.delivery_address), (None, None))
        self.assertEqual(self.item_statuses(oid), [(1, 'DRAFT')])
        # The kitchen cannot start a round nobody approved.
        self.assertEqual(self.kitchen_act(oid, 'START', roundNumber=1).status_code, 409)
        self.login(self.waiter)
        res = self.kitchen_act(oid, 'APPROVE', roundNumber=1)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'PENDING')
        self.assertEqual(self.item_statuses(oid), [(1, 'PENDING')])

    def test_rejecting_whole_guest_order_cancels_it_and_frees_table(self):
        oid = self.guest_order()
        self.login(self.waiter)
        res = self.kitchen_act(oid, 'REJECT', roundNumber=1)
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data['status'], 'CANCELLED')
        self.table.refresh_from_db()
        self.assertIsNone(self.table.current_order_id)

    def test_guest_round_joins_open_ticket_without_touching_cooking_work(self):
        self.login(self.waiter)
        oid = self.place_order(type='DINE_IN', tableId='t1').data['id']
        self.login(self.kitchen)
        self.kitchen_act(oid, 'START', roundNumber=1)
        merged = self.guest_order()
        self.assertEqual(merged, oid)
        self.assertEqual(self.item_statuses(oid), [(1, 'PREPARING'), (2, 'DRAFT')])
        self.assertEqual(Order.objects.get(id=oid).status, 'PREPARING')
        # Rejecting the guest round leaves round 1 alone and drops it from the bill.
        self.login(self.waiter)
        res = self.kitchen_act(oid, 'REJECT', roundNumber=2)
        self.assertEqual(res.data['status'], 'PREPARING')
        self.assertEqual(float(Order.objects.get(id=oid).subtotal), 50.0)

    def test_cannot_close_with_unreviewed_guest_items(self):
        from apps.payments.services import record_payment
        self.login(self.waiter)
        oid = self.place_order(type='DINE_IN', tableId='t1').data['id']
        for action in ('START', 'READY', 'SERVE'):
            self.kitchen_act(oid, action, roundNumber=1)
        self.guest_order()
        record_payment(order_id=oid, method='CASH', recorded_by=self.waiter)
        self.login(self.waiter)
        self.assertEqual(self.set_status(oid, 'COMPLETED').status_code, 409)

    def test_staff_orders_skip_approval(self):
        oid = self.new_order()
        self.assertEqual(self.item_statuses(oid), [(1, 'PENDING')])


class FlowRefinementTests(OrderFlowBase):
    """End-to-end edges: counter sales, kitchen cancels, paid tickets that grow."""

    def pay(self, oid):
        from apps.payments.services import record_payment
        return record_payment(order_id=oid, method='CASH', recorded_by=self.waiter)[0]

    def test_counter_sale_never_reaches_the_kitchen(self):
        self.login(self.waiter)
        res = self.place_order(type='TAKEAWAY', status='COMPLETED')
        oid = res.data['id']
        self.assertEqual(self.item_statuses(oid), [(1, 'SERVED')])
        self.assertEqual(res.data['status'], 'SERVED')
        self.pay(oid)
        self.assertEqual(Order.objects.get(id=oid).status, 'COMPLETED')

    def test_guest_cannot_skip_the_kitchen_or_approval(self):
        res = self.place_order(as_user=None, type='DINE_IN', tableId='t1', status='COMPLETED')
        self.assertEqual(self.item_statuses(res.data['id']), [(1, 'DRAFT')])

    def test_kitchen_cancel_drops_line_from_bill_and_closes_empty_ticket(self):
        self.login(self.waiter)
        oid = self.place_order(type='DINE_IN', tableId='t1').data['id']
        self.login(self.kitchen)
        res = self.kitchen_act(oid, 'CANCEL', roundNumber=1)
        self.assertEqual(res.data['status'], 'CANCELLED')
        self.assertEqual(float(res.data['total']), 0.0)
        self.table.refresh_from_db()
        self.assertIsNone(self.table.current_order_id)

    def test_kitchen_serve_closes_a_paid_ticket(self):
        self.login(self.waiter)
        oid = self.place_order(type='DINE_IN', tableId='t1').data['id']
        self.pay(oid)
        self.login(self.kitchen)
        for action in ('START', 'READY'):
            self.kitchen_act(oid, action, roundNumber=1)
        res = self.kitchen_act(oid, 'SERVE', roundNumber=1)
        self.assertEqual(res.data['status'], 'COMPLETED')
        self.table.refresh_from_db()
        self.assertEqual(self.table.status, 'AVAILABLE')

    def test_round_added_after_payment_is_billed(self):
        self.login(self.waiter)
        oid = self.place_order(type='DINE_IN', tableId='t1').data['id']
        first = self.pay(oid)
        paid_total = float(Order.objects.get(id=oid).total)
        res = self.client.post(f'{API}/orders/{oid}/add-items',
                               {'items': [{'menuItemId': self.item.id, 'quantity': 2}]}, format='json')
        self.assertEqual(res.data['paymentStatus'], 'PENDING')
        self.assertAlmostEqual(res.data['amountPaid'], paid_total)
        self.assertAlmostEqual(res.data['balanceDue'], float(res.data['total']) - paid_total)
        second = self.pay(oid)
        self.assertNotEqual(first.pk, second.pk)
        self.assertAlmostEqual(float(second.amount), res.data['balanceDue'])
        order = Order.objects.get(id=oid)
        self.assertEqual(order.payment_status, 'PAID')

    def test_bad_quantity_is_a_400_not_a_crash(self):
        res = self.place_order(as_user=None, type='DINE_IN', tableId='t1',
                               items=[{'menuItemId': self.item.id, 'quantity': 'lots'}])
        self.assertEqual(res.status_code, 400)
        res = self.place_order(as_user=None, type='DINE_IN', tableId='t1',
                               items=[{'menuItemId': self.item.id, 'quantity': 500}])
        self.assertEqual(res.status_code, 400)
