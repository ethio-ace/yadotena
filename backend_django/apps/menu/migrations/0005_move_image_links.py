from django.db import migrations


def move_links(apps, schema_editor):
    """Older items stored a pasted https:// link in the file field, which
    produced broken /media/https:/... URLs. Move links into image_url."""
    MenuItem = apps.get_model('menu', 'MenuItem')
    for item in MenuItem.objects.exclude(image='').exclude(image__isnull=True):
        name = item.image.name or ''
        if name.startswith(('http://', 'https://', 'http:/', 'https:/')):
            fixed = name.replace('https:/', 'https://', 1) if name.startswith('https:/') and not name.startswith('https://') else name
            fixed = fixed.replace('http:/', 'http://', 1) if fixed.startswith('http:/') and not fixed.startswith('http://') else fixed
            MenuItem.objects.filter(pk=item.pk).update(image_url=fixed, image='')


class Migration(migrations.Migration):
    dependencies = [('menu', '0004_menu_item_image_url')]
    operations = [migrations.RunPython(move_links, migrations.RunPython.noop)]
