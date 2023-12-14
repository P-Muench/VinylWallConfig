from django.urls import path

from . import views

app_name = 'configurator'
urlpatterns = [
    # path('', views.DevicesView.as_view(), name='index'),
    # # path('<int:pk>/', views.DetailView.as_view(), name='detail'),
    # # path('<int:pk>/results/', views.ResultsView.as_view(), name='results'),
    # path('activate/', views.activate, name='activate'),
    path('shelf/<int:shelf_id>', views.shelf_view, name='shelf'),
    path('active_shelf/', views.active_shelf_view, name='active_shelf'),
    path('album_cover/<int:playable_id>', views.album_cover, name='album_cover'),
]