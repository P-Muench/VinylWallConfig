import { create } from 'zustand'
import { ShelfData, AlbumLibraryData, Device, WebSocketMessage, PaginatedShelfData } from '../types'

interface StoreState {
  // Shelf data
  currentShelf: ShelfData | null;
  shelves: ShelfData[];
  shelfPreviousPage: number | null;
  shelfNextPage: number | null;
  shelfTotalPages: number;
  isEditMode: boolean;
  isPaused: boolean;

  // Album library
  albumLibrary: AlbumLibraryData | null;
  searchQuery: string;

  // Devices
  devices: Device[];

  // UI state
  isLoading: boolean;
  modalMessage: string;
  showModal: boolean;

  // WebSocket
  webSocket: WebSocket | null;

  // Actions
  fetchShelf: (shelfId: number) => Promise<void>;
  fetchActiveShelf: () => Promise<ShelfData>;
  fetchShelves: (page?: number) => Promise<void>;
  fetchAlbumLibrary: (query?: string, page?: number) => Promise<void>;
  fetchDevices: () => Promise<void>;

  toggleEditMode: () => void;
  disableEditMode: () => void;
  togglePause: () => void;
  disablePauseMode: () => void;

  setShelfSpotPlayable: (shelfSpotId: number, playableId: number) => Promise<void>;
  addShelfSpot: (shelfId: number, rowId: number, colId: number) => Promise<void>;
  removeShelfSpot: (shelfId: number, rowId: number, colId: number) => Promise<void>;

  activateShelf: (shelfId: number) => Promise<void>;
  duplicateShelf: (shelfId: number) => Promise<void>;

  activateDevice: (deviceId: number) => Promise<void>;

  setModalMessage: (message: string) => void;
  setShowModal: (show: boolean) => void;

  connectWebSocket: (shelfId: number) => void;
  disconnectWebSocket: () => void;
  sendWebSocketMessage: (shelfspotId: number) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  // Initial state
  currentShelf: null,
  shelves: [],
  shelfPreviousPage: null,
  shelfNextPage: null,
  shelfTotalPages: 1,
  isEditMode: false,
  isPaused: false,

  albumLibrary: null,
  searchQuery: '',

  devices: [],

  isLoading: false,
  modalMessage: '',
  showModal: false,

  webSocket: null,

