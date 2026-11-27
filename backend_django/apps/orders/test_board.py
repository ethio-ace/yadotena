"""Public order board shown on the café TV."""
from apps.core.tests import API
from apps.orders.models import Order
from apps.orders.tests import OrderFlowBase


class OrderBoardTests(OrderFlowBase):
    def board(self):
        self.anon()
        res = self.client.get(f'{API}/orders/board')
        self.assertEqual(res.status_code, 200, getattr(res, 'data', None))
        return {o['code']: o for o in res.data['orders']}

    def test_public_and_stage_follows_kitchen(self):
        oid = self.new_order(type='DINE_IN', tableId='t1', customerName='Abebe', customerPhone='0911000000')
        code = oid[-6:].upper()
        entry = self.board()[code]
        self.assertEqual(entry['stage'], 'received')
        self.assertEqual(entry['tableName'], 'Table 01')
        # Nothing private or financial leaks onto the screen.
        for key in ('customerName', 'customerPhone', 'total', 'id', 'notes', 'deliveryAddress'):
            self.assertNotIn(key, entry)

        self.login(self.kitchen)
        self.kitchen_act(oid, 'START')
        self.assertEqual(self.board()[code]['stage'], 'preparing')
        self.login(self.kitchen)
        self.kitchen_act(oid, 'READY')
        self.assertEqual(self.board()[code]['stage'], 'ready')
        self.login(self.kitchen)
        self.kitchen_act(oid, 'SERVE')
        self.assertNotIn(code, self.board())

    def test_hides_guest_drafts_until_approved_and_deliveries(self):
        res = self.place_order(as_user=None, type='DINE_IN', tableId='t1')
        self.assertEqual(res.status_code, 201, res.data)
        guest_code = res.data['id'][-6:].upper()
        self.assertNotIn(guest_code, self.board())
        self.login(self.manager)
        self.assertEqual(self.kitchen_act(res.data['id'], 'APPROVE').status_code, 200)
        self.assertEqual(self.board()[guest_code]['stage'], 'received')

        delivery = self.new_order(type='DELIVERY', customerName='X', customerPhone='0911000000', deliveryAddress='Bole')
        self.assertNotIn(delivery[-6:].upper(), self.board())

    def test_owner_and_manager_can_approve_and_settle(self):
        for user in (self.owner, self.manager):
            res = self.place_order(as_user=None, type='DINE_IN', tableId='t1')
            oid = res.data['id']
            self.login(user)
            self.assertEqual(self.kitchen_act(oid, 'APPROVE').status_code, 200)
            for action in ('START', 'READY', 'SERVE'):
                self.kitchen_act(oid, action)
            pay = self.client.post(f'{API}/payments', {'orderId': oid, 'method': 'CASH'}, format='json')
            self.assertEqual(pay.status_code, 201, pay.data)
            self.assertEqual(Order.objects.get(id=oid).status, 'COMPLETED')
