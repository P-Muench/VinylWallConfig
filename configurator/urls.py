from django.urls import path, register_converter, re_path
from django.contrib.staticfiles.urls import staticfiles_urlpatterns


from . import views, converters

register_converter(converters.NegativeIntConverter, 'negint')

app_name = 'configurator'
urlpatterns = staticfiles_urlpatterns()
urlpatterns += [
    path('api/shelf_json/<int:shelf_id>', views.shelf_json, name='shelf_json'),
    # path('shelf/<int:shelf_id>', views.shelf_view, name='shelf'),
    path('api/active_shelf/', views.active_shelf_json, name='active_shelf'),
    # path("react", views.react_view, name="react"),
    # path('album/picker', views.album_picker, name='album_picker'),
    path('api/shelf/add/', views.add_shelfspot, name="add_shelfspot_json"),
    path('api/shelf/remove/', views.remove_shelfspot, name="add_shelfspot_json"),
    path('api/album/library/', views.playable_library, name="album_library"),
    path('api/shelfspot/set/', views.set_playable, name="set_playable"),
    path('api/shelves', views.pick_shelf_json, name="pick_shelf_json"),
    # path('shelfpicker', views.pick_shelf, name="pick_shelf"),
    path('api/devices/', views.devices, name='devices'),
    path('api/devices/activate', views.activate_device, name='activate_device'),

    path('api/shelf/activate/<int:shelf_id>', views.activate_shelf, name='activate_shelf'),
    path('api/shelf/duplicate/<int:shelf_id>', views.duplicate_shelf, name='duplicate_shelf'),

    path('api/shelfspot/remove/<int:shelfspot_id>', views.remove_playable, name="remove_playable"),

    path('api/handle_button/', views.handle_button, name="handle_button"),

    path('test_buttons', views.dummy_buttons, name='test_buttons'),
    path('login', views.login_spotify, name='login'),
    re_path(r'^.*$', views.react_view, name='root'),
]

