# COZY CLAW STUDIO - AGENT SWARM SPECIFICATION
## Project: Shared House v3.0
## Deadline: Complete all tasks in single session
## Budget: 40 credits total

---

## 🎯 PROJECT OVERVIEW

Build a complete multiplayer cozy game where humans and AI agents share virtual houses.
**Base codebase exists at:** `/home/zak/.openclaw/workspace/cozy-claw-studio/shared-house/`

**Tech Stack:**
- Backend: Node.js, Express, Socket.io, SQLite3
- Frontend: HTML5 Canvas, vanilla JS
- Art: 32x32 pixel art style

---

## 🤖 AGENT ASSIGNMENTS

### AGENT 1: ART AGENT 🎨
**Task:** Generate ALL game assets
**Credits:** 10
**Output:** `/cozy-claw-studio/shared-house/public/assets/`

**Deliverables:**
1. **Tilesets** (32x32px, seamless)
   - `floor_wood.png` - Wooden floor tiles
   - `floor_carpet.png` - Cozy carpet pattern
   - `floor_tiles.png` - Kitchen/bathroom tiles
   - `wall_brick.png` - Brick wall texture
   - `wall_paint.png` - Painted wall (various colors)

2. **Furniture Sprites** (64x64px, top-down view)
   - `sofa.png` - Comfy sofa
   - `sofa_fancy.png` - Leather sofa
   - `plant.png` - Potted plant
   - `plant_big.png` - Large plant
   - `tv.png` - Television
   - `bookshelf.png` - Bookshelf
   - `coffee_table.png` - Coffee table
   - `dining_table.png` - Dining table
   - `lamp.png` - Floor lamp
   - `bed.png` - Bed
   - `rug.png` - Area rug

3. **Character Sprites** (32x48px, 4-direction)
   - `human_walk.png` - Sprite sheet (down, left, right, up)
   - `agent_lobster.png` - Lobster agent sprite
   - `agent_robot.png` - Robot agent sprite

4. **UI Elements**
   - `button.png` - UI button template
   - `panel.png` - UI panel/frame
   - `coin_icon.png` - Coin currency icon
   - `heart_icon.png` - Health/happiness icon

**Tools:** Use OpenAI Image Gen skill or any image generation method
**Style:** Cozy pixel art, warm colors, top-down RPG style

---

### AGENT 2: MINI-GAME AGENT 🎮
**Task:** Build Cooking Mini-Game
**Credits:** 10
**Files:** `/cozy-claw-studio/shared-house/public/minigames/cooking/`

**Deliverables:**
1. **cooking.html** - Mini-game interface
2. **cooking.js** - Full game logic
3. **API integration** - Connect to main server for rewards

**Game Mechanics:**
- Player selects recipe (pizza, soup, salad, cake)
- Timed mini-game: click ingredients in correct order
- Cooking bar: click when needle is in green zone
- Success = earn coins + happiness boost
- Failure = burnt food, no reward

**Recipes:**
- Simple Pizza: dough + sauce + cheese (5 seconds, 10 coins)
- Hearty Soup: broth + veggies + spices (10 seconds, 25 coins)
- Fresh Salad: lettuce + tomato + dressing (7 seconds, 15 coins)
- Birthday Cake: flour + sugar + eggs + frosting (15 seconds, 50 coins)

**API Endpoints to Add:**
```javascript
POST /api/minigame/cooking/start
POST /api/minigame/cooking/complete
GET /api/minigame/cooking/recipes
```

**Integration:** Add "Cook" button to main game that opens cooking.html in modal

---

### AGENT 3: MOBILE AGENT 📱
**Task:** Mobile-responsive design + touch controls
**Credits:** 8
**Files:** Modify `/cozy-claw-studio/shared-house/public/`

**Deliverables:**
1. **index.html** - Responsive layout (update existing)
   - Mobile viewport meta
   - CSS media queries for phones/tablets
   - Touch-friendly button sizes (min 44px)

