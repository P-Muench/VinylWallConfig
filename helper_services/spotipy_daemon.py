import datetime
import os
from pprint import pprint

import spotipy
from spotipy import SpotifyOAuth
from flask import Flask, jsonify, Response, redirect, request

from VinylWallConfig.settings import MUSIC_DAEMON_PORT

app = Flask(__name__)

SCOPE = "playlist-read-private playlist-read-collaborative user-read-playback-state"


# playlist-read-private
# playlist-read-collaborative
# user-read-playback-state

def get_auth_manager() -> SpotifyOAuth:
    """
    Return the authentication manager for Spotify.

    :return: SpotifyOAuth authentication manager object.
    :rtype: SpotifyOAuth
    """
    return SpotifyOAuth(scope=SCOPE, open_browser=False)

@app.get("/isLoggedIn")
def is_logged_in() -> Response:
    sp = spotipy.Spotify(auth_manager=get_auth_manager())
    print(sp.me())

@app.get("/auth_url")
def auth_url() -> Response:
    auth_url = get_auth_manager().get_authorize_url()
    return redirect(auth_url, code=302)

@app.get("/devices")
def get_devices():
    """
    Get the list of devices from Spotify.

    :return: A list of dictionaries representing the devices.
    """
    sp = spotipy.Spotify(auth_manager=get_auth_manager())
    return jsonify(sp.devices()["devices"])


@app.get("/search_album/<query>")
def get_album(query):
    """
    Searches for albums using the provided query.

    :param query: The search query.
    :return: A JSON response containing the album search results.
    """
    print(f"Est AUTH: {datetime.datetime.now()}")
    sp = spotipy.Spotify(auth_manager=get_auth_manager())
    print(f"Searching: {datetime.datetime.now()}")
    res = sp.search(q=query, limit=50, type=",".join(["album"]))

    js_result = jsonify(res.get("albums", dict()).get("items", dict()))
    print(f"Outgoing: {datetime.datetime.now()}")
    return js_result

@app.route('/', methods=['GET'])
def get_code():
    code = request.args.get('code', default=None)
    if code:
        get_auth_manager().get_access_token(code=code)
        return {'message': f'Code is: {code}'}, 200
    else:
        return {'message': 'No code provided in the URL'}, 400


@app.get("/search_playlist/<query>")
def get_playlist(query):
    """
    Get playlists based on a search query.

    :param query: The search query.
    :return: A list of playlists matching the search query.
    """
    sp = spotipy.Spotify(auth_manager=get_auth_manager())
    res = sp.search(q=query, limit=10, type=",".join(["playlist"]))

    return jsonify(res.get("playlists", dict()).get("items", dict()))

@app.post("/play")
def play():
    if request.method == "POST":
        js = request.get_json()
        pprint(js)
        print(f"Est AUTH: {datetime.datetime.now()}")
        sp = spotipy.Spotify(auth_manager=get_auth_manager())

        res = sp.start_playback(device_id=js["device"], context_uri=js["playable_uri"])

    return jsonify({"a": "b"})



if __name__ == '__main__':
    app.run(threaded=True,
            port=MUSIC_DAEMON_PORT)
