from django.urls import path, register_converter

from . import views, converters

register_converter(converters.NegativeIntConverter, 'negint')

app_name = 'configurator'
urlpatterns = [
    path('shelf_json/<int:shelf_id>', views.shelf_json, name='shelf_json'),
    path('shelf/<int:shelf_id>', views.shelf_view, name='shelf'),
    path('active_shelf/', views.active_shelf_view, name='active_shelf'),
    path('', views.active_shelf_view, name='root'),
    path('album/picker', views.album_picker, name='album_picker'),
    path('shelf/add/', views.add_shelfspot, name="add_shelfspot_json"),
    path('shelf/remove/', views.remove_shelfspot, name="add_shelfspot_json"),
    path('album/library/', views.playable_library, name="album_library"),
    path('shelfspot/set/', views.set_playable, name="set_playable"),
    path('shelfpicker', views.pick_shelf, name="pick_shelf"),
    path('devices/', views.devices, name='devices'),
    path('devices/activate', views.activate_device, name='activate_device'),

    path('shelf/activate/<int:shelf_id>', views.activate_shelf, name='activate_shelf'),
    path('shelf/duplicate/<int:shelf_id>', views.duplicate_shelf, name='duplicate_shelf'),

    path('shelfspot/remove/<int:shelfspot_id>', views.remove_playable, name="remove_playable"),

    path('handle_button/', views.handle_button, name="handle_button"),

    path('test_buttons', views.dummy_buttons, name='test_buttons'),

]