import json

import requests
from django.db import models


# Create your models here.

class Device(models.Model):
    device_id = models.CharField(max_length=64)
    active = models.BooleanField(default=False)
    device_name = models.CharField(max_length=256)
    device_type = models.CharField(max_length=256)
    added_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        suffix = ""
        if self.active:
            suffix = " (Active)"
        return f"Device {self.device_id} [{self.device_name}]" + suffix

    @staticmethod
    def from_json(json_dict, save=False):
        # mac_device = {'id': '82b1423ce67444fb3ad38eea2408a25939398562',
        #               'is_active': False,
        #               'is_private_session': False,
        #               'is_restricted': False,
        #               'name': 'MacBook Pro',
        #               'type': 'Computer',
        #               'volume_percent': 100}
        if isinstance(json_dict, str):
            json_dict = json.loads(json_dict)
        device = Device(device_id=json_dict["id"],
                        device_name=json_dict["name"],
                        device_type=json_dict["type"],
                        active=False)
        if save:
            device.save()
        return device

    def activate(self):
        self.active = True

    def deactivate(self):
        self.active = False


class Token(models.Model):
    access_token = models.CharField(max_length=512)
    refresh_token = models.CharField(max_length=512)
    token_type = models.CharField(max_length=128)
    scope = models.CharField(max_length=128)
    expires_in = models.IntegerField()
    expires_at = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def from_json(json_dict, save=False):
        # {"access_token": "BQCCc0OYlv08LLWhaJhbVN4H_JyOlnYaOjinRnMPYIA5bapM93B-YYDd49o1d6DgtxicKiI6KYiiAb0JVjzVMvspw5_j64SFr8Q2x9mR1e5lp8xD95WhjYtIHT2joocglXCCj7RiYlt74Wi7uwgXDG5pHgsfKNuNvp6fEW2bPyLdJJGc8w",
        # "token_type": "Bearer",
        # "expires_in": 3600,
        # "refresh_token": "AQAmRFWLDJpSlL1derRHiIk2VEmIEf9Rs6rIYV2iXjXkFE83-PU_LhIrkwtpLEyVtr0rGENIGQVu79f3CD5jdTRLOJ8ZBy8j3SQYxbr0azadqdy3dq5dDJJKeRNT6qbqDFc",
        # "scope": "user-modify-playback-state",
        # "expires_at": 1668555681}
        if isinstance(json_dict, str):
            json_dict = json.loads(json_dict)
        token = Token(access_token=json_dict["access_token"],
                      refresh_token=json_dict["refresh_token"],
                      token_type=json_dict["token_type"],
                      scope=json_dict["scope"],
                      expires_in=json_dict["expires_in"],
                      expires_at=json_dict["expires_at"],
                      )
        if save:
            token.save()
        return token


class Playable(models.Model):
    name = models.CharField(max_length=256)
    image = models.BinaryField()
    uri = models.CharField(max_length=512)
    external_url = models.CharField(max_length=512)
    href = models.CharField(max_length=512)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    json_response = models.CharField(max_length=1024*32)

    def __str__(self):
        return str(type(self).name) + " " + str(self.name)


class Album(Playable):
    release_date = models.CharField(max_length=256)
    artist = models.CharField(max_length=256)

    @staticmethod
    def from_json(json_dict, save=False):
        # {'album_group': 'album',
        #                 'album_type': 'album',
        #                 'artists': [{'external_urls': {'spotify': 'https://open.spotify.com/artist/0cbL6CYnRqpAxf1evwUVQD'},
        #                              'href': 'https://api.spotify.com/v1/artists/0cbL6CYnRqpAxf1evwUVQD',
        #                              'id': '0cbL6CYnRqpAxf1evwUVQD',
        #                              'name': 'Die Ärzte',
        #                              'type': 'artist',
        #                              'uri': 'spotify:artist:0cbL6CYnRqpAxf1evwUVQD'}],
        #                 'available_markets': [...],
        #                 'external_urls': {'spotify': 'https://open.spotify.com/album/1NLRh73eGolvxR1lenP5nQ'},
        #                 'href': 'https://api.spotify.com/v1/albums/1NLRh73eGolvxR1lenP5nQ',
        #                 'id': '1NLRh73eGolvxR1lenP5nQ',
        #                 'images': [{'height': 640,
        #                             'url': 'https://i.scdn.co/image/ab67616d0000b273a41156872ab2a0e27bd88cbe',
        #                             'width': 640},
        #                            {'height': 300,
        #                             'url': 'https://i.scdn.co/image/ab67616d00001e02a41156872ab2a0e27bd88cbe',
        #                             'width': 300},
        #                            {'height': 64,
        #                             'url': 'https://i.scdn.co/image/ab67616d00004851a41156872ab2a0e27bd88cbe',
        #                             'width': 64}],
        #                 'name': '13',
        #                 'release_date': '1998-05-25',
        #                 'release_date_precision': 'day',
        #                 'total_tracks': 17,
        #                 'type': 'album',
        #                 'uri': 'spotify:album:1NLRh73eGolvxR1lenP5nQ'}

        if isinstance(json_dict, str):
            json_dict = json.loads(json_dict)
        largest_img_url = max(json_dict["images"], key=lambda x: x["height"] * x["width"])["url"]
        print(f"Loading picture for '{json_dict['name']}' from {largest_img_url}")
        resp = requests.get(largest_img_url)
        if resp.status_code != 200:
            raise ConnectionError()  # todo: fixme
        print("Got image")
        img = resp.content
        external_url = json_dict["external_urls"]["spotify"]
        artist = json_dict["artists"][0]["name"]
        album = Album(name=json_dict["name"],
                      image=img,
                      uri=json_dict["uri"],
                      external_url=external_url,
                      href=json_dict["href"],
                      json_response=json.dumps(json_dict),
                      release_date=json_dict["release_date"],
                      artist=artist,
                      )
        if save:
            album.save()
        return album


class Playlist(Playable):
    owner = models.CharField(max_length=256)
    description = models.CharField(max_length=1024)
    public = models.BooleanField()

class Shelf(models.Model):
    name = models.CharField(max_length=128)
    active = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ShelfSpot(models.Model):
    row_index = models.IntegerField()
    col_index = models.IntegerField()
    shelf = models.ForeignKey(Shelf, on_delete=models.CASCADE, null=False, blank=False)
    playable = models.ForeignKey(Playable, on_delete=models.DO_NOTHING, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Spot ({self.col_index}, {self.row_index}) [{self.playable.name[:20]}]"
