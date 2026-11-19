from django.db import migrations

# Item status mirrors the parent order for existing rows (Go migration 000016).
# A COMPLETED order's lines were all handed over, so they count as SERVED.
ORDER_TO_ITEM = {
    'PENDING': 'PENDING',
    'PREPARING': 'PREPARING',
    'READY': 'READY',
    'SERVED': 'SERVED',
    'COMPLETED': 'SERVED',
    'CANCELLED': 'CANCELLED',
}


def backfill(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    OrderItem = apps.get_model('orders', 'OrderItem')
    for order_status, item_status in ORDER_TO_ITEM.items():
        order_ids = Order.objects.filter(status=order_status).values_list('id', flat=True)
        qs = OrderItem.objects.filter(order_id__in=list(order_ids))
        if item_status != 'PENDING':
            for item in qs.select_related('order'):
                item.status = item_status
                item.started_at = item.order.created_at
                if item_status in ('READY', 'SERVED'):
                    item.completed_at = item.order.updated_at
                item.save(update_fields=['status', 'started_at', 'completed_at'])


class Migration(migrations.Migration):
    dependencies = [('orders', '0004_kitchen_item_status')]
    operations = [migrations.RunPython(backfill, migrations.RunPython.noop)]
