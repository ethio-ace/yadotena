from django.db import migrations

# Only values still holding the original sample text are renamed; anything
# the owner typed in themselves (and the guest Wi-Fi name/password, which
# must match the real router) is left alone.
RENAMES = {
    'Yadotena Milk & Foods': 'Hilif Milk & Foods',
    'Yadotena Milk & Foods PLC': 'Hilif Milk & Foods PLC',
}
DISH_RENAMES = {
    'Signature Yadotena Cream Milkshake': 'Signature Hilif Cream Milkshake',
}


def forwards(apps, schema_editor):
    _apply(apps, RENAMES, DISH_RENAMES)


def backwards(apps, schema_editor):
    _apply(apps, {v: k for k, v in RENAMES.items()}, {v: k for k, v in DISH_RENAMES.items()})


def _apply(apps, names, dishes):
    Setting = apps.get_model('core', 'RestaurantSetting')
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    MenuItem = apps.get_model('menu', 'MenuItem')
    for old, new in names.items():
        Setting.objects.filter(restaurant_name=old).update(restaurant_name=new)
        PaymentMethod.objects.filter(account_name=old).update(account_name=new)
    for old, new in dishes.items():
        MenuItem.objects.filter(name=old).update(name=new)


class Migration(migrations.Migration):
    dependencies = [
        ('core', '0006_rename_to_hilif'),
        ('payments', '0003_seed_payment_methods'),
        ('menu', '0001_initial'),
    ]
    operations = [migrations.RunPython(forwards, backwards)]
