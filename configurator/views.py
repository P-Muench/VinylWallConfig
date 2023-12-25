import re
from typing import Literal

import requests
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
from django.urls import reverse

from VinylWallConfig.settings import MUSIC_DAEMON_PATH
from configurator.models import Playable, ShelfSpot, Shelf, Album, Playlist, Device


# Create your views here.
def album_cover(request, playable_id):
    playable = get_object_or_404(Playable, pk=playable_id)
    return HttpResponse(playable.image, content_type='image/jpeg')


def shelf_view(request, shelf_id):
    shelf = get_object_or_404(Shelf, pk=shelf_id)
    return render_shelf(request, shelf)


def active_shelf_view(request):
    shelf = get_object_or_404(Shelf, active=1)
    return render_shelf(request, shelf)


def devices(request):
    print(request.POST)
    do_reload = request.POST.get("reload", None)
    if do_reload is not None:
        add_devices_from_demon()
    devices = Device.objects.all()
    # devices_list
    return render(request, 'configurator/devices.html', {
        'devices_list': devices
    })

def activate_device(request):
    device_id = request.POST.get("device_id", -1)

    currently_active_device = get_object_or_404(Device, active=1)
    new_active_device = get_object_or_404(Device, pk=device_id)
    currently_active_device.active = False
    new_active_device.active = True

    currently_active_device.save()
    new_active_device.save()

    return HttpResponseRedirect(reverse("configurator:devices"))

    # return render_shelf(request, shelf=new_active_device)


def activate_shelf(request, shelf_id):
    currently_active_shelf = get_object_or_404(Shelf, active=1)
    new_active_shelf = get_object_or_404(Shelf, pk=shelf_id)
    currently_active_shelf.active = False
    new_active_shelf.active = True

    currently_active_shelf.save()
    new_active_shelf.save()
    return render_shelf(request, shelf=new_active_shelf)


def duplicate_shelf(request, shelf_id):
    shelf = get_object_or_404(Shelf, pk=shelf_id)
    match = re.search(r" ?\((\d+)\)$", shelf.name)
    ctd = 2
    base_name = shelf.name
    if match:
        ctd = int(match.group(1)) + 1
        base_name = shelf.name[:match.span()[0]]
    while True:
        new_name = f"{base_name} ({ctd})"
        try:
            Shelf.objects.get(name=new_name)
        except Shelf.DoesNotExist:
            break
        else:
            ctd += 1
    new_shelf = Shelf(name=new_name, active=False)

    spot_list = shelf.shelfspot_set.all()
    new_shelf.save()
    for shelfspot in spot_list:
        ss_copy = ShelfSpot(row_index=shelfspot.row_index, col_index=shelfspot.col_index,
                            playable_id=shelfspot.playable_id, shelf_id=new_shelf.id
                            )
        ss_copy.save()

    return HttpResponseRedirect(reverse("configurator:shelf", args=(new_shelf.id,)))


def render_shelf(request, shelf):
    spot_list = shelf.shelfspot_set.all()
    return render(request, 'configurator/shelf.html', {
        'spot_matrix': generate_spot_matrix(spot_list),
        'shelf': shelf
    })


def generate_spot_matrix(spot_list):
    if not spot_list:
        return {}
    min_row = min(s.row_index for s in spot_list)
    min_col = min(s.col_index for s in spot_list)
    spot_matrix = {row_idx:
                       {col_idx: None for col_idx in range(min_col, max(s.col_index for s in spot_list) + 1)}
                   for row_idx in range(min_row, max(s.row_index for s in spot_list) + 1)}
    for s in spot_list:
        spot_matrix[s.row_index][s.col_index] = s
    return spot_matrix


def add_shelfspot(direction: Literal["left", "right", "top", "bottom"]):
    valid_dirs = ["left", "right", "top", "bottom"]
    if direction not in valid_dirs:
        raise LookupError(f"Direction {direction} not valid. Only {valid_dirs}")

    def add_spot(request, shelf_id, row_col_id):
        shelf = get_object_or_404(Shelf, pk=shelf_id)

        spot_list = shelf.shelfspot_set.all()

        cols = {spot.col_index for spot in spot_list if spot.row_index == row_col_id}
        rows = {spot.row_index for spot in spot_list if spot.col_index == row_col_id}

        if (direction in ["left", "right"] and len(cols) == 0) or (direction in ["top", "bottom"] and len(rows) == 0):
            return render(
                request,
                reverse("configurator:shelf", args=(shelf_id,)),
                {
                    "shelf": shelf,
                    'spot_matrix': generate_spot_matrix(spot_list),
                    "error_message": f"There is no {('row' if direction in ['left', 'right'] else 'column')} with index {row_col_id}.",
                },
            )
        new_spot = None
        if direction == "right":
            new_spot = ShelfSpot(row_index=row_col_id, col_index=max(cols) + 1, shelf_id=shelf_id, playable_id=1)
        if direction == "left":
            new_spot = ShelfSpot(row_index=row_col_id, col_index=min(cols) - 1, shelf_id=shelf_id, playable_id=1)
        if direction == "top":
            new_spot = ShelfSpot(row_index=min(rows) - 1, col_index=row_col_id, shelf_id=shelf_id, playable_id=1)
        if direction == "bottom":
            new_spot = ShelfSpot(row_index=max(rows) + 1, col_index=row_col_id, shelf_id=shelf_id, playable_id=1)
        new_spot.save()
        # Always return an HttpResponseRedirect after successfully dealing
        # with POST data. This prevents data from being posted twice if a
        # user hits the Back button.
        return HttpResponseRedirect(reverse("configurator:shelf", args=(shelf_id,)))

    return add_spot


