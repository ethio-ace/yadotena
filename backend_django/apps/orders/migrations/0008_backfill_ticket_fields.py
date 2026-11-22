from django.db import migrations


def backfill(apps, schema_editor):
    OrderItem = apps.get_model('orders', 'OrderItem')
    # Lines that existed before recipe stock tracking never take stock.
    OrderItem.objects.update(stock_deducted=True)


class Migration(migrations.Migration):
    dependencies = [('orders', '0007_order_controls')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
