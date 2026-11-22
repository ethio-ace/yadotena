from django.db import migrations


def no_vat(apps, schema_editor):
    # The cafe is not VAT-registered, so it must not charge VAT.
    apps.get_model('core', 'RestaurantSetting').objects.update(vat_percent=0)


class Migration(migrations.Migration):
    dependencies = [('core', '0004_settings_delivery_fee_qr_key_dayclose')]
    operations = [migrations.RunPython(no_vat, migrations.RunPython.noop)]