  // Actions
  fetchShelf: async (shelfId: number) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/shelf_json/${shelfId}`);
      const data = await response.json();
      set({ currentShelf: data, isLoading: false });
    } catch (error) {
      console.error('Error fetching shelf:', error);
      set({ isLoading: false });
    }
  },

  fetchActiveShelf: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/active_shelf/');
      const data = await response.json();
      set({ currentShelf: data, isLoading: false });
      return data;
    } catch (error) {
      console.error('Error fetching active shelf:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  fetchShelves: async (page = 1) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`/api/shelves?page=${page}`);
      const data = await response.json() as PaginatedShelfData;
      set({ 
        shelves: data.data, 
        shelfPreviousPage: data.previous_page, 
        shelfNextPage: data.next_page, 
        shelfTotalPages: data.total_pages,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error fetching shelves:', error);
      set({ isLoading: false });
    }
  },

  fetchAlbumLibrary: async (query = '', page = 1) => {
    set({ isLoading: true });
    try {
      const url = `/api/album/library/?search_txt=${query}&page=${page}`;
      const response = await fetch(url);
      const data = await response.json();
      set({ albumLibrary: data, searchQuery: query, isLoading: false });
    } catch (error) {
      console.error('Error fetching album library:', error);
      set({ isLoading: false });
    }
  },

  fetchDevices: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/devices/');
      const data = await response.json();
      set({ devices: data, isLoading: false });
    } catch (error) {
      console.error('Error fetching devices:', error);
      set({ isLoading: false });
    }
  },

  toggleEditMode: () => {
    set((state) => ({ isEditMode: !state.isEditMode }));
  },

   disableEditMode: () => {
    set(() => ({ isEditMode: false }));
  },

   disablePauseMode: () => {
    set(() => ({ isPaused: false }));
  },

  togglePause: () => {
    set((state) => ({ isPaused: !state.isPaused }));
  },

  setShelfSpotPlayable: async (shelfSpotId: number, playableId: number) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/shelfspot/set/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]')?.value || '',
        },
        body: JSON.stringify({
          shelfspot_id: shelfSpotId,
          playable_id: playableId,
        }),
      });
      const data = await response.json();
      set({ currentShelf: data, isLoading: false });
    } catch (error) {
      console.error('Error setting shelf spot playable:', error);
      set({ isLoading: false });
    }
  },

  addShelfSpot: async (shelfId: number, rowId: number, colId: number) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/shelf/add/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]')?.value || '',
        },
        body: JSON.stringify({
          shelf_id: shelfId,
          row_id: rowId,
          col_id: colId,
        }),
      });
      const data = await response.json();
      set({ currentShelf: data, isLoading: false });
    } catch (error) {
      console.error('Error adding shelf spot:', error);
      set({ isLoading: false });
    }
  },

  removeShelfSpot: async (shelfId: number, rowId: number, colId: number) => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/shelf/remove/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]')?.value || '',
        },
        body: JSON.stringify({
          shelf_id: shelfId,
          row_id: rowId,
          col_id: colId,
        }),
      });
      const data = await response.json();
      set({ currentShelf: data, isLoading: false });
    } catch (error) {
      console.error('Error removing shelf spot:', error);
      set({ isLoading: false });
    }
  },

  activateShelf: async (shelfId: number) => {
    set({ isLoading: true });
    try {
      await fetch(`/api/shelf/activate/${shelfId}`);
      await get().fetchShelves();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error activating shelf:', error);
      set({ isLoading: false });
    }
  },

  duplicateShelf: async (shelfId: number) => {
    set({ isLoading: true });
    try {
      await fetch(`/api/shelf/duplicate/${shelfId}`);
      await get().fetchShelves();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error duplicating shelf:', error);
      set({ isLoading: false });
    }
  },

  activateDevice: async (deviceId: number) => {
    set({ isLoading: true });
    try {
      await fetch('/api/devices/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRFToken': document.querySelector<HTMLInputElement>('[name=csrfmiddlewaretoken]')?.value || '',
        },
        body: `device_id=${deviceId}`,
      });
      await get().fetchDevices();
      set({ isLoading: false });
    } catch (error) {
      console.error('Error activating device:', error);
      set({ isLoading: false });
    }
  },

  setModalMessage: (message: string) => {
    set({ modalMessage: message });
  },

  setShowModal: (show: boolean) => {
    set({ showModal: show });
  },

  connectWebSocket: (shelfId: number) => {
    const { webSocket } = get();
    if (webSocket) {
      webSocket.close();
    }

    if (shelfId !== null && shelfId !== undefined) {
      const ws = new WebSocket(`ws://${window.location.host}/ws/configure/${shelfId}/`);

      ws.onmessage = (e) => {
        const data: WebSocketMessage = JSON.parse(e.data);
        set({modalMessage: data.message});

        if (data.last_message) {
          set({showModal: false});
        } else {
          set({showModal: true});
        }

        // Update shelf spot button states
        const {currentShelf} = get();
        if (currentShelf) {
          const updatedSpotMatrix = currentShelf.spot_matrix.map(spot => {
            if (data.states[spot.id] !== undefined) {
              return {
                ...spot,
                buttonState: data.states[spot.id]
              };
            }
            return spot;
          });

          set({
            currentShelf: {
              ...currentShelf,
              spot_matrix: updatedSpotMatrix
            }
          });
        }
      };

      ws.onclose = () => {
        console.error('WebSocket closed unexpectedly');
      };

      set({webSocket: ws});
    }
  },

  disconnectWebSocket: () => {
    const { webSocket } = get();
    if (webSocket) {
      webSocket.close();
      set({ webSocket: null });
    }
  },

  sendWebSocketMessage: (shelfspotId: number) => {
    const { webSocket, currentShelf } = get();
    if (webSocket && webSocket.readyState === WebSocket.OPEN && shelfspotId !== null && shelfspotId !== undefined) {
      // Send the shelfspot_id to the WebSocket
      webSocket.send(JSON.stringify({
        'shelfspot_id': shelfspotId
      }));

      // Update the button state to 0 (yellow) when the message is sent
      if (currentShelf) {
        const updatedSpotMatrix = currentShelf.spot_matrix.map(spot => {
          if (spot.id === shelfspotId) {
            return {
              ...spot,
              buttonState: 0 // Set to yellow
            };
          }
          return spot;
        });

        set({
          currentShelf: {
            ...currentShelf,
            spot_matrix: updatedSpotMatrix
          },
          showModal: true // Show the modal dialog
        });
      }
    } else {
      console.error('WebSocket is not connected');
    }
  }
}));
