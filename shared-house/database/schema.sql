-- Cozy Claw Studio - Shared House Database Schema
-- SQLite database for persistent game world

-- Players table
CREATE TABLE players (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT,
    password_hash TEXT,
    wallet_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    coins INTEGER DEFAULT 100,
    premium_coins INTEGER DEFAULT 0,
    house_level INTEGER DEFAULT 1,
    experience INTEGER DEFAULT 0
);

-- Houses table (each player gets one)
CREATE TABLE houses (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    name TEXT DEFAULT 'My Cozy Home',
    wallpaper TEXT DEFAULT '#3d3d3d',
    floor_color TEXT DEFAULT '#2d2d2d',
    lighting TEXT DEFAULT 'cozy',
    is_public BOOLEAN DEFAULT 1,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Furniture items (owned by players)
CREATE TABLE furniture_items (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    house_id TEXT NOT NULL,
    type TEXT NOT NULL,
    x REAL NOT NULL,
    y REAL NOT NULL,
    rotation INTEGER DEFAULT 0,
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
);

-- Shop catalog
CREATE TABLE shop_items (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    emoji TEXT NOT NULL,
    price_coins INTEGER DEFAULT 0,
    price_premium INTEGER DEFAULT 0,
    rarity TEXT DEFAULT 'common', -- common, rare, epic, legendary
    category TEXT DEFAULT 'furniture', -- furniture, decor, wallpaper, floor
    is_limited BOOLEAN DEFAULT 0,
    available_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory (items owned but not placed)
CREATE TABLE inventory (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES shop_items(id) ON DELETE CASCADE
);

-- Chat history
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    house_id TEXT NOT NULL,
    sender_id TEXT,
    sender_name TEXT NOT NULL,
    sender_type TEXT DEFAULT 'human', -- human, agent, system
    message TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
);

-- Visitors log (who visited whose house)
CREATE TABLE visitor_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    house_id TEXT NOT NULL,
    visitor_id TEXT,
    visitor_name TEXT,
    visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
);

-- Daily rewards tracking
CREATE TABLE daily_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id TEXT NOT NULL,
    reward_date DATE NOT NULL,
    coins_received INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 1,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    UNIQUE(player_id, reward_date)
);

-- Agent configurations (player's personal agents)
CREATE TABLE agents (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    name TEXT NOT NULL,
    emoji TEXT DEFAULT '🤖',
    personality TEXT DEFAULT 'friendly',
    intelligence_level INTEGER DEFAULT 1, -- 1=basic, 2=smart, 3=advanced
    is_active BOOLEAN DEFAULT 1,
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX idx_players_username ON players(username);
CREATE INDEX idx_furniture_house ON furniture_items(house_id);
CREATE INDEX idx_chat_house_time ON chat_messages(house_id, timestamp);
CREATE INDEX idx_inventory_player ON inventory(player_id);

-- Minigame high scores
CREATE TABLE IF NOT EXISTS minigame_scores (
    id TEXT PRIMARY KEY,
    player_id TEXT NOT NULL,
    minigame_type TEXT NOT NULL, -- 'cooking', 'fishing', etc.
    recipe_id TEXT, -- For cooking mini-game
    score INTEGER DEFAULT 0,
    accuracy INTEGER DEFAULT 0, -- 0-100
    completed BOOLEAN DEFAULT 0,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

-- Index for high score queries
CREATE INDEX IF NOT EXISTS idx_minigame_scores_player ON minigame_scores(player_id, minigame_type);
CREATE INDEX IF NOT EXISTS idx_minigame_scores_score ON minigame_scores(minigame_type, score DESC);

-- Insert default shop items
INSERT INTO shop_items (id, type, name, description, emoji, price_coins, rarity, category) VALUES
('sofa_basic', 'sofa', 'Basic Sofa', 'A comfortable place to sit', '🛋️', 50, 'common', 'furniture'),
('sofa_fancy', 'sofa', 'Fancy Sofa', 'Leather and luxury', '🛋️', 200, 'rare', 'furniture'),
('plant_small', 'plant', 'Small Plant', 'Adds a touch of green', '🪴', 25, 'common', 'furniture'),
('plant_big', 'plant', 'Big Plant', 'A statement piece', '🌳', 100, 'rare', 'furniture'),
('tv_basic', 'tv', 'Basic TV', 'Watch your favorite shows', '📺', 150, 'common', 'furniture'),
('tv_cinema', 'tv', 'Cinema TV', 'Movie theater experience', '📺', 500, 'epic', 'furniture'),
('coffee_table', 'table', 'Coffee Table', 'Perfect for coffee', '☕', 75, 'common', 'furniture'),
('dining_table', 'table', 'Dining Table', 'For family meals', '🍽️', 200, 'rare', 'furniture'),
('bookshelf', 'bookshelf', 'Bookshelf', 'Store your knowledge', '📚', 100, 'common', 'furniture'),
('lamp', 'lamp', 'Cozy Lamp', 'Warm lighting', '🛋️', 40, 'common', 'furniture'),
('painting', 'painting', 'Abstract Art', 'Adds character', '🖼️', 150, 'rare', 'decor'),
('rug', 'rug', 'Persian Rug', 'Soft and elegant', '🧶', 300, 'epic', 'decor'),
('wallpaper_cozy', 'wallpaper', 'Cozy Wallpaper', 'Warm dark tones', '🎨', 100, 'common', 'wallpaper'),
('wallpaper_forest', 'wallpaper', 'Forest Wallpaper', 'Bring nature inside', '🌲', 250, 'rare', 'wallpaper'),
('floor_wood', 'floor', 'Hardwood Floor', 'Classic and clean', '🪵', 150, 'common', 'floor'),
('floor_marble', 'floor', 'Marble Floor', 'Pure luxury', '💎', 500, 'epic', 'floor');
