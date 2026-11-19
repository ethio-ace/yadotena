import io

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings

from apps.core.tests import API, BaseAPITest
from apps.menu.models import MenuCategory, MenuItem, MenuItemAddon
from apps.orders.models import Order


def png_upload(name='a.png', color=(200, 10, 10)):
    buf = io.BytesIO()
    Image.new('RGB', (4, 4), color).save(buf, format='PNG')
    return SimpleUploadedFile(name, buf.getvalue(), content_type='image/png')


class AddonScopeTests(BaseAPITest):
    def setUp(self):
        super().setUp()
        self.food = MenuCategory.objects.create(name='Food')
        self.burger = MenuItem.objects.create(name='Burger', price='200.00', category=self.food)
        self.glob = MenuItemAddon.objects.create(name='Napkin pack', price='5', is_global=True)
        self.cat = MenuItemAddon.objects.create(name='Extra milk', price='10', category=self.category)
        self.item_addon = MenuItemAddon.objects.create(name='Honey', price='15', menu_item=self.item)
        self.other = MenuItemAddon.objects.create(name='Cheese', price='20', menu_item=self.burger)
        self.off = MenuItemAddon.objects.create(name='Old', price='1', is_global=True, is_active=False)

    def test_menu_item_addons_resolves_all_scopes(self):
        res = self.client.get(f'{API}/menu/{self.item.id}/addons')
        self.assertEqual(res.status_code, 200)
        names = {a['name']: a['scope'] for a in res.json()}
        self.assertEqual(names, {'Napkin pack': 'GLOBAL', 'Extra milk': 'CATEGORY', 'Honey': 'ITEM'})

    def test_list_filters_and_public_hides_inactive(self):
        public = {a['name'] for a in self.client.get(f'{API}/addons').json()}
        self.assertNotIn('Old', public)
        self.assertEqual([a['name'] for a in self.client.get(f'{API}/addons?scope=CATEGORY').json()], ['Extra milk'])
        self.assertEqual([a['name'] for a in self.client.get(f'{API}/addons', {'menu_item_id': self.burger.id}).json()], ['Cheese'])
        self.login(self.manager)
        self.assertIn('Old', {a['name'] for a in self.client.get(f'{API}/addons').json()})

    def test_order_accepts_applicable_addons_only(self):
        res = self.place_order(items=[{'menuItemId': self.item.id, 'quantity': 1,
                                       'selectedAddons': [self.glob.id, self.cat.id, self.item_addon.id, self.other.id, self.off.id]}])
        self.assertEqual(res.status_code, 201, res.json())
        picked = {a['name'] for a in Order.objects.get(id=res.json()['id']).items.first().selected_addons}
        self.assertEqual(picked, {'Napkin pack', 'Extra milk', 'Honey'})
        self.assertEqual(float(res.json()['items'][0]['price']), 50 + 5 + 10 + 15)

    def test_manager_creates_scoped_addons_json_and_multipart(self):
        self.login(self.manager)
        res = self.client.post(f'{API}/addons', {'name': 'Syrup', 'price': 12, 'scope': 'category', 'categoryId': self.category.id}, format='json')
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()['scope'], 'CATEGORY')
        self.assertEqual(res.json()['categoryName'], 'Drinks')

        with override_settings(MEDIA_ROOT=self._tmp_media()):
            res = self.client.post(f'{API}/addons', {'name': 'Foam', 'price': '7', 'scope': 'ITEM',
                                                     'menuItemId': self.item.id, 'isActive': 'true',
                                                     'image': png_upload()}, format='multipart')
        self.assertEqual(res.status_code, 201, res.json())
        self.assertEqual(res.json()['menuItemName'], 'Milk')
        self.assertTrue(res.json()['imageUrl'].startswith('http://testserver/media/addons/'))

    def test_scope_validation(self):
        self.login(self.manager)
        self.assertEqual(self.client.post(f'{API}/addons', {'name': 'X', 'price': 1, 'scope': 'CATEGORY'}, format='json').status_code, 400)
        self.assertEqual(self.client.post(f'{API}/addons', {'name': 'X', 'price': 1}, format='json').status_code, 400)
        res = self.client.patch(f'{API}/addons/{self.item_addon.id}', {'scope': 'GLOBAL'}, format='json')
        self.assertEqual(res.json()['scope'], 'GLOBAL')
        self.assertIsNone(res.json()['menuItemId'])

    def test_rejects_non_image_upload(self):
        self.login(self.manager)
        bad = SimpleUploadedFile('x.png', b'not an image', content_type='image/png')
        res = self.client.post(f'{API}/addons', {'name': 'X', 'price': '1', 'scope': 'GLOBAL', 'image': bad}, format='multipart')
        self.assertEqual(res.status_code, 400)

    def test_waiter_cannot_manage_addons(self):
        self.login(self.waiter)
        self.assertEqual(self.client.post(f'{API}/addons', {'name': 'X', 'price': 1, 'scope': 'GLOBAL'}, format='json').status_code, 403)

    def test_menu_item_edit_keeps_addons(self):
        self.login(self.manager)
        res = self.client.patch(f'{API}/menu/{self.item.id}', {'name': 'Fresh milk', 'customAddons': '[]'}, format='json')
        self.assertEqual(res.status_code, 200, res.json())
        self.assertTrue(MenuItemAddon.objects.filter(id=self.item_addon.id).exists())

    def _tmp_media(self):
        import tempfile
        path = tempfile.mkdtemp()
        self.addCleanup(__import__('shutil').rmtree, path, True)
        return path


class MenuExtrasTests(BaseAPITest):
    def test_popular_ranks_by_quantity_and_skips_cancelled(self):
        cake = MenuItem.objects.create(name='Cake', price='80.00', category=self.category)
        self.place_order(items=[{'menuItemId': cake.id, 'quantity': 3}])
        self.place_order(items=[{'menuItemId': self.item.id, 'quantity': 1}])
        cancelled = self.place_order(items=[{'menuItemId': self.item.id, 'quantity': 9}]).json()['id']
        Order.objects.filter(id=cancelled).update(status='CANCELLED')
        res = self.client.get(f'{API}/menu/popular?limit=5')
        self.assertEqual(res.status_code, 200)
        self.assertEqual([(r['name'], r['orderCount']) for r in res.json()], [('Cake', 3), ('Milk', 1)])

    def test_item_shape_and_image_url(self):
        self.login(self.manager)
        res = self.client.post(f'{API}/menu', {'name': 'Tea', 'price': '30', 'categoryId': self.category.id,
                                               'image': 'https://cdn.example.com/tea.webp',
                                               'available': 'true', 'dietaryTags': '["Vegan"]'}, format='multipart')
        self.assertEqual(res.status_code, 201, res.json())
        body = res.json()
        self.assertEqual(body['categoryId'], self.category.id)
        self.assertEqual(body['category'], 'Drinks')
        self.assertEqual(body['image'], 'https://cdn.example.com/tea.webp')
        self.assertEqual(body['dietaryTags'], ['Vegan'])
        self.assertIsInstance(body['price'], (int, float))

    def test_unknown_category_is_400(self):
        self.login(self.manager)
        res = self.client.post(f'{API}/menu', {'name': 'Tea', 'price': '30', 'category': 'Nope'}, format='json')
        self.assertEqual(res.status_code, 400)
