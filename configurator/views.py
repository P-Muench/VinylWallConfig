from typing import Literal

from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render, get_object_or_404
from django.urls import reverse

from configurator.models import Playable, ShelfSpot, Shelf


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


def render_shelf(request, shelf):
    spot_list = shelf.shelfspot_set.all()
    return render(request, 'configurator/shelf.html', {
        'spot_matrix': generate_spot_matrix(spot_list),
        'shelf': shelf
    })


def generate_spot_matrix(spot_list):
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
