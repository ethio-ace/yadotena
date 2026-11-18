"""Access-control tests for the public vs staff vs manager API surface."""
from datetime import timedelta

from django.core.cache import cache
from django.test import override_settings
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.authentication.models import User
from apps.menu.models import MenuCategory, MenuItem
from apps.orders.models import Order
from apps.tables.models import Table

API = '/api/v1'


def make_user(email, role, password='Str0ng-pass-123', **extra):
    return User.objects.create_user(email=email, password=password, name=email.split('@')[0], role=role, **extra)


class BaseAPITest(APITestCase):
    def setUp(self):
        cache.clear()
        self.owner = make_user('owner@test.com', 'OWNER')
        self.manager = make_user('manager@test.com', 'MANAGER')
        self.waiter = make_user('waiter@test.com', 'WAITER')
        self.kitchen = make_user('kitchen@test.com', 'KITCHEN')
        self.category = MenuCategory.objects.create(name='Drinks')
        self.item = MenuItem.objects.create(name='Milk', price='50.00', category=self.category)
        self.table = Table.objects.create(id='t1', name='Table 01')

    def login(self, user):
        token, _ = Token.objects.get_or_create(user=user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def anon(self):
        self.client.credentials()

    def place_order(self, **extra):
        payload = {'type': 'TAKEAWAY', 'customerName': 'Abebe', 'customerPhone': '0911000000',
                   'items': [{'menuItemId': self.item.id, 'quantity': 1}], **extra}
        return self.client.post(f'{API}/orders/', payload, format='json')


class LoginTests(BaseAPITest):
    def test_login_returns_token_that_authenticates(self):
        res = self.client.post(f'{API}/auth/login/', {'email': 'Waiter@Test.com ', 'password': 'Str0ng-pass-123'}, format='json')
        self.assertEqual(res.status_code, 200)
        self.assertIn('token', res.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['token']}")
        self.assertEqual(self.client.get(f'{API}/auth/me/').data['email'], 'waiter@test.com')

    def test_wrong_password_and_inactive_user_rejected_identically(self):
        make_user('gone@test.com', 'WAITER', status='INACTIVE', is_active=False)
        bad = self.client.post(f'{API}/auth/login/', {'email': 'waiter@test.com', 'password': 'nope'}, format='json')
        inactive = self.client.post(f'{API}/auth/login/', {'email': 'gone@test.com', 'password': 'Str0ng-pass-123'}, format='json')
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(inactive.status_code, 400)
        self.assertEqual(bad.data, inactive.data)

    def test_expired_token_rejected(self):
        token = Token.objects.create(user=self.waiter)
        Token.objects.filter(pk=token.pk).update(created=token.created - timedelta(hours=13))
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.assertEqual(self.client.get(f'{API}/auth/me/').status_code, 401)
        self.assertFalse(Token.objects.filter(pk=token.pk).exists())

    def test_logout_revokes_token(self):
        self.login(self.waiter)
        self.assertEqual(self.client.post(f'{API}/auth/logout/').status_code, 200)
        self.assertEqual(self.client.get(f'{API}/auth/me/').status_code, 401)

    def test_deactivating_user_revokes_token(self):
        self.login(self.waiter)
        token_header = self.client._credentials['HTTP_AUTHORIZATION']
        self.login(self.manager)
        self.client.post(f'{API}/users/{self.waiter.id}/toggle-status/')
        self.client.credentials(HTTP_AUTHORIZATION=token_header)
        self.assertEqual(self.client.get(f'{API}/auth/me/').status_code, 401)

    @override_settings(REST_FRAMEWORK={
        'DEFAULT_PERMISSION_CLASSES': ['apps.core.permissions.IsStaff'],
        'DEFAULT_AUTHENTICATION_CLASSES': ['apps.authentication.tokens.ExpiringTokenAuthentication'],
        'DEFAULT_THROTTLE_RATES': {'login': '3/min'},
    })
    def test_login_is_rate_limited(self):
        from rest_framework.throttling import SimpleRateThrottle
        from rest_framework.settings import api_settings
        old = SimpleRateThrottle.THROTTLE_RATES
        SimpleRateThrottle.THROTTLE_RATES = api_settings.DEFAULT_THROTTLE_RATES
        try:
            codes = [self.client.post(f'{API}/auth/login/', {'email': 'x@test.com', 'password': 'x'}, format='json').status_code
                     for _ in range(4)]
        finally:
            SimpleRateThrottle.THROTTLE_RATES = old
        self.assertEqual(codes[-1], 429)


class AnonymousAccessTests(BaseAPITest):
    def test_back_office_endpoints_require_auth(self):
        for url in ['/users/', '/orders/', '/expenses/', '/customers/', '/payments/', '/reviews/',
                    '/reports/summary/', '/products/', '/service-requests/', '/tables/']:
            res = self.client.get(f'{API}{url}')
            self.assertIn(res.status_code, (401, 403), url)

    def test_anonymous_cannot_create_owner(self):
        res = self.client.post(f'{API}/users/', {'email': 'evil@x.com', 'password': 'whatever123', 'role': 'OWNER'}, format='json')
        self.assertIn(res.status_code, (401, 403))
        self.assertFalse(User.objects.filter(email='evil@x.com').exists())

    def test_anonymous_cannot_change_settings_or_menu(self):
        self.assertIn(self.client.put(f'{API}/settings/', {'restaurantName': 'x'}, format='json').status_code, (401, 403))
        self.assertIn(self.client.delete(f'{API}/menu/{self.item.id}/').status_code, (401, 403))

    def test_customer_flow_is_public(self):
        self.assertEqual(self.client.get(f'{API}/menu/').status_code, 200)
        self.assertEqual(self.client.get(f'{API}/categories/').status_code, 200)
        self.assertEqual(self.client.get(f'{API}/settings/').status_code, 200)
        self.assertIn(self.client.post(f'{API}/tables/t1/start-session/').status_code, (200, 201))
        self.assertEqual(self.client.get(f'{API}/sessions/active/?table=t1').status_code, 200)

        res = self.place_order()
        self.assertEqual(res.status_code, 201, res.data)
        order_id = res.data['id']
        self.assertEqual(self.client.get(f'{API}/orders/{order_id}/').status_code, 200)
        add = self.client.post(f'{API}/orders/{order_id}/add-items/',
                               {'items': [{'menuItemId': self.item.id, 'quantity': 2}]}, format='json')
        self.assertEqual(add.status_code, 200)
        req = self.client.post(f'{API}/service-requests/', {'tableId': 't1', 'type': 'CALL_WAITER'}, format='json')
        self.assertNotIn(req.status_code, (401, 403))

    def test_anonymous_cannot_change_order_status(self):
        order_id = self.place_order().data['id']
        res = self.client.post(f'{API}/orders/{order_id}/status/', {'status': 'COMPLETED'}, format='json')
        self.assertIn(res.status_code, (401, 403))

    def test_customer_cannot_mark_order_paid(self):
        res = self.place_order(paymentStatus='PAID')
        self.assertEqual(Order.objects.get(id=res.data['id']).payment_status, 'PENDING')

    def test_public_order_lookup_hides_contact_details(self):
        order_id = self.place_order().data['id']
        public = self.client.get(f'{API}/orders/{order_id}/').data
        self.assertNotIn('customerPhone', public)
        self.login(self.waiter)
        self.assertEqual(self.client.get(f'{API}/orders/{order_id}/').data['customerPhone'], '0911000000')

    def test_order_ids_are_long_and_random(self):
        ids = {self.place_order().data['id'] for _ in range(5)}
        self.assertEqual(len(ids), 5)
        for order_id in ids:
            self.assertRegex(order_id, r'^ORD-[A-Z2-9]{10}$')

    @override_settings(ABLY_API_KEY='appid.keyid:secretvalue')
    def test_ably_token_is_subscribe_only_and_hides_secret(self):
        res = self.client.get(f'{API}/auth/ably-token/')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['keyName'], 'appid.keyid')
        self.assertEqual(res.data['capability'], '{"yadotena-realtime":["subscribe"]}')
        self.assertNotIn('secretvalue', str(res.data))


