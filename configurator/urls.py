from django.urls import path, register_converter

from . import views, converters

register_converter(converters.NegativeIntConverter, 'negint')

app_name = 'configurator'
urlpatterns = [
    # path('', views.DevicesView.as_view(), name='index'),
    # # path('<int:pk>/', views.DetailView.as_view(), name='detail'),
    # # path('<int:pk>/results/', views.ResultsView.as_view(), name='results'),
    # path('activate/', views.activate, name='activate'),
    path('shelf/<int:shelf_id>', views.shelf_view, name='shelf'),
    path('active_shelf/', views.active_shelf_view, name='active_shelf'),
    path('album_cover/<int:playable_id>', views.album_cover, name='album_cover'),

    path('shelf/activate/<int:shelf_id>', views.activate_shelf, name='activate_shelf'),
    path('shelf/duplicate/<int:shelf_id>', views.duplicate_shelf, name='duplicate_shelf'),

    path('shelf/add_right/<int:shelf_id>,<negint:row_col_id>', views.add_shelfspot("right"), name='add_right'),
    path('shelf/add_left/<int:shelf_id>,<negint:row_col_id>', views.add_shelfspot("left"), name='add_left'),
    path('shelf/add_top/<int:shelf_id>,<negint:row_col_id>', views.add_shelfspot("top"), name='add_top'),
    path('shelf/add_bottom/<int:shelf_id>,<negint:row_col_id>', views.add_shelfspot("bottom"), name='add_bottom'),

    path('shelf/remove_right/<int:shelf_id>,<negint:row_col_id>', views.remove_shelfspot("right"), name='remove_right'),
    path('shelf/remove_left/<int:shelf_id>,<negint:row_col_id>', views.remove_shelfspot("left"), name='remove_left'),
    path('shelf/remove_top/<int:shelf_id>,<negint:row_col_id>', views.remove_shelfspot("top"), name='remove_top'),
    path('shelf/remove_bottom/<int:shelf_id>,<negint:row_col_id>', views.remove_shelfspot("bottom"), name='remove_bottom')
]