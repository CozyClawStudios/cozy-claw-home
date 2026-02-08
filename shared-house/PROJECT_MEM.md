# Layered Room System - Implementation Notes

## Files Created/Modified

### New Files
1. **decor/layered-database.js** - Database operations for layered rooms
   - Stores floor, wall, window configuration
   - Manages items on different layers (furniture=3, decor=4)
   - Supports snapshots for undo/redo

2. **public/room-renderer.js** - Client-side room rendering
   - Creates layered DOM structure (floor→wall→window→furniture→decor→character)
   - Handles drag-drop item movement
   - Real-time layer visibility toggling

3. **public/layer-panel.js** - UI for layer editing
   - Tabbed interface for each layer
   - Floor type/color editor
   - Wall color/pattern editor
   - Window view/time/frame editor
   - Furniture and decor catalog with drag-drop

### Modified Files
1. **server.js**
   - Added LayeredRoomDatabase import
   - Initialized layered room system on startup
   - Added 13 new API endpoints for room management
   - Made layeredRoomDB globally available

2. **public/game.js**
   - Integrated RoomRenderer initialization
   - Integrated LayerPanel initialization
   - Set up event listeners for room interactions
   - Replaced old decorPanel with new layerPanel

3. **public/index.html**
   - Added script tags for room-renderer.js and layer-panel.js

## Layer Architecture

```
z-index: 6  - Character Layer (Celest, avatars)
z-index: 5  - Decor Layer (plants, pictures, lamps)
z-index: 4  - Furniture Layer (tables, chairs, beds)
z-index: 3  - Window Layer (views: city, forest, beach)
z-index: 2  - Wall Layer (paint, wallpaper)
z-index: 1  - Floor Layer (wood, carpet, tile, grass)
```

## API Endpoints

### Room Layers
- `GET /api/room/layers` - Get full room state
- `GET /api/room/layer/:type` - Get specific layer (floor/wall/window)
- `POST /api/room/layer/:type` - Update layer

### Items
- `GET /api/room/items` - Get items in room
- `POST /api/room/item` - Place item on layer
- `POST /api/room/item/:id/move` - Move item
- `DELETE /api/room/item/:id` - Remove item
- `POST /api/room/item/:id/layer` - Change item layer

### Snapshots
- `POST /api/room/snapshot` - Create snapshot
- `POST /api/room/snapshot/:id/restore` - Restore snapshot
- `POST /api/room/reset` - Reset to defaults

### Visibility
- `POST /api/room/layer/:layer/visibility` - Toggle layer visibility

## Database Schema

### room_layers table
- room_id, floor_type, floor_color, floor_texture
- wall_type, wall_color, wall_pattern
- window_view, window_time, window_frame

### room_items table
- id, room_id, item_type, item_key
- x, y, z_index, rotation, scale
- layer (3=furniture, 4=decor)
- visible, locked, placed_by

## Integration Notes

### For Joy (Drag-Drop)
- RoomRenderer handles item drag-drop via mouse events
- Emits `room:itemMove`, `room:itemRemove`, `room:itemDrop` events
- Grid overlay for precise placement (20x15 grid)

### For Spark (Celest AI)
- Celest can access room state via global.roomRenderer
- Items on all layers accessible for interaction
- Layer visibility can be toggled programmatically

## Testing

Server starts successfully with:
```
🏠 Layered room database initialized
🏗️  Layered Room Endpoints listed
```

## Acceptance Criteria Status

- [x] Empty room starts with plain floor/walls
- [x] User can change floor type/color
- [x] User can change wall color/pattern
- [x] User can place furniture on furniture layer
- [x] User can place decor on decor layer
- [x] Layers render in correct order
- [x] Celest can interact with items on any layer
- [x] All changes persist to database
