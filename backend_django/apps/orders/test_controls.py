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


class MultipleTicketsPerTableTests(ControlBase):
    def test_staff_can_open_a_second_ticket_on_a_busy_table(self):
        a = self.new_order(type='DINE_IN', tableId='t1')
        self.cook_and_serve(a)
        b = self.new_order(type='DINE_IN', tableId='t1',
                           items=[{'menuItemId': self.item.id, 'quantity': 2}])
        self.assertNotEqual(a, b)
        self.assertEqual(self.order(a).items.count(), 1)
        self.table.refresh_from_db()
        self.assertEqual(self.table.current_order_id, b)

    def test_same_items_on_same_table_within_ten_minutes_is_refused(self):
        self.new_order(type='DINE_IN', tableId='t1')
        res = self.place_order(type='DINE_IN', tableId='t1')
        self.assertEqual(res.status_code, 409, res.data)
        self.assertIn('10 minutes', res.data['detail'])
        # Another table, or a different set of items, is fine.
        Table.objects.create(id='t2', name='Table 02')
        self.assertEqual(self.place_order(type='DINE_IN', tableId='t2').status_code, 201)

    def test_same_items_allowed_after_ten_minutes_or_once_cancelled(self):
        from datetime import timedelta
        from django.utils import timezone
        a = self.new_order(type='DINE_IN', tableId='t1')
        Order.objects.filter(id=a).update(created_at=timezone.now() - timedelta(minutes=11))
        b = self.new_order(type='DINE_IN', tableId='t1')
        self.login(self.waiter)
        self.client.post(f'{API}/orders/{b}/cancel', {'reason': 'wrong table'}, format='json')
        self.assertEqual(self.place_order(type='DINE_IN', tableId='t1').status_code, 201)

    def test_closing_one_ticket_keeps_the_table_busy_for_the_other(self):
        a = self.new_order(type='DINE_IN', tableId='t1')
        b = self.new_order(type='DINE_IN', tableId='t1',
                           items=[{'menuItemId': self.item.id, 'quantity': 3}])
        self.login(self.waiter)
        self.client.post(f'{API}/orders/{b}/cancel', {'reason': 'party left'}, format='json')
        self.table.refresh_from_db()
        self.assertNotEqual(self.table.status, 'AVAILABLE')
        self.assertEqual(self.table.current_order_id, a)
        self.client.post(f'{API}/orders/{a}/cancel', {'reason': 'party left'}, format='json')
        self.table.refresh_from_db()
        self.assertEqual((self.table.status, self.table.current_order_id), ('AVAILABLE', None))


class GuestDeliveryTests(ControlBase):
    def setUp(self):
        super().setUp()
        RestaurantSetting.objects.update_or_create(id=1, defaults={'delivery_enabled': True, 'delivery_fee': Decimal('80.00')})

    def delivery(self, **extra):
        payload = {'type': 'DELIVERY', 'customerName': 'Selam', 'customerPhone': '+251 911 22 33 44',
                   'deliveryAddress': 'Bole, near Edna Mall, blue gate', 'paymentPreference': 'TRANSFER', **extra}
        return self.place_order(as_user=None, **payload)

    def test_guest_delivery_is_draft_with_fee_and_normalised_phone(self):
        res = self.delivery(tableId='t1')
        self.assertEqual(res.status_code, 201, res.data)
        order = self.order(res.data['id'])
        self.assertEqual((order.type, order.status, order.table_id), ('DELIVERY', 'DRAFT', None))
        self.assertEqual(order.customer_phone, '0911223344')
        self.assertEqual(order.payment_preference, 'TRANSFER')
        self.assertEqual(order.delivery_fee, Decimal('80.00'))
        self.assertNotIn('customerPhone', res.data)  # public response stays masked
        # Staff call, then approve into the kitchen.
        self.login(self.waiter)
        approved = self.kitchen_act(order.id, 'APPROVE')
        self.assertEqual(approved.data['status'], 'PENDING')
        self.assertEqual(approved.data['customerPhone'], '0911223344')

    def test_guest_delivery_needs_contact_details(self):
        res = self.delivery(customerName='', customerPhone='12', deliveryAddress='')
        self.assertEqual(res.status_code, 400)
        self.assertLessEqual({'customerName', 'customerPhone', 'deliveryAddress'}, set(res.data))

    def test_guest_delivery_refused_when_switched_off(self):
        RestaurantSetting.objects.filter(id=1).update(delivery_enabled=False)
        res = self.delivery()
        self.assertEqual(res.status_code, 400)
        self.assertIn('not available', str(res.data['type']))

    def test_guest_delivery_respects_hours(self):
        from datetime import datetime, time
        from unittest import mock
        from django.utils import timezone
        RestaurantSetting.objects.filter(id=1).update(delivery_start_time=time(9), delivery_end_time=time(21))
        late = timezone.make_aware(datetime(2026, 11, 24, 22, 30))
        with mock.patch('django.utils.timezone.localtime', return_value=late):
            res = self.delivery()
        self.assertEqual(res.status_code, 400)
        self.assertIn('09:00 and 21:00', str(res.data['type']))
        s = RestaurantSetting.get_settings()
        self.assertTrue(s.delivery_open_now(timezone.make_aware(datetime(2026, 11, 24, 12))))
        # Overnight window.
        s.delivery_start_time, s.delivery_end_time = time(18), time(2)
        self.assertTrue(s.delivery_open_now(timezone.make_aware(datetime(2026, 11, 24, 1))))
        self.assertFalse(s.delivery_open_now(timezone.make_aware(datetime(2026, 11, 24, 12))))

    def test_same_delivery_from_same_phone_within_ten_minutes_is_refused(self):
        self.assertEqual(self.delivery().status_code, 201)
        self.assertEqual(self.delivery(customerPhone='0911223344').status_code, 409)
        self.assertEqual(self.delivery(customerPhone='0922000000').status_code, 201)

    def test_public_settings_show_delivery_state(self):
        self.anon()
        res = self.client.get(f'{API}/settings')
        self.assertTrue(res.data['deliveryEnabled'])
        self.assertTrue(res.data['deliveryOpenNow'])

    def test_owner_sets_delivery_hours_through_settings(self):
        self.login(self.owner)
        res = self.client.put(f'{API}/settings', {'deliveryStartTime': '09:00', 'deliveryEndTime': '21:30'}, format='json')
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual((res.data['deliveryStartTime'], res.data['deliveryEndTime']), ('09:00', '21:30'))
        res = self.client.put(f'{API}/settings', {'deliveryStartTime': None, 'deliveryEndTime': None}, format='json')
        self.assertIsNone(res.data['deliveryStartTime'])
