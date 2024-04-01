from django.contrib import admin

from configurator.models import Shelf, ShelfSpot


# Register your models here.
@admin.register(Shelf)
class ShelfAdmin(admin.ModelAdmin):
    pass


@admin.register(ShelfSpot)
class ShelfSpotAdmin(admin.ModelAdmin):
    pass