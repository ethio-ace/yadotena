from django.contrib import admin
from .models import MenuCategory, MenuItem, MenuItemAddon

class MenuItemAddonInline(admin.TabularInline):
    model = MenuItemAddon
    extra = 1

@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = ['icon', 'name', 'sort_order', 'is_active', 'created_at']
    list_editable = ['sort_order', 'is_active']
    search_fields = ['name', 'description']

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'available', 'preparation_time', 'created_at']
    list_filter = ['category', 'available']
    search_fields = ['name', 'description']
    list_editable = ['price', 'available', 'preparation_time']
    inlines = [MenuItemAddonInline]