2. **mobile-controls.js** - Touch control system
   - Virtual joystick for movement (bottom-left)
   - Action buttons (bottom-right): Chat, Decorate, Interact
   - Pinch-to-zoom for map
   - Swipe gestures for menus

3. **mobile.css** - Mobile-specific styles
   - Portrait mode optimization
   - Landscape mode support
   - Hide desktop UI on mobile
   - Show mobile UI on touch devices

4. **PWA Support**
   - manifest.json for "Add to Home Screen"
   - Service worker for offline play
   - App icons (192x192, 512x512)

**Test:** Must work on iPhone Safari and Android Chrome

---

### AGENT 4: AUDIO AGENT 🔊
**Task:** Sound effects and background music
**Credits:** 6
**Files:** `/cozy-claw-studio/shared-house/public/audio/`

**Deliverables:**
1. **Background Music** (lo-fi, cozy, looping)
   - `bgm_main.mp3` - Main house theme (3 min loop)
   - `bgm_cooking.mp3` - Cooking mini-game music
   - `bgm_shop.mp3` - Shop browsing music

2. **Sound Effects** (.mp3, 1-2 seconds each)
   - `step_wood.mp3` - Walking on wood
   - `step_carpet.mp3` - Walking on carpet
   - `furniture_place.mp3` - Placing furniture
   - `coin_get.mp3` - Earning coins
   - `chat_receive.mp3` - New message
   - `door_open.mp3` - Player enters
   - `door_close.mp3` - Player leaves
   - `cooking_sizzle.mp3` - Cooking sounds
   - `success.mp3` - Action success
   - `error.mp3` - Error/bad action

3. **audio.js** - Audio manager
   - Volume controls
   - Mute/unmute
   - Sound pooling for performance
   - Background music player with fade

**Tools:** Use any audio generation or合成 tools available
**Style:** Cozy, lo-fi, chill beats to relax/study to

---

### AGENT 5: POLISH AGENT ✨
**Task:** Bug fixes, optimizations, UI/UX improvements
**Credits:** 6
**Files:** All files in `/cozy-claw-studio/shared-house/`

**Deliverables:**
1. **Bug Fixes**
   - Fix any console errors
   - Handle disconnections gracefully
   - Prevent duplicate player spawning
   - Fix furniture placement bugs

2. **Performance Optimization**
   - Sprite batching for rendering
   - Lazy loading for assets
   - Database query optimization
   - Connection pooling

3. **UI/UX Improvements**
   - Loading screen with progress bar
   - Better error messages
   - Tutorial for first-time players
   - Settings menu (sound, graphics)

4. **Security**
   - Rate limiting on API endpoints
   - Input sanitization
   - SQL injection prevention check
   - XSS protection

5. **Documentation**
   - API endpoint documentation
   - Database schema diagram
   - Deployment guide

---

## 📋 INTEGRATION PLAN

All agents work in their own folders. When complete:

1. Art Agent assets go to `/public/assets/`
2. Mini-game Agent files go to `/public/minigames/cooking/`
3. Mobile Agent updates existing `/public/` files
4. Audio Agent files go to `/public/audio/`
5. Polish Agent reviews and fixes everything

**Main integration by CELEST (Coordinator):**
- Merge all code changes
- Update server.js to include new endpoints
- Test all features work together
- Generate final build

---

## ✅ SUCCESS CRITERIA

- [ ] All art assets generated and loaded
- [ ] Cooking mini-game playable and rewarding
- [ ] Mobile version fully functional
- [ ] Audio plays correctly with volume control
- [ ] No console errors, smooth 60fps
- [ ] All features work together seamlessly

---

## 🚀 DEPLOYMENT

Final game runs at: `http://localhost:3000`
Ready for hosting on: Vercel, Railway, or DigitalOcean

**Cozy Claw Studio - Built by Agent Swarm** 🦞🎮
