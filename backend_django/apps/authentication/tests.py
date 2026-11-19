"""Django admin user management for the email-based User model."""
from django.test import TestCase

from apps.authentication.models import User


class AdminUserFormsTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(email='admin@test.com', password='Str0ng-pass-123', name='Admin')
        self.client.force_login(self.admin)

    def test_add_user_through_admin(self):
        add_url = '/admin/authentication/user/add/'
        page = self.client.get(add_url)
        self.assertEqual(page.status_code, 200)
        self.assertContains(page, 'name="email"')
        self.assertNotContains(page, 'name="username"')

        res = self.client.post(add_url, {
            'email': 'new.waiter@test.com',
            'name': 'New Waiter',
            'role': 'WAITER',
            'status': 'ACTIVE',
            'password1': 'Kitchen-Door-2026',
            'password2': 'Kitchen-Door-2026',
            # Django 5.1+ admin form field; ignored by older versions.
            'usable_password': 'true',
        })
        self.assertEqual(res.status_code, 302, getattr(res, 'context', None) and res.context['adminform'].form.errors)
        user = User.objects.get(email='new.waiter@test.com')
        self.assertEqual((user.role, user.name), ('WAITER', 'New Waiter'))
        self.assertTrue(user.check_password('Kitchen-Door-2026'))

        # The staff app login works with the new account.
        login = self.client.post('/api/v1/auth/login', {'email': 'new.waiter@test.com', 'password': 'Kitchen-Door-2026'},
                                 content_type='application/json')
        self.assertEqual(login.status_code, 200, login.content)

        # And the edit page renders.
        self.assertEqual(self.client.get(f'/admin/authentication/user/{user.pk}/change/').status_code, 200)

    def test_mismatched_passwords_show_a_real_error(self):
        res = self.client.post('/admin/authentication/user/add/', {
            'email': 'x@test.com', 'name': 'X', 'role': 'WAITER', 'status': 'ACTIVE',
            'password1': 'Kitchen-Door-2026', 'password2': 'different-2026',
        })
        self.assertEqual(res.status_code, 200)
        self.assertIn('password2', res.context['adminform'].form.errors)
        self.assertFalse(User.objects.filter(email='x@test.com').exists())