class RoleTests(BaseAPITest):
    def test_waiter_and_kitchen_can_work_orders(self):
        order_id = self.place_order().data['id']
        self.login(self.kitchen)
        self.assertEqual(self.client.get(f'{API}/orders/').status_code, 200)
        self.assertEqual(self.client.post(f'{API}/orders/{order_id}/status/', {'status': 'PREPARING'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(f'{API}/menu/{self.item.id}/toggle-availability/').status_code, 200)

    def test_floor_staff_blocked_from_back_office(self):
        for user in (self.waiter, self.kitchen):
            self.login(user)
            for url in ['/users/', '/expenses/', '/reports/summary/', '/products/']:
                self.assertEqual(self.client.get(f'{API}{url}').status_code, 403, (user.role, url))
            self.assertEqual(self.client.post(f'{API}/users/', {'email': 'n@x.com', 'password': 'whatever123', 'role': 'OWNER'}, format='json').status_code, 403)

    def test_manager_cannot_create_or_edit_owner(self):
        self.login(self.manager)
        res = self.client.post(f'{API}/users/', {'email': 'boss@x.com', 'name': 'b', 'password': 'Whatever-123', 'role': 'OWNER'}, format='json')
        self.assertEqual(res.status_code, 400)
        self.assertEqual(self.client.patch(f'{API}/users/{self.owner.id}/', {'name': 'x'}, format='json').status_code, 403)
        self.assertEqual(self.client.patch(f'{API}/users/{self.manager.id}/', {'role': 'OWNER'}, format='json').status_code, 400)

    def test_manager_can_create_staff_but_password_required(self):
        self.login(self.manager)
        no_pw = self.client.post(f'{API}/users/', {'email': 'w2@x.com', 'name': 'w', 'role': 'WAITER'}, format='json')
        self.assertEqual(no_pw.status_code, 400)
        ok = self.client.post(f'{API}/users/', {'email': 'w2@x.com', 'name': 'w', 'role': 'WAITER', 'password': 'Whatever-123'}, format='json')
        self.assertEqual(ok.status_code, 201)

    def test_only_owner_changes_settings(self):
        self.login(self.manager)
        self.assertEqual(self.client.put(f'{API}/settings/', {'restaurantName': 'X'}, format='json').status_code, 403)
        self.login(self.owner)
        self.assertEqual(self.client.put(f'{API}/settings/', {'restaurantName': 'X'}, format='json').status_code, 200)
