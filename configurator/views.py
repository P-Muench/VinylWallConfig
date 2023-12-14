from django.http import HttpResponse
from django.shortcuts import render, get_object_or_404

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
    min_row = min(s.row_index for s in spot_list)
    min_col = min(s.col_index for s in spot_list)
    spot_matrix = [[None] * (max(s.col_index for s in spot_list) - min_col + 1) for _ in
                   range(min_row, max(s.row_index for s in spot_list) + 1)]
    for s in spot_list:
        spot_matrix[s.row_index - min_row][s.col_index - min_col] = s
    return render(request, 'configurator/shelf.html', {
        'spot_matrix': spot_matrix,
    })