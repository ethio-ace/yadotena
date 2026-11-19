import logging
import uuid
from django.db import models

logger = logging.getLogger(__name__)

def generate_category_id():
    return f"cat-{uuid.uuid4().hex[:8]}"

def generate_menu_item_id():
    return f"m-{uuid.uuid4().hex[:8]}"

def generate_addon_id():
    return f"add-{uuid.uuid4().hex[:8]}"

class MenuCategory(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_category_id)
    name = models.CharField(max_length=100, unique=True)
    icon = models.CharField(max_length=10, default="🍽️")
    description = models.TextField(blank=True, default="")
    sort_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Menu Category'
        verbose_name_plural = 'Menu Categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name}"

class MenuItem(models.Model):
    id = models.CharField(max_length=50, primary_key=True, default=generate_menu_item_id)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(
        MenuCategory,
        on_delete=models.CASCADE,
        related_name='items'
    )
    image = models.ImageField(upload_to='menu_images/', blank=True, null=True)
    # A pasted https:// image link (used when no file is uploaded).
    image_url = models.CharField(max_length=500, blank=True, default='')
    available = models.BooleanField(default=True)
    preparation_time = models.PositiveIntegerField(default=15, help_text="Preparation time in minutes")
    dietary_tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Menu Item'
        verbose_name_plural = 'Menu Items'
        ordering = ['category__sort_order', 'name']

    def __str__(self):
        return f"{self.name} ({self.price} ETB)"

    def save(self, *args, **kwargs):
        # Only optimise a file that was just uploaded (not yet committed to
        # storage); re-saving an item must not re-open or re-encode its image.
        if self.image and getattr(self.image, '_committed', True) is False:
            from PIL import Image
            from io import BytesIO
            from django.core.files.uploadedfile import InMemoryUploadedFile
            import sys
            import os

            try:
                # Open the image using Pillow
                img = Image.open(self.image)
                
                # Check if we need to process it (e.g., if it's newly uploaded and not already webp)
                if not self.image.name.endswith('.webp'):
                    # Resize if larger than 800x800 while maintaining aspect ratio
                    if img.width > 800 or img.height > 800:
                        img.thumbnail((800, 800), Image.Resampling.LANCZOS)
                    
                    # Convert to RGB if necessary (e.g. RGBA pngs)
                    if img.mode != 'RGB' and img.mode != 'RGBA':
                        img = img.convert('RGB')
                        
                    output = BytesIO()
                    img.save(output, format='WEBP', quality=85, optimize=True)
                    output.seek(0)
                    
                    # Construct new filename
                    filename = os.path.splitext(self.image.name)[0] + '.webp'
                    
                    # Replace the image field with the new webp version
                    self.image = InMemoryUploadedFile(
                        output,
                        'ImageField',
                        filename,
                        'image/webp',
                        sys.getsizeof(output),
                        None
                    )
            except Exception:
                logger.exception('Could not optimise image for menu item %s', self.pk)
                
        super().save(*args, **kwargs)


class AddonScope(models.TextChoices):
    GLOBAL = 'GLOBAL', 'All menu items'
    CATEGORY = 'CATEGORY', 'One category'
    ITEM = 'ITEM', 'One menu item'


class MenuItemAddon(models.Model):
    """An extra a customer can add to a dish.

    Scope: global (every item), a category (every item in it) or one item.
    """
    id = models.CharField(max_length=50, primary_key=True, default=generate_addon_id)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='custom_addons', null=True, blank=True)
    category = models.ForeignKey(MenuCategory, on_delete=models.CASCADE, related_name='addons', null=True, blank=True)
    is_global = models.BooleanField(default=False, db_index=True)
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default='')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Addon price in ETB")
    image_url = models.CharField(max_length=500, blank=True, default='')
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, null=True)

    class Meta:
        verbose_name = 'Menu Item Addon'
        verbose_name_plural = 'Menu Item Addons'
        ordering = ['-is_global', 'sort_order', 'name']

    @property
    def scope(self):
        if self.is_global:
            return AddonScope.GLOBAL
        if self.category_id:
            return AddonScope.CATEGORY
        return AddonScope.ITEM

    def __str__(self):
        return f"{self.name} (+{self.price} ETB)"

    @classmethod
    def applicable_to(cls, menu_item):
        """Active addons a customer may pick for ``menu_item``."""
        return cls.objects.filter(is_active=True).filter(
            models.Q(is_global=True)
            | models.Q(menu_item=menu_item)
            | models.Q(category_id=menu_item.category_id, menu_item__isnull=True, is_global=False)
        )
