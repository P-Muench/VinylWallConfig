import json
import time
from pprint import pprint

from channels.generic.websocket import WebsocketConsumer
from configurator.models import VWCSetting, ShelfSpot


class ConfigureConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()

    def disconnect(self, close_code):
        VWCSetting.reset_listening_shelfspot()

    def receive(self, text_data):
        pprint(text_data)
        text_data_json = json.loads(text_data)
        shelfspot_id = text_data_json["shelfspot_id"]
        shelfspot: ShelfSpot = ShelfSpot.objects.filter(id=shelfspot_id).first()
        VWCSetting.set_listening_shelfspot(shelfspot_id)
        DURATION = 10
        for i in range(DURATION + 1):
            if VWCSetting.get_listening_shelfspot() == shelfspot_id:
                message = f"Press Button to connect. You have<br><h1 style='text-align: center;'>{DURATION-i}</h1><br>seconds"

                self.send(text_data=json.dumps({"message": message,
                                                "states": {
                                                    shelfspot_id: 0
                                                },
                                                "last_message": False,
                                                "source_shelfspot_id": shelfspot_id}))
            else:
                message = "Success"
                self.send(text_data=json.dumps({"message": message,
                                                "states": {
                                                    neighbouring_shelfspot.id: 1 - (neighbouring_shelfspot.associated_key is None) * 2
                                                    for neighbouring_shelfspot in shelfspot.shelf.shelfspot_set.all()
                                                },
                                                "last_message": True,
                                                "source_shelfspot_id": shelfspot_id}))
                break
            time.sleep(1)
        else:
            self.send(text_data=json.dumps({"message": "Did not receive any button input",
                                            "states": {
                                                    neighbouring_shelfspot.id: 1 - (neighbouring_shelfspot.associated_key is None) * 2
                                                    for neighbouring_shelfspot in shelfspot.shelf.shelfspot_set.all()
                                                },
                                            "last_message": True,
                                            "source_shelfspot_id": shelfspot_id}))
        VWCSetting.reset_listening_shelfspot()