def remove_shelfspot(direction: Literal["left", "right", "top", "bottom"]):
    valid_dirs = ["left", "right", "top", "bottom"]
    if direction not in valid_dirs:
        raise LookupError(f"Direction {direction} not valid. Only {valid_dirs}")

    def remove_spot(request, shelf_id, row_col_id):
        shelf = get_object_or_404(Shelf, pk=shelf_id)

        spot_list = shelf.shelfspot_set.all()

        cols = {spot.col_index for spot in spot_list if spot.row_index == row_col_id}
        rows = {spot.row_index for spot in spot_list if spot.col_index == row_col_id}

        if (direction in ["left", "right"] and len(cols) == 0) or (direction in ["top", "bottom"] and len(rows) == 0):
            return render(
                request,
                reverse("configurator:shelf", args=(shelf_id,)),
                {
                    "shelf": shelf,
                    'spot_matrix': generate_spot_matrix(spot_list),
                    "error_message": f"There is no {('row' if direction in ['left', 'right'] else 'column')} with index {row_col_id}.",
                },
            )

        new_spot = None
        if direction == "right":
            new_spot = get_object_or_404(ShelfSpot, shelf_id=shelf_id, row_index=row_col_id, col_index=max(cols))
        if direction == "left":
            new_spot = get_object_or_404(ShelfSpot, shelf_id=shelf_id, row_index=row_col_id, col_index=min(cols))
        if direction == "top":
            new_spot = get_object_or_404(ShelfSpot, shelf_id=shelf_id, row_index=min(rows), col_index=row_col_id)
        if direction == "bottom":
            new_spot = get_object_or_404(ShelfSpot, shelf_id=shelf_id, row_index=max(rows), col_index=row_col_id)
        new_spot.delete()
        # Always return an HttpResponseRedirect after successfully dealing
        # with POST data. This prevents data from being posted twice if a
        # user hits the Back button.
        return HttpResponseRedirect(reverse("configurator:shelf", args=(shelf_id,)))

    return remove_spot


def set_playable(request, shelfspot_id):
    playable_id = request.POST["playable_id"]
    shelfspot = get_object_or_404(ShelfSpot, pk=shelfspot_id)
    playable = get_object_or_404(Playable, pk=playable_id)

    shelfspot.playable_id = playable.id
    playable.in_library = True
    shelfspot.save()
    playable.save()
    return HttpResponseRedirect(reverse("configurator:shelf", args=(shelfspot.shelf_id,)))


def remove_playable(request, shelfspot_id):
    shelfspot = get_object_or_404(ShelfSpot, pk=shelfspot_id)
    shelfspot.playable_id = 1
    shelfspot.save()
    return HttpResponseRedirect(reverse("configurator:shelf", args=(shelfspot.shelf_id,)))


def add_albums_from_daemon(search_txt):
    answer = requests.get(MUSIC_DAEMON_PATH + "/search_album/" + search_txt)
    albums = answer.json()
    for album in albums:
        album_uri = album["uri"]  # spotify:album:1NLRh73eGolvxR1lenP5nQ
        query = Playable.objects.filter(uri=album_uri)
        if query.count() == 0:
            Album.from_json(album, save=True)


def add_devices_from_demon():
    answer = requests.get(MUSIC_DAEMON_PATH + "/devices")
    devices = answer.json()
    for device in devices:
        device_id = device["id"]
        query = Device.objects.filter(device_id=device_id)
        if query.count() == 0:
            Device.from_json(device, save=True)


def playable_selection(request, shelfspot_id):
    search_txt = request.POST.get("search_txt", "")
    if search_txt == "":
        relevant_playables = set(Playable.objects.all())
    else:
        add_albums_from_daemon(search_txt)
        relevant_playables = Playable.objects.filter(name__icontains=search_txt)
        relevant_playables = (set(relevant_playables)
                              .union(set(Album.objects.filter(artist__icontains=search_txt)))
                              .union(set(Playlist.objects.filter(owner__icontains=search_txt)))
                              .union(set(Playlist.objects.filter(description__icontains=search_txt))))

    playables_in_lib = {p for p in relevant_playables if p.id != 1 and p.in_library}
    playables_not_in_lib = {p for p in relevant_playables if p.id != 1 and not p.in_library}
    return render(request, 'configurator/shelfspot_select.html', {
        'shelfspot': get_object_or_404(ShelfSpot, pk=shelfspot_id),
        'search_txt': search_txt,
        "playables_in_lib": sorted(playables_in_lib, key=lambda x: x.created_at),
        "playables_not_in_lib": sorted(playables_not_in_lib, key=lambda x: x.created_at),
    })
