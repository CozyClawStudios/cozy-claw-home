/**
 * Cozy Claw Home - Furniture Catalog
 * Complete catalog of all furniture items with cozy, warm aesthetics
 */

const FurnitureCatalog = (function() {
    'use strict';

    // Complete furniture catalog organized by room type
    const CATALOG = {
        // === LIVING ROOM FURNITURE ===
        sofa: {
            name: 'Cozy Sofa',
            emoji: '🛋️',
            category: 'living',
            size: { w: 80, h: 50 },
            description: 'A plush sofa perfect for afternoon naps',
            interactable: true,
            interactions: ['sit', 'nap', 'read'],
            colorOptions: ['#8B4513', '#A0522D', '#CD853F', '#2F4F4F', '#483D8B'],
            style: 'cozy'
        },
        loveseat: {
            name: 'Loveseat',
            emoji: '🪑',
            category: 'living',
            size: { w: 60, h: 45 },
            description: 'A charming two-seater',
            interactable: true,
            interactions: ['sit', 'cuddle'],
            colorOptions: ['#D2691E', '#8B4513', '#BC8F8F'],
            style: 'cozy'
        },
        armchair: {
            name: 'Reading Armchair',
            emoji: '🪑',
            category: 'living',
            size: { w: 50, h: 50 },
            description: 'Perfect with a good book',
            interactable: true,
            interactions: ['sit', 'read'],
            colorOptions: ['#8B4513', '#A0522D', '#CD853F'],
            style: 'vintage'
        },
        tv: {
            name: 'Television',
            emoji: '📺',
            category: 'living',
            size: { w: 60, h: 40 },
            description: 'For movie nights',
            interactable: true,
            interactions: ['watch', 'turn_on', 'turn_off'],
            style: 'modern'
        },
        tv_stand: {
            name: 'TV Stand',
            emoji: '📦',
            category: 'living',
            size: { w: 80, h: 35 },
            description: 'Rustic wood media console',
            interactable: false,
            colorOptions: ['#8B4513', '#654321', '#A0522D'],
            style: 'rustic'
        },
        bookshelf: {
            name: 'Bookshelf',
            emoji: '📚',
            category: 'living',
            size: { w: 50, h: 70 },
            description: 'Filled with adventures',
            interactable: true,
            interactions: ['browse', 'read'],
            colorOptions: ['#8B4513', '#654321', '#2F4F4F'],
            style: 'vintage'
        },
        coffee_table: {
            name: 'Coffee Table',
            emoji: '☕',
            category: 'living',
            size: { w: 60, h: 40 },
            description: 'For coffee and conversation',
            interactable: true,
            interactions: ['place_item'],
            colorOptions: ['#8B4513', '#A0522D', '#654321'],
            style: 'rustic'
        },
        side_table: {
            name: 'Side Table',
            emoji: '🟫',
            category: 'living',
            size: { w: 35, h: 35 },
            description: 'Small but mighty',
            interactable: false,
            colorOptions: ['#8B4513', '#A0522D'],
            style: 'simple'
        },
        floor_lamp: {
            name: 'Floor Lamp',
            emoji: '🛋️',
            category: 'living',
            size: { w: 25, h: 60 },
            description: 'Warm ambient lighting',
            interactable: true,
            interactions: ['turn_on', 'turn_off', 'adjust'],
            colorOptions: ['#FFD700', '#FFA500', '#CD853F'],
            style: 'cozy'
        },
        table_lamp: {
            name: 'Table Lamp',
            emoji: '🕯️',
            category: 'living',
            size: { w: 25, h: 35 },
            description: 'Soft bedside glow',
            interactable: true,
            interactions: ['turn_on', 'turn_off'],
            colorOptions: ['#FFE4B5', '#F5DEB3', '#DEB887'],
            style: 'cozy'
        },
        rug: {
            name: 'Area Rug',
            emoji: '🧶',
            category: 'living',
            size: { w: 100, h: 70 },
            description: 'Soft underfoot',
            interactable: true,
            interactions: ['sit', 'lie_down'],
            colorOptions: ['#D2691E', '#8B4513', '#BC8F8F', '#CD853F'],
            style: 'textile',
            isFloorItem: true
        },
        painting: {
            name: 'Wall Painting',
            emoji: '🖼️',
            category: 'living',
            size: { w: 40, h: 50 },
            description: 'Art for the soul',
            interactable: true,
            interactions: ['admire'],
            style: 'decorative',
            isWallItem: true
        },
        clock: {
            name: 'Wall Clock',
            emoji: '🕐',
            category: 'living',
            size: { w: 30, h: 30 },
            description: 'Tick tock',
            interactable: false,
            style: 'vintage',
            isWallItem: true
        },
        speaker: {
            name: 'Speaker',
            emoji: '🔊',
            category: 'living',
            size: { w: 25, h: 35 },
            description: 'For cozy tunes',
            interactable: true,
            interactions: ['play_music', 'pause'],
            style: 'modern'
        },
        game_console: {
            name: 'Game Console',
            emoji: '🎮',
            category: 'living',
            size: { w: 30, h: 20 },
            description: 'Fun times await',
            interactable: true,
            interactions: ['play'],
            style: 'modern'
        },

        // === KITCHEN FURNITURE ===
        fridge: {
            name: 'Refrigerator',
            emoji: '🧊',
            category: 'kitchen',
            size: { w: 50, h: 80 },
            description: 'Stocked with goodies',
            interactable: true,
            interactions: ['open', 'close', 'get_snack'],
            colorOptions: ['#C0C0C0', '#F5F5F5', '#2F4F4F'],
            style: 'appliance'
        },
        stove: {
            name: 'Stove',
            emoji: '🔥',
            category: 'kitchen',
            size: { w: 50, h: 50 },
            description: 'Where magic happens',
            interactable: true,
            interactions: ['cook', 'turn_on', 'turn_off'],
            colorOptions: ['#2F2F2F', '#4A4A4A', '#C0C0C0'],
            style: 'appliance'
        },
        microwave: {
            name: 'Microwave',
            emoji: '⏲️',
            category: 'kitchen',
            size: { w: 40, h: 25 },
            description: 'Quick heating',
            interactable: true,
            interactions: ['heat', 'open'],
            colorOptions: ['#C0C0C0', '#F5F5F5'],
            style: 'appliance'
        },
        sink: {
            name: 'Kitchen Sink',
            emoji: '🚰',
            category: 'kitchen',
            size: { w: 50, h: 30 },
            description: 'Wash up here',
            interactable: true,
            interactions: ['wash', 'get_water'],
            colorOptions: ['#C0C0C0', '#E8E8E8'],
            style: 'fixture'
        },
        kitchen_counter: {
            name: 'Kitchen Counter',
            emoji: '⬜',
            category: 'kitchen',
            size: { w: 60, h: 35 },
            description: 'Prep space',
            interactable: true,
            interactions: ['prep', 'place_item'],
            colorOptions: ['#F5F5F5', '#E8E8E8', '#D3D3D3'],
            style: 'counter'
        },
        kitchen_island: {
            name: 'Kitchen Island',
            emoji: '🏝️',
            category: 'kitchen',
            size: { w: 80, h: 50 },
            description: 'The heart of the kitchen',
            interactable: true,
            interactions: ['prep', 'eat', 'gather'],
            colorOptions: ['#8B4513', '#A0522D', '#F5F5F5'],
            style: 'island'
        },
        bar_stool: {
            name: 'Bar Stool',
            emoji: '🪑',
            category: 'kitchen',
            size: { w: 30, h: 45 },
            description: 'Casual seating',
            interactable: true,
            interactions: ['sit'],
            colorOptions: ['#8B4513', '#2F2F2F', '#A0522D'],
            style: 'simple'
        },
        dining_table: {
            name: 'Dining Table',
            emoji: '🍽️',
            category: 'kitchen',
            size: { w: 100, h: 60 },
            description: 'Family dinners',
            interactable: true,
            interactions: ['sit', 'eat'],
            colorOptions: ['#8B4513', '#A0522D', '#654321'],
            style: 'rustic'
        },
        dining_chair: {
            name: 'Dining Chair',
            emoji: '🪑',
            category: 'kitchen',
            size: { w: 35, h: 45 },
            description: 'Comfortable seating',
            interactable: true,
            interactions: ['sit'],
            colorOptions: ['#8B4513', '#A0522D', '#654321'],
            style: 'simple'
        },
        hanging_pot: {
            name: 'Hanging Pot Rack',
            emoji: '🍳',
            category: 'kitchen',
            size: { w: 60, h: 25 },
            description: 'Pots and pans',
            interactable: false,
            style: 'rustic',
            isCeilingItem: true
        },
        spice_rack: {
            name: 'Spice Rack',
            emoji: '🧂',
            category: 'kitchen',
            size: { w: 35, h: 25 },
            description: 'Flavor station',
            interactable: true,
            interactions: ['browse'],
            style: 'decorative',
            isWallItem: true
        },
        fruit_bowl: {
            name: 'Fruit Bowl',
            emoji: '🍎',
            category: 'kitchen',
            size: { w: 30, h: 20 },
            description: 'Fresh and colorful',
            interactable: true,
            interactions: ['grab_snack'],
            style: 'decorative'
        },
        coffee_maker: {
            name: 'Coffee Maker',
            emoji: '☕',
            category: 'kitchen',
            size: { w: 25, h: 30 },
            description: 'Morning essential',
            interactable: true,
            interactions: ['brew', 'pour'],
            style: 'appliance'
        },
        toaster: {
            name: 'Toaster',
            emoji: '🍞',
            category: 'kitchen',
            size: { w: 20, h: 20 },
            description: 'Crispy mornings',
            interactable: true,
            interactions: ['toast'],
            style: 'appliance'
        },
        blender: {
            name: 'Blender',
            emoji: '🥤',
            category: 'kitchen',
            size: { w: 20, h: 30 },
            description: 'Smoothie time',
            interactable: true,
            interactions: ['blend'],
            style: 'appliance'
        },
        dish_rack: {
            name: 'Dish Rack',
            emoji: '🍽️',
            category: 'kitchen',
            size: { w: 40, h: 25 },
            description: 'Drying dishes',
            interactable: false,
            style: 'utility'
        },
        trash_can: {
            name: 'Trash Can',
            emoji: '🗑️',
            category: 'kitchen',
            size: { w: 25, h: 35 },
            description: 'Keep it clean',
            interactable: true,
            interactions: ['dispose'],
            style: 'utility'
        },
        herb_garden: {
            name: 'Herb Garden',
            emoji: '🌿',
            category: 'kitchen',
            size: { w: 35, h: 25 },
            description: 'Fresh herbs',
            interactable: true,
            interactions: ['water', 'harvest'],
            style: 'natural'
        },
        wine_rack: {
            name: 'Wine Rack',
            emoji: '🍷',
            category: 'kitchen',
            size: { w: 40, h: 50 },
            description: 'For special occasions',
            interactable: true,
            interactions: ['browse'],
            style: 'decorative'
        },

        // === BEDROOM FURNITURE ===
        bed_single: {
            name: 'Single Bed',
            emoji: '🛏️',
            category: 'bedroom',
            size: { w: 60, h: 100 },
            description: 'Cozy and compact',
            interactable: true,
            interactions: ['sleep', 'nap', 'sit'],
            colorOptions: ['#E8D4C4', '#F5E6D3', '#D4A574'],
            style: 'cozy'
        },
        bed_double: {
            name: 'Double Bed',
            emoji: '🛏️',
            category: 'bedroom',
            size: { w: 90, h: 100 },
            description: 'Room to stretch',
            interactable: true,
            interactions: ['sleep', 'nap', 'sit', 'read'],
            colorOptions: ['#E8D4C4', '#F5E6D3', '#D4A574', '#BC8F8F'],
            style: 'cozy'
        },
        bed_bunk: {
            name: 'Bunk Bed',
            emoji: '🛏️',
            category: 'bedroom',
            size: { w: 70, h: 110 },
            description: 'Fun for everyone',
            interactable: true,
            interactions: ['sleep', 'climb'],
            colorOptions: ['#8B4513', '#A0522D'],
            style: 'fun'
        },
        nightstand: {
            name: 'Nightstand',
            emoji: '🟫',
            category: 'bedroom',
            size: { w: 35, h: 35 },
            description: 'Bedside companion',
            interactable: true,
            interactions: ['place_item', 'open_drawer'],
            colorOptions: ['#8B4513', '#A0522D', '#654321'],
            style: 'simple'
        },
        dresser: {
            name: 'Dresser',
            emoji: '🚪',
            category: 'bedroom',
            size: { w: 60, h: 50 },
            description: 'Storage space',
            interactable: true,
            interactions: ['open_drawer'],
            colorOptions: ['#8B4513', '#A0522D', '#654321'],
            style: 'vintage'
        },
        wardrobe: {
            name: 'Wardrobe',
            emoji: '👗',
            category: 'bedroom',
            size: { w: 60, h: 80 },
            description: 'Closet space',
            interactable: true,
            interactions: ['open', 'browse'],
            colorOptions: ['#8B4513', '#654321', '#2F4F4F'],
            style: 'vintage'
        },
        desk: {
            name: 'Desk',
            emoji: '📝',
            category: 'bedroom',
            size: { w: 70, h: 45 },
            description: 'Workspace',
            interactable: true,
            interactions: ['work', 'write', 'place_item'],
            colorOptions: ['#8B4513', '#A0522D', '#654321'],
            style: 'simple'
        },
        desk_chair: {
            name: 'Desk Chair',
            emoji: '🪑',
            category: 'bedroom',
            size: { w: 35, h: 45 },
            description: 'Comfortable for work',
            interactable: true,
            interactions: ['sit'],
            colorOptions: ['#2F2F2F', '#8B4513', '#4A4A4A'],
            style: 'modern'
        },
        vanity: {
            name: 'Vanity',
            emoji: '💄',
            category: 'bedroom',
            size: { w: 60, h: 45 },
            description: 'Get ready here',
            interactable: true,
            interactions: ['sit', 'groom'],
            colorOptions: ['#F5F5F5', '#E8E8E8', '#8B4513'],
            style: 'elegant'
        },
        mirror: {
            name: 'Mirror',
            emoji: '🪞',
            category: 'bedroom',
            size: { w: 35, h: 55 },
            description: 'Reflect on this',
            interactable: true,
            interactions: ['check_reflection'],
            style: 'decorative',
            isWallItem: true
        },
        alarm_clock: {
            name: 'Alarm Clock',
            emoji: '⏰',
            category: 'bedroom',
            size: { w: 20, h: 15 },
            description: 'Wake up call',
            interactable: true,
            interactions: ['set_alarm', 'snooze'],
            style: 'utility'
        },
        laundry_basket: {
            name: 'Laundry Basket',
            emoji: '🧺',
            category: 'bedroom',
            size: { w: 30, h: 35 },
            description: 'Dirty clothes',
            interactable: true,
            interactions: ['place_item'],
            style: 'utility'
        },
        stuffed_animal: {
            name: 'Stuffed Animal',
            emoji: '🧸',
            category: 'bedroom',
            size: { w: 25, h: 25 },
            description: 'Childhood friend',
            interactable: true,
            interactions: ['hug'],
            style: 'cute'
        },
        photo_frame: {
            name: 'Photo Frame',
            emoji: '🖼️',
            category: 'bedroom',
            size: { w: 20, h: 25 },
            description: 'Precious memories',
            interactable: true,
            interactions: ['admire'],
            style: 'decorative'
        },

        // === BATHROOM FURNITURE ===
        bathtub: {
            name: 'Bathtub',
            emoji: '🛁',
            category: 'bathroom',
            size: { w: 70, h: 35 },
            description: 'Soak and relax',
            interactable: true,
            interactions: ['bathe', 'fill', 'drain'],
            colorOptions: ['#F5F5F5', '#E8E8E8'],
            style: 'fixture'
        },
        shower: {
            name: 'Shower',
            emoji: '🚿',
            category: 'bathroom',
            size: { w: 45, h: 45 },
            description: 'Quick refresh',
            interactable: true,
            interactions: ['shower', 'turn_on', 'turn_off'],
            colorOptions: ['#C0C0C0', '#E8E8E8'],
            style: 'fixture'
        },
        sink_vanity: {
            name: 'Sink Vanity',
            emoji: '🚰',
            category: 'bathroom',
            size: { w: 55, h: 40 },
            description: 'Wash up',
            interactable: true,
            interactions: ['wash', 'brush_teeth'],
            colorOptions: ['#F5F5F5', '#E8E8E8'],
            style: 'fixture'
        },
        toilet: {
            name: 'Toilet',
            emoji: '🚽',
            category: 'bathroom',
            size: { w: 35, h: 35 },
            description: 'Nature calls',
            interactable: true,
            interactions: ['use', 'flush'],
            colorOptions: ['#F5F5F5', '#E8E8E8'],
            style: 'fixture'
        },
        towel_rack: {
            name: 'Towel Rack',
            emoji: '🧻',
            category: 'bathroom',
            size: { w: 40, h: 15 },
            description: 'Hang towels here',
            interactable: true,
            interactions: ['grab_towel'],
            style: 'utility',
            isWallItem: true
        },
        towel_basket: {
            name: 'Towel Basket',
            emoji: '🧺',
            category: 'bathroom',
            size: { w: 30, h: 25 },
            description: 'Fresh towels',
            interactable: true,
            interactions: ['grab_towel'],
            style: 'utility'
        },
        bath_mat: {
            name: 'Bath Mat',
            emoji: '🧶',
            category: 'bathroom',
            size: { w: 40, h: 25 },
            description: 'Soft landing',
            interactable: false,
            colorOptions: ['#E8D4C4', '#F5E6D3', '#BC8F8F'],
            style: 'textile',
            isFloorItem: true
        },
        shelf: {
            name: 'Wall Shelf',
            emoji: '📦',
            category: 'bathroom',
            size: { w: 40, h: 15 },
            description: 'Storage space',
            interactable: false,
            style: 'simple',
            isWallItem: true
        },
        candle: {
            name: 'Scented Candle',
            emoji: '🕯️',
            category: 'bathroom',
            size: { w: 15, h: 20 },
            description: 'Relaxing aroma',
            interactable: true,
            interactions: ['light', 'extinguish', 'enjoy'],
            style: 'decorative'
        },
        soap_dispenser: {
            name: 'Soap Dispenser',
            emoji: '🧴',
            category: 'bathroom',
            size: { w: 12, h: 20 },
            description: 'Stay clean',
            interactable: true,
            interactions: ['dispense'],
            style: 'utility'
        },
        toothbrush_holder: {
            name: 'Toothbrush Holder',
            emoji: '🪥',
            category: 'bathroom',
            size: { w: 15, h: 15 },
            description: 'Oral care',
            interactable: false,
            style: 'utility'
        },
        scale: {
            name: 'Bathroom Scale',
            emoji: '⚖️',
            category: 'bathroom',
            size: { w: 25, h: 25 },
            description: 'Health check',
            interactable: true,
            interactions: ['weigh'],
            style: 'utility',
            isFloorItem: true
        },
        laundry_hamper: {
            name: 'Laundry Hamper',
            emoji: '🧺',
            category: 'bathroom',
            size: { w: 35, h: 45 },
            description: 'Dirty clothes',
            interactable: true,
            interactions: ['place_item'],
            style: 'utility'
        },

        // === OUTDOOR FURNITURE ===
        garden_bench: {
            name: 'Garden Bench',
            emoji: '🪑',
            category: 'outdoor',
            size: { w: 70, h: 40 },
            description: 'Sit among nature',
            interactable: true,
            interactions: ['sit', 'relax'],
            colorOptions: ['#8B4513', '#654321'],
            style: 'natural'
        },
        patio_table: {
            name: 'Patio Table',
            emoji: '🍽️',
            category: 'outdoor',
            size: { w: 80, h: 60 },
            description: 'Al fresco dining',
            interactable: true,
            interactions: ['sit', 'eat'],
            colorOptions: ['#8B4513', '#A0522D', '#2F4F4F'],
            style: 'outdoor'
        },
        patio_chair: {
            name: 'Patio Chair',
            emoji: '🪑',
            category: 'outdoor',
            size: { w: 40, h: 45 },
            description: 'Outdoor seating',
            interactable: true,
            interactions: ['sit', 'relax'],
            colorOptions: ['#8B4513', '#2F4F4F', '#A0522D'],
            style: 'outdoor'
        },
        hammock: {
            name: 'Hammock',
            emoji: '🛏️',
            category: 'outdoor',
            size: { w: 90, h: 40 },
            description: 'Lazy afternoons',
            interactable: true,
            interactions: ['lie_down', 'nap', 'relax'],
            colorOptions: ['#D2691E', '#8B4513', '#228B22'],
            style: 'outdoor'
        },
        grill: {
            name: 'BBQ Grill',
            emoji: '🔥',
            category: 'outdoor',
            size: { w: 45, h: 40 },
            description: 'Cook outdoors',
            interactable: true,
            interactions: ['grill', 'light'],
            colorOptions: ['#2F2F2F', '#4A4A4A'],
            style: 'outdoor'
        },
        fire_pit: {
            name: 'Fire Pit',
            emoji: '🔥',
            category: 'outdoor',
            size: { w: 50, h: 35 },
            description: 'Warm gatherings',
            interactable: true,
            interactions: ['light', 'sit_by', 'roast_marshmallows'],
            style: 'outdoor'
        },
        flower_pot: {
            name: 'Flower Pot',
            emoji: '🪴',
            category: 'outdoor',
            size: { w: 25, h: 30 },
            description: 'Potted beauty',
            interactable: true,
            interactions: ['water', 'admire'],
            style: 'natural'
        },
        flower_bed: {
            name: 'Flower Bed',
            emoji: '🌻',
            category: 'outdoor',
            size: { w: 80, h: 40 },
            description: 'Blooming colors',
            interactable: true,
            interactions: ['water', 'tend'],
            style: 'natural',
            isFloorItem: true
        },
        shrub: {
            name: 'Shrub',
            emoji: '🌳',
            category: 'outdoor',
            size: { w: 40, h: 40 },
            description: 'Green bush',
            interactable: false,
            style: 'natural'
        },
        tree: {
            name: 'Tree',
            emoji: '🌲',
            category: 'outdoor',
            size: { w: 50, h: 70 },
            description: 'Majestic shade',
            interactable: false,
            style: 'natural'
        },
        garden_lantern: {
            name: 'Garden Lantern',
            emoji: '🏮',
            category: 'outdoor',
            size: { w: 20, h: 35 },
            description: 'Evening light',
            interactable: true,
            interactions: ['light', 'extinguish'],
            style: 'decorative'
        },
        string_lights: {
            name: 'String Lights',
            emoji: '💡',
            category: 'outdoor',
            size: { w: 100, h: 20 },
            description: 'Fairy lights',
            interactable: true,
            interactions: ['turn_on', 'turn_off'],
            style: 'decorative',
            isCeilingItem: true
        },
        bird_feeder: {
            name: 'Bird Feeder',
            emoji: '🐦',
            category: 'outdoor',
            size: { w: 20, h: 30 },
            description: 'Feathered friends',
            interactable: true,
            interactions: ['fill', 'watch'],
            style: 'natural'
        },
        watering_can: {
            name: 'Watering Can',
            emoji: '🚿',
            category: 'outdoor',
            size: { w: 25, h: 25 },
            description: 'Garden tool',
            interactable: true,
            interactions: ['fill', 'water'],
            style: 'utility'
        },
        garden_gnome: {
            name: 'Garden Gnome',
            emoji: '🧙',
            category: 'outdoor',
            size: { w: 20, h: 30 },
            description: 'Whimsical guardian',
            interactable: false,
            style: 'decorative'
        },
        fence_section: {
            name: 'Fence Section',
            emoji: '🪵',
            category: 'outdoor',
            size: { w: 60, h: 40 },
            description: 'Boundary marker',
            interactable: false,
            colorOptions: ['#8B4513', '#654321'],
            style: 'natural'
        },
        outdoor_rug: {
            name: 'Outdoor Rug',
            emoji: '🧶',
            category: 'outdoor',
            size: { w: 80, h: 50 },
            description: 'Patio comfort',
            interactable: false,
            colorOptions: ['#D2691E', '#8B4513', '#BC8F8F'],
            style: 'textile',
            isFloorItem: true
        },
        cooler: {
            name: 'Cooler',
            emoji: '🧊',
            category: 'outdoor',
            size: { w: 35, h: 30 },
            description: 'Keep drinks cold',
            interactable: true,
            interactions: ['open', 'grab_drink'],
            style: 'utility'
        },
        patio_umbrella: {
            name: 'Patio Umbrella',
            emoji: '☂️',
            category: 'outdoor',
            size: { w: 70, h: 60 },
            description: 'Shade from sun',
            interactable: true,
            interactions: ['open', 'close'],
            style: 'outdoor'
        },

        // === PLANTS (Universal) ===
        plant: {
            name: 'House Plant',
            emoji: '🪴',
            category: 'universal',
            size: { w: 25, h: 35 },
            description: 'Brings life to the room',
            interactable: true,
            interactions: ['water', 'admire'],
            style: 'natural'
        },
        hanging_plant: {
            name: 'Hanging Plant',
            emoji: '🌿',
            category: 'universal',
            size: { w: 30, h: 40 },
            description: 'Trailing greenery',
            interactable: true,
            interactions: ['water', 'admire'],
            style: 'natural',
            isCeilingItem: true
        }
    };

    /**
     * Get furniture item by type
     */
    function getItem(type) {
        return CATALOG[type] || {
            name: 'Unknown Item',
            emoji: '📦',
            description: 'Mysterious object'
        };
    }

    /**
     * Get all items for a category
     */
    function getByCategory(category) {
        return Object.entries(CATALOG)
            .filter(([key, item]) => item.category === category || item.category === 'universal')
            .map(([key, item]) => ({ type: key, ...item }));
    }

    /**
     * Get items for current room
     */
    function getForCurrentRoom() {
        if (typeof RoomManager !== 'undefined') {
            return RoomManager.getRoomFurnitureCatalog();
        }
        return [];
    }

    /**
     * Search items by name
     */
    function search(query) {
        const lowerQuery = query.toLowerCase();
        return Object.entries(CATALOG)
            .filter(([key, item]) => 
                item.name.toLowerCase().includes(lowerQuery) ||
                item.description.toLowerCase().includes(lowerQuery)
            )
            .map(([key, item]) => ({ type: key, ...item }));
    }

    /**
     * Get all categories
     */
    function getCategories() {
        const categories = new Set();
        Object.values(CATALOG).forEach(item => categories.add(item.category));
        return Array.from(categories);
    }

    /**
     * Get items by style
     */
    function getByStyle(style) {
        return Object.entries(CATALOG)
            .filter(([key, item]) => item.style === style)
            .map(([key, item]) => ({ type: key, ...item }));
    }

    // Public API
    return {
        CATALOG,
        getItem,
        getByCategory,
        getForCurrentRoom,
        search,
        getCategories,
        getByStyle
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FurnitureCatalog;
}