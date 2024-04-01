import datetime
import json

import requests
from django.db import models


# Create your models here.

class Device(models.Model):
    """
    A class representing a device.

    Attributes:
        device_id (str): The unique identifier of the device.
        active (bool): Whether the device is active or not.
        device_name (str): The name of the device.
        device_type (str): The type of the device.
        added_at (DateTimeField): The timestamp when the device was added.

    Methods:
        __str__(): Returns a string representation of the device.
        from_json(json_dict, save=False): Creates a new Device object from a JSON dictionary.
        activate(): Activates the device.
        deactivate(): Deactivates the device.
    """
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
        """
        Converts a JSON dictionary to a Device object.

        :param json_dict: A dictionary containing the device details in JSON format.
        :param save: A boolean value indicating whether to save the device object to the database. Default is False.
        :return: A Device object.

        Example Usage:
            json_dict = {
                'id': '82b1423c36744bfb3ad38ee02408a25929398562',
                'is_active': False,
                'is_private_session': False,
                'is_restricted': False,
                'name': 'MacBook Pro',
                'type': 'Computer',
                'volume_percent': 100
            }
            device = Device.from_json(json_dict, save=True)
        """

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
        """
        Activate the Device.

        :return: None
        """
        self.active = True

    def deactivate(self):
        """
        Deactivates the device.

        :return: None
        """
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
        """
        :param json_dict: The dictionary containing the JSON data.
        :param save: Optional. Whether to save the token object in the database. Defaults to False.
        :return: The token object created from the JSON data.

        Converts a JSON dictionary into a Token object. The JSON dictionary should contain the following keys:
        - "access_token": The access token for the token object.
        - "refresh_token": The refresh token for the token object.
        - "token_type": The type of token ("Bearer" in this case).
        - "scope": The scope of the token.
        - "expires_in": The time in seconds until the token expires.
        - "expires_at": The timestamp when the token expires.

        If the `json_dict` parameter is a string, it will be converted into a dictionary using `json.loads()`.

        If `save` is set to True, the token object will be saved in the database.

        Returns the token object created from the JSON data.
        """
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
    """
    Represents a playable item.

    Attributes:
        name (str): The name of the playable.
        image (bytes): The binary data of the image.
        image_url (str): The URL of the image.
        uri (str): The URI of the playable.
        external_url (str): The external URL of the playable.
        href (str): The href of the playable.
        created_at (datetime): The datetime when the playable was created.
        updated_at (datetime): The datetime when the playable was last updated.
        json_response (str): The JSON response related to the playable.
        in_library (bool): Indicates whether the playable is in the library or not.

    Methods:
        __str__(): Returns a string representation of the playable.

    """
    name = models.CharField(max_length=256)
    image = models.BinaryField()
    image_url = models.CharField(max_length=512)
    uri = models.CharField(max_length=512)
    external_url = models.CharField(max_length=512)
    href = models.CharField(max_length=512)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    json_response = models.CharField(max_length=1024 * 32)
    in_library = models.BooleanField(default=False)

    def __str__(self):
        return str(type(self).name) + " " + str(self.name)

    def to_dict(self):
        return {"name": self.name, "image_url": self.image_url, "in_library": self.in_library}


class Album(Playable):
    """
    Represents an album with its attributes and methods.

    Attributes:
        release_date (str): The release date of the album.
        artist (str): The name of the artist or band.
    """
    release_date = models.CharField(max_length=256)
    artist = models.CharField(max_length=256)

    @staticmethod
    def from_json(json_dict, save=False):
        """
        :param json_dict: A dictionary or a JSON string representing the album information.
        :param save: A boolean indicating whether to save the album to the database. Default is False.
        :return: An Album object created from the provided JSON data.

        This method takes in a dictionary or a JSON string and converts it into an Album object. It extracts the necessary information from the JSON data and creates a new Album object with
        * the extracted information. If the save parameter is set to True, the resulting Album object will be saved to the database.

        Example usage:
            json_dict = {
                "name": "Album Name",
                "images": [
                    {"url": "https://example.com/image1.jpg", "height": 100, "width": 100},
                    {"url": "https://example.com/image2.jpg", "height": 200, "width": 200}
                ],
                "artists": [
                    {"name": "Artist Name"}
                ],
                "uri": "spotify:album:123456789",
                "external_urls": {
                    "spotify": "https://example.com/album/123456789"
                },
                "href": "https://api.spotify.com/album/123456789",
                "release_date": "2020-01-01"
            }
            album = Album.from_json(json_dict, save=True)
            print(album.name)  # Output: "Album Name"
        """
        if isinstance(json_dict, str):
            json_dict = json.loads(json_dict)

        largest_img_url = max(json_dict["images"], key=lambda x: x.get("height", 1) * x.get("width", 1))["url"]

        # resp = requests.get(largest_img_url)
        # if resp.status_code != 200:
        #     raise ConnectionError()  # todo: fixme
        # print("Got image")
        # img = resp.content
        external_url = json_dict["external_urls"]["spotify"]
        artist = json_dict["artists"][0]["name"]
        album = Album(name=json_dict["name"],
                      image=b"",
                      uri=json_dict["uri"],
                      external_url=external_url,
                      href=json_dict["href"],
                      json_response=json.dumps(json_dict),
                      release_date=json_dict["release_date"],
                      artist=artist,
                      image_url=largest_img_url
                )
        if save:
            album.save()
        return album


class Playlist(Playable):
    owner = models.CharField(max_length=256)
    description = models.CharField(max_length=1024)
    public = models.BooleanField()


class Shelf(models.Model):
    """
    A class representing a shelf.

    Attributes:
        name (str): The name of the shelf.
        active (bool): The status of the shelf.
        created_at (datetime): The date and time when the shelf was created.
        updated_at (datetime): The date and time when the shelf was last updated.
    """
    name = models.CharField(max_length=128)
    active = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class ShelfSpot(models.Model):
    """

    The ShelfSpot class represents a spot in a shelf where a playable item can be placed. It is a subclass of the Django `models.Model` class.

    Attributes:
        - `row_index` (IntegerField): The row index of the spot.
        - `col_index` (IntegerField): The column index of the spot.
        - `shelf` (ForeignKey): A foreign key reference to the Shelf model, representing the shelf that this spot belongs to.
        - `playable` (ForeignKey): A foreign key reference to the Playable model, representing the playable item placed in this spot. Can be null (blank) if the spot is empty.
        - `created_at` (DateTimeField): The date and time when the spot was created. Automatically set when the spot is created.
        - `updated_at` (DateTimeField): The date and time when the spot was last updated. Automatically updated whenever the spot is modified.

    Methods:
        - `__str__`: Returns a string representation of the spot in the format "Spot (col_index, row_index) [playable_name]".

    Note: This class assumes the existence of the Shelf and Playable models.

    Example usage:

    ```python
    spot = ShelfSpot.objects.create(row_index=1, col_index=2, shelf=my_shelf, playable=my_playable)
    print(spot)  # Output: Spot (2, 1) [My Playable Item]
    ```

    """
    row_index = models.IntegerField()
    col_index = models.IntegerField()
    shelf = models.ForeignKey(Shelf, on_delete=models.CASCADE, null=False, blank=False)
    playable = models.ForeignKey(Playable, on_delete=models.DO_NOTHING, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Spot ({self.col_index}, {self.row_index}) [{self.playable.name[:20]}]"

    def to_dict(self):
        return {"row": self.row_index, "col": self.col_index, "playable": self.playable.to_dict()}
