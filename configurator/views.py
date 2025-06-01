import json
import math
import re
from pprint import pprint
from typing import Iterable

import requests
from django.contrib import messages
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.shortcuts import render, get_object_or_404, redirect
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt

from VinylWallConfig.settings import MUSIC_DAEMON_PATH
from configurator.models import Playable, ShelfSpot, Shelf, Album, Playlist, Device, VWCSetting


def album_cover(request, playable_id):
    playable = get_object_or_404(Playable, pk=playable_id)
    return HttpResponse(playable.image, content_type='image/jpeg')


def shelf_view(request, shelf_id):
    shelf = get_object_or_404(Shelf, pk=shelf_id)
    return render_shelf(request, shelf)


def active_shelf_view(request):
    if (login_resp := login_if_necessary(request)) is not None:
        return login_resp
    else:
        shelf = get_object_or_404(Shelf, active=1)
        return render_shelf(request, shelf)


def react_view(request):
    if (login_resp := login_if_necessary(request)) is not None:
        return login_resp
    else:
        shelf = get_object_or_404(Shelf, active=1)
        return render(request, 'configurator/index.html', {})


def shelf_json(request, shelf_id):
    shelf = get_object_or_404(Shelf, pk=shelf_id)
    return render_shelf_json(request, shelf)


def active_shelf_json(request):
    shelf = get_object_or_404(Shelf, active=1)
    return render_shelf_json(request, shelf)


def album_picker(request):
    return render(request, 'configurator/album_picker.html', {

    })


def devices(request):
    add_devices_from_demon()
    devices: Iterable[Device] = Device.objects.all()
    return JsonResponse([d.to_dict() for d in devices], safe=False)
    # devices_list
    # return render(request, 'configurator/devices.html', {
    #     'devices_list': devices
    # })


def activate_device(request):
    device_id = request.POST.get("device_id", -1)

    currently_active_devices = []
    new_active_device = get_object_or_404(Device, device_id=device_id)
    try:
        # Deactivate all active devices in a single query
        currently_active_devices = Device.objects.filter(active=True)
        currently_active_devices.update(active=False)
    except Device.DoesNotExist:
        pass
    new_active_device.active = True

    for currently_active_device in currently_active_devices:
        currently_active_device.save()
    new_active_device.save()

    devices: Iterable[Device] = Device.objects.all()
    return JsonResponse([d.to_dict() for d in devices])
    # return HttpResponseRedirect(reverse("configurator:devices"))


def activate_shelf(request, shelf_id):
    currently_active_shelf = get_object_or_404(Shelf, active=1)
    new_active_shelf = get_object_or_404(Shelf, pk=shelf_id)
    currently_active_shelf.active = False
    new_active_shelf.active = True

    currently_active_shelf.save()
    new_active_shelf.save()
    return JsonResponse({"active_shelf": new_active_shelf.id})
    # return render_shelf(request, shelf=new_active_shelf)


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

    return JsonResponse({"id": new_shelf.id})
    # return HttpResponseRedirect(reverse("configurator:shelf", args=(new_shelf.id,)))


def render_shelf(request, shelf):
    return render(request, 'configurator/shelf.html', {
        'shelf': shelf
    })


def render_shelf_json(request, shelf):
    spot_list = shelf.shelfspot_set.all()
    return JsonResponse(shelf.to_dict())

def add_shelfspot(request):
    try:
        row_id = request.POST["row_id"]
        shelf_id = request.POST["shelf_id"]
        col_id = request.POST["col_id"]
    except KeyError as e:
        if request.content_type == "application/json":
            json_body = json.loads(request.body.decode("utf-8"))
            row_id = json_body["row_id"]
            shelf_id = json_body["shelf_id"]
            col_id = json_body["col_id"]

    num_shelves = ShelfSpot.objects.filter(shelf_id=shelf_id, row_index=row_id, col_index=col_id).count()
    if num_shelves > 0:
        raise Exception("Shelf exists already")
    new_spot = ShelfSpot(row_index=row_id, col_index=col_id, shelf_id=shelf_id, playable_id=1)
    new_spot.save()
    return JsonResponse(new_spot.shelf.to_dict())
    # return HttpResponseRedirect(reverse("configurator:shelf_json", args=(shelf_id,)))


