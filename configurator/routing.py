from django.urls import re_path, path

from . import consumers

websocket_urlpatterns = [
    path(r"ws/configure/<int:shelf_id>/", consumers.ConfigureConsumer.as_asgi()),
]