// Types for the shelf data
export interface Playable {
  id: number;
  name: string;
  image_url: string;
}

export interface ShelfSpotData {
  id: number;
  row: number;
  col: number;
  playable: Playable | null;
  associated_key: number | null;
  buttonState?: number; // 0: yellow, -1: red, 1: green
}

export interface ShelfData {
  shelf_id: number;
  name: string;
  active: boolean;
  updated_at: string;
  spot_matrix: ShelfSpotData[];
}

// Types for the album library
export interface AlbumLibraryData {
  page: number;
  max_page: number;
  album_list: Playable[];
}

// Types for paginated shelf data
export interface PaginatedShelfData {
  data: ShelfData[];
  previous_page: number | null;
  next_page: number | null;
  total_pages: number;
}

// Types for the devices
export interface Device {
  device_id: number;
  device_name: string;
  device_type: string;
  active: boolean;
}

// Types for the WebSocket messages
export interface WebSocketMessage {
  message: string;
  states: Record<number, number>;
  last_message: boolean;
}