def remove_shelfspot(request):
    try:
        row_id = request.POST["row_id"]
        shelf_id = request.POST["shelf_id"]
        col_id = request.POST["col_id"]
    except KeyError as e:
        if request.content_type == "application/json":
            json_body = json.loads(request.body.decode("utf-8"))
            row_id = json_body["row_id"]
            shelf_id = json_body["shelf_id"]
            col_id = json_body["col_id"]

    num_shelves = ShelfSpot.objects.filter(shelf_id=shelf_id, row_index=row_id, col_index=col_id).count()
    if num_shelves == 0:
        raise Exception("Shelf does not exist")
    shelfspot = get_object_or_404(ShelfSpot, shelf_id=shelf_id, row_index=row_id, col_index=col_id)
    shelf = shelfspot.shelf
    shelfspot.delete()
    return JsonResponse(shelf.to_dict())
    # return HttpResponseRedirect(reverse("configurator:shelf_json", args=(shelf_id,)))


def set_playable(request):
    try:
        playable_id = request.POST["playable_id"]
        shelfspot_id = request.POST["shelfspot_id"]
    except KeyError as e:
        if request.content_type == "application/json":
            json_body = json.loads(request.body.decode("utf-8"))
            playable_id = json_body["playable_id"]
            shelfspot_id = json_body["shelfspot_id"]

    shelfspot = get_object_or_404(ShelfSpot, pk=shelfspot_id)
    playable = get_object_or_404(Playable, pk=playable_id)

    shelfspot.playable_id = playable.id

    playable.in_library = True
    shelfspot.save()
    playable.save()
    return JsonResponse(shelfspot.shelf.to_dict())
    # return HttpResponseRedirect(reverse("configurator:shelf_json", args=(shelfspot.shelf_id,)))


def remove_playable(request, shelfspot_id):
    shelfspot = get_object_or_404(ShelfSpot, pk=shelfspot_id)
    shelfspot.playable_id = 1
    shelfspot.save()
    return JsonResponse(shelfspot.shelf.to_dict())
    # return HttpResponseRedirect(reverse("configurator:shelf", args=(shelfspot.shelf_id,)))


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


def playable_library(request):
    PAGE_LIMIT = 20
    search_txt = request.GET.get("search_txt", "")
    page_txt = request.GET.get("page", "1")
    try:
        page = int(page_txt)
        if page < 0:
            raise ValueError
    except:
        page = 1

    if search_txt == "":
        library_playables = set(Playable.objects.filter(in_library=True))
        sorted_playables = sorted([p for p in library_playables if p.id != 1], key=lambda x: x.created_at)

    else:
        add_albums_from_daemon(search_txt)
        relevant_playables = Playable.objects.filter(name__icontains=search_txt)
        relevant_playables = (set(relevant_playables)
                              .union(set(Album.objects.filter(artist__icontains=search_txt)))
                              .union(set(Playlist.objects.filter(owner__icontains=search_txt)))
                              .union(set(Playlist.objects.filter(description__icontains=search_txt))))

        sorted_playables = sorted([p for p in relevant_playables if p.id != 1],
                                  key=lambda x: (1 - x.in_library, x.created_at))
        # playables_in_lib = {p for p in relevant_playables if p.id != 1 and p.in_library}
        # playables_not_in_lib = {p for p in relevant_playables if p.id != 1 and not p.in_library}
    page_playables: list[Playable] = sorted_playables[0:page * PAGE_LIMIT]
    return JsonResponse({'page': page,
                         'max_page': math.ceil(len(sorted_playables) / PAGE_LIMIT),
                         'album_list': [p.to_dict() for p in page_playables]})


def dummy_buttons(request):
    return render(request, 'configurator/dummy_buttons.html')


def pick_shelf(request):
    PAGE_LIMIT = 4
    page_txt = request.GET.get("page", "1")
    try:
        page = int(page_txt)
        if page < 0:
            raise ValueError
    except:
        page = 1

    sorted_shelves = sorted(Shelf.objects.all(), key=lambda x: (x.active, x.updated_at), reverse=True)

    paginator = Paginator(sorted_shelves, PAGE_LIMIT)

    return render(request, 'configurator/shelfPicker.html', {
        'page_obj': paginator.page(page),
    })


