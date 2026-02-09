# Custom Decor Items - Parameters Guide

## How to Add a Custom Item

Edit `/public/decor-panel.js` in the `getLocalCatalog()` function.

## Item Parameters

```javascript
{
  id: 'unique_item_id',        // Unique identifier (lowercase, underscores)
  name: 'Display Name',        // What users see in the catalog
  category: 'decor',           // Category key from this.categories
  style: 'cozy',               // Style: 'cozy', 'modern', 'rustic', 'nature', 'future'
  width: 1,                    // Grid width (1-4 cells)
  height: 1,                   // Grid height (1-4 cells)
  layer: 2,                    // Render layer: 0=floor, 1=furniture, 2=decor, 3=wall
  icon: '🪴'                   // Emoji icon displayed in catalog
}
```

## Categories Available

| Category | Icon | Description |
|----------|------|-------------|
| `seating` | 🛋️ | Sofas, chairs, bean bags |
| `tables` | 🪑 | Desks, coffee tables, dining tables |
| `storage` | 📚 | Bookshelves, cabinets, shelves |
| `decor` | 🎨 | Plants, paintings, rugs, small items |
| `lighting` | 💡 | Lamps, candles, string lights |
| `views` | 🪟 | Window views (city, forest, beach) |

## Layers Explained

| Layer | Use For |
|-------|---------|
| `0` | Floor items (rugs) |
| `1` | Furniture (tables, chairs, shelves) |
| `2` | Decor on furniture (plants, books, mugs) |
| `3` | Wall items (paintings, clocks, windows) |

## Example Custom Items

```javascript
// Gaming setup
{ id: 'gaming_pc', name: 'Gaming PC', category: 'tables', style: 'modern', width: 1, height: 1, layer: 2, icon: '🖥️' },
{ id: 'gaming_chair', name: 'Gaming Chair', category: 'seating', style: 'modern', width: 1, height: 1, layer: 1, icon: '🪑' },

// Kitchen items
{ id: 'fridge', name: 'Refrigerator', category: 'storage', style: 'modern', width: 1, height: 2, layer: 1, icon: '🧊' },
{ id: 'oven', name: 'Oven', category: 'decor', style: 'cozy', width: 1, height: 1, layer: 1, icon: '🔥' },

// Bedroom
{ id: 'bed_double', name: 'Double Bed', category: 'seating', style: 'cozy', width: 3, height: 2, layer: 1, icon: '🛏️' },
{ id: 'nightstand', name: 'Nightstand', category: 'tables', style: 'cozy', width: 1, height: 1, layer: 1, icon: '🗄️' },

// Outdoor
{ id: 'bbq_grill', name: 'BBQ Grill', category: 'decor', style: 'cozy', width: 2, height: 1, layer: 1, icon: '🍖' },
{ id: 'hot_tub', name: 'Hot Tub', category: 'seating', style: 'modern', width: 3, height: 2, layer: 1, icon: '🛁' },
```

## Steps to Add

1. Open `decor-panel.js`
2. Find `getLocalCatalog()` function
3. Add your item to the array
4. Save and refresh the game
5. Item appears in its category tab

## Tips

- Use unique IDs (check existing ones first)
- Pick emojis that render on all platforms
- Width/height are in grid cells (room is approx 12x8)
- Layer 3 items appear on walls (behind furniture)
- Style affects which room themes match