from django.db import migrations

# Same defaults as the Go API (migration 000007). Account details are
# placeholders; owners edit them under Payment Methods.
DEFAULT_METHODS = [
    ('pm-cash', 'Cash Payment', 'CASH', 'CASH', '', 'Cashier / Register',
     'Pay cash directly to waiter or cashier upon departure'),
    ('pm-telebirr', 'Telebirr', 'TELEBIRR', 'DIGITAL', '0911234567', 'Yadotena Milk & Foods PLC',
     'Transfer exact amount via Telebirr SuperApp to merchant number'),
    ('pm-cbe', 'Commercial Bank of Ethiopia (CBE)', 'CBE', 'DIGITAL', '1000123456789', 'Yadotena Milk & Foods',
     'Transfer to CBE account and provide transaction ref number'),
    ('pm-boa', 'Bank of Abyssinia (BOA)', 'BOA', 'DIGITAL', '987654321', 'Yadotena Milk & Foods',
     'Transfer to Bank of Abyssinia account number'),
    ('pm-ebirr', 'E-Birr / Mobile Wallet', 'EBIRR', 'DIGITAL', '0911234567', 'Yadotena Milk & Foods PLC',
     'Transfer via E-Birr or M-PESA mobile agent'),
]


def seed(apps, schema_editor):
    PaymentMethod = apps.get_model('payments', 'PaymentMethod')
    Payment = apps.get_model('payments', 'Payment')
    for order, (pk, name, code, kind, number, holder, instructions) in enumerate(DEFAULT_METHODS):
        PaymentMethod.objects.get_or_create(id=pk, defaults=dict(
            name=name, code=code, type=kind, account_number=number,
            account_name=holder, instructions=instructions, sort_order=order,
        ))
    # Link existing payments to the matching method by code.
    for method in PaymentMethod.objects.all():
        Payment.objects.filter(method__iexact=method.code, payment_method__isnull=True).update(payment_method=method)


class Migration(migrations.Migration):
    dependencies = [('payments', '0002_payment_methods')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