def pick_shelf_json(request):
    PAGE_LIMIT = 2
    page_txt = request.GET.get("page", "1")
    try:
        page = int(page_txt)
        if page < 0:
            raise ValueError
    except:
        page = 1

    sorted_shelves = sorted(Shelf.objects.all(), key=lambda x: (x.active, x.updated_at), reverse=True)

    paginator = Paginator(sorted_shelves, PAGE_LIMIT)

    try:
        current_page = paginator.page(page)
    except PageNotAnInteger:
        current_page = paginator.page(1)
    except EmptyPage:
        current_page = paginator.page(paginator.num_pages)

    # Serialize the objects for the current page
    serialized_data = [shelf.to_dict() for shelf in current_page.object_list]

    return JsonResponse({"data": serialized_data,
                         "previous_page": current_page.has_previous() and current_page.previous_page_number() or None,
                         'next_page': current_page.has_next() and current_page.next_page_number() or None,
                         "total_pages": paginator.num_pages,
                         }, safe=False)
    # return render(request, 'configurator/shelfPicker.html', {
    #     'page_obj': paginator.page(page),
    # })


@csrf_exempt
def handle_button(request):
    pprint(request.POST)
    pprint(request.body)
    sent_key = None
    try:
        sent_key = request.POST["key"]
    except KeyError as e:
        if request.content_type == "application/json":
            json_body = json.loads(request.body.decode("utf-8"))
            pprint(json_body)
            sent_key = int(json_body["key"])
    if sent_key is not None:
        if VWCSetting.get_listening_shelfspot() is None:
            return play_from_key(sent_key)
        else:
            return assign_from_key(sent_key)


def assign_from_key(sent_key: int):
    selected_shelfspot = get_object_or_404(ShelfSpot, pk=VWCSetting.get_listening_shelfspot())
    former_shelfspots_for_key = selected_shelfspot.shelf.shelfspot_set.filter(associated_key=sent_key)
    for shelfspot in former_shelfspots_for_key:
        shelfspot.associated_key = None
    selected_shelfspot.associated_key = sent_key

    for shelfspot in former_shelfspots_for_key:
        shelfspot.save()
    selected_shelfspot.save()

    VWCSetting.reset_listening_shelfspot()
    return JsonResponse({'selected_playable': selected_shelfspot.playable.to_dict(),
                         "key": sent_key})


def play_from_key(sent_key):
    active_device = get_object_or_404(Device, active=True)
    active_shelfpots = ShelfSpot.objects.filter(shelf__active=True)
    selected_shelfspot: ShelfSpot = get_object_or_404(active_shelfpots, associated_key=sent_key)
    selected_playable: Playable = get_object_or_404(Playable, pk=selected_shelfspot.playable_id)
    post_data = {"device": active_device.device_id, "playable_uri": selected_playable.uri}
    pprint(post_data)
    requests.post(MUSIC_DAEMON_PATH + "/play",
                  data=json.dumps(post_data),
                  headers={'Content-Type': 'application/json'})
    return JsonResponse({'selected_playable': selected_playable.uri, "device": active_device.device_id})


def login_if_necessary(request):
    resp = requests.get(MUSIC_DAEMON_PATH + "/isLoggedIn")
    if resp.status_code != 200:
        resp = requests.get(MUSIC_DAEMON_PATH + "/auth_url")
        verification_url = resp.text
        return render(request, 'configurator/verify_url.html', {'verification_url': verification_url})

def login_spotify(request):
    if request.method == 'POST':
        # Get the submitted URL from the form
        resulting_url = request.POST.get('resulting_url')

        if resulting_url:
            # Use regex to extract the 'code' parameter from the submitted URL
            match = re.search(r"code=([a-zA-Z0-9_-]*)", resulting_url)
            if match:
                # Extract the code
                code = match.group(1)

                # Construct the daemon URL with the code as a query parameter
                daemon_url = f"{MUSIC_DAEMON_PATH}?code={code}"

                # Make a GET request to the daemon URL
                try:
                    response = requests.get(daemon_url)

                    # Check if the response status is 200 (success)
                    if response.status_code == 200:
                        # Redirect to the homepage
                        return redirect('/')
                    else:
                        # Handle non-200 responses from the daemon URL
                        messages.error(
                            request, f"Daemon returned status code {response.status_code}. Please try again."
                        )
                except requests.RequestException as e:
                    # Handle connection errors or other request exceptions
                    messages.error(
                        request,
                        f"Failed to connect to the daemon: {str(e)}. Please check your connection and try again."
                    )
            else:
                # If the regex doesn't find a valid code
                messages.error(request, "The supplied URL does not contain a code. Please try again.")
        else:
            # If the URL field is empty
            messages.error(request, "The URL field is empty. Please provide a valid URL.")

    # Render the template again if the request is not POST or validation fails
    return render(request, 'configurator/verify_url.html', {'verification_url': None})
