/**
 * Cooking Mini-Game - Cozy Claw Studio
 * Full game logic with recipes, timing, and scoring
 */

// ==================== CONFIGURATION ====================

const RECIPES = {
    pizza: {
        id: 'pizza',
        name: 'Simple Pizza',
        emoji: '🍕',
        difficulty: 'easy',
        timeLimit: 5000, // 5 seconds
        baseReward: 10,
        ingredients: [
            { id: 'dough', emoji: '🫓', name: 'Dough' },
            { id: 'sauce', emoji: '🍅', name: 'Sauce' },
            { id: 'cheese', emoji: '🧀', name: 'Cheese' }
        ]
    },
    soup: {
        id: 'soup',
        name: 'Hearty Soup',
        emoji: '🍲',
        difficulty: 'medium',
        timeLimit: 10000, // 10 seconds
        baseReward: 25,
        ingredients: [
            { id: 'broth', emoji: '🥣', name: 'Broth' },
            { id: 'veggies', emoji: '🥕', name: 'Veggies' },
            { id: 'spices', emoji: '🌿', name: 'Spices' }
        ]
    },
    salad: {
        id: 'salad',
        name: 'Fresh Salad',
        emoji: '🥗',
        difficulty: 'easy',
        timeLimit: 7000, // 7 seconds
        baseReward: 15,
        ingredients: [
            { id: 'lettuce', emoji: '🥬', name: 'Lettuce' },
            { id: 'tomato', emoji: '🍅', name: 'Tomato' },
            { id: 'dressing', emoji: '🫒', name: 'Dressing' }
        ]
    },
    cake: {
        id: 'cake',
        name: 'Birthday Cake',
        emoji: '🎂',
        difficulty: 'hard',
        timeLimit: 15000, // 15 seconds
        baseReward: 50,
        ingredients: [
            { id: 'flour', emoji: '🌾', name: 'Flour' },
            { id: 'sugar', emoji: '🍬', name: 'Sugar' },
            { id: 'eggs', emoji: '🥚', name: 'Eggs' },
            { id: 'frosting', emoji: '🧁', name: 'Frosting' }
        ]
    }
};

const ALL_INGREDIENTS = [
    { id: 'dough', emoji: '🫓', name: 'Dough' },
    { id: 'sauce', emoji: '🍅', name: 'Sauce' },
    { id: 'cheese', emoji: '🧀', name: 'Cheese' },
    { id: 'broth', emoji: '🥣', name: 'Broth' },
    { id: 'veggies', emoji: '🥕', name: 'Veggies' },
    { id: 'spices', emoji: '🌿', name: 'Spices' },
    { id: 'lettuce', emoji: '🥬', name: 'Lettuce' },
    { id: 'tomato', emoji: '🍅', name: 'Tomato' },
    { id: 'dressing', emoji: '🫒', name: 'Dressing' },
    { id: 'flour', emoji: '🌾', name: 'Flour' },
    { id: 'sugar', emoji: '🍬', name: 'Sugar' },
    { id: 'eggs', emoji: '🥚', name: 'Eggs' },
    { id: 'frosting', emoji: '🧁', name: 'Frosting' }
];

const DIFFICULTY_MULTIPLIERS = {
    easy: 1,
    medium: 1.2,
    hard: 1.5
};

// ==================== GAME STATE ====================

const gameState = {
    currentRecipe: null,
    collectedIngredients: [],
    fallingIngredients: [],
    gamePhase: 'menu', // menu, collecting, cooking, result
    timeRemaining: 0,
    score: 0,
    playerCoins: 0,
    cookingNeedlePosition: 0,
    cookingNeedleDirection: 1,
    cookingNeedleSpeed: 2,
    accuracy: 0,
    gameSessionId: null,
    highScores: []
};

// Canvas and animation
let canvas, ctx;
let animationFrameId;
let gameIntervalId;
let cookingIntervalId;
let lastTime = 0;

// ==================== DOM ELEMENTS ====================

const elements = {
    menuScreen: document.getElementById('menu-screen'),
    gameScreen: document.getElementById('game-screen'),
    resultScreen: document.getElementById('result-screen'),
    loading: document.getElementById('loading'),
    recipeSelection: document.getElementById('recipe-selection'),
    startBtn: document.getElementById('start-btn'),
    canvas: document.getElementById('game-canvas'),
    currentRecipe: document.getElementById('current-recipe'),
    gameTimer: document.getElementById('game-timer'),
    progressCount: document.getElementById('progress-count'),
    ingredientsList: document.getElementById('ingredients-list'),
    cookingSection: document.getElementById('cooking-section'),
    cookingNeedle: document.getElementById('cooking-needle'),
    cookingBtn: document.getElementById('cooking-btn'),
    resultEmoji: document.getElementById('result-emoji'),
    resultTitle: document.getElementById('result-title'),
    resultMessage: document.getElementById('result-message'),
    resultReward: document.getElementById('result-reward'),
    playAgainBtn: document.getElementById('play-again-btn'),
    backToMenuBtn: document.getElementById('back-to-menu-btn'),
    scoreList: document.getElementById('score-list'),
    playerCoins: document.getElementById('player-coins')
};

// ==================== API FUNCTIONS ====================

const API_BASE_URL = '';

function getAuthToken() {
    // Try to get token from localStorage or parent window
    let token = localStorage.getItem('cozyClawToken');
    if (!token && window.parent !== window) {
        // Try to get from parent if in iframe
        try {
            token = window.parent.localStorage.getItem('cozyClawToken');
        } catch (e) {
            // Cross-origin, ignore
        }
    }
    return token;
}

async function apiRequest(endpoint, method = 'GET', body = null) {
    const token = getAuthToken();
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }
    
    return response.json();
}

async function fetchPlayerProfile() {
    try {
        const profile = await apiRequest('/api/player/profile');
        gameState.playerCoins = profile.coins || 100;
        updateCoinsDisplay();
        return profile;
    } catch (err) {
        console.warn('Failed to fetch profile, using default:', err.message);
        gameState.playerCoins = 100;
        updateCoinsDisplay();
        return { coins: 100 };
    }
}

async function fetchHighScores() {
    try {
        const scores = await apiRequest('/api/minigame/cooking/scores');
        gameState.highScores = scores;
        renderHighScores();
        return scores;
    } catch (err) {
        console.warn('Failed to fetch high scores:', err.message);
        // Use local fallback
        gameState.highScores = JSON.parse(localStorage.getItem('cookingHighScores') || '[]');
        renderHighScores();
        return gameState.highScores;
    }
}

async function startGameSession(recipeId) {
    try {
        const result = await apiRequest('/api/minigame/cooking/start', 'POST', { recipe_id: recipeId });
        gameState.gameSessionId = result.session_id;
        return result;
    } catch (err) {
        console.warn('Failed to start session, using local:', err.message);
        gameState.gameSessionId = 'local-' + Date.now();
        return { session_id: gameState.gameSessionId };
    }
}

async function completeGameSession(success, accuracy, score) {
    try {
        const result = await apiRequest('/api/minigame/cooking/complete', 'POST', {
            session_id: gameState.gameSessionId,
            success: success,
            accuracy: accuracy,
            score: score,
            recipe_id: gameState.currentRecipe.id
        });
        return result;
    } catch (err) {
        console.warn('Failed to complete session:', err.message);
        // Local fallback - update localStorage
        saveLocalScore(gameState.currentRecipe.id, score, success);
        return { success, coins_earned: score };
    }
}

function saveLocalScore(recipeId, score, completed) {
    const scores = JSON.parse(localStorage.getItem('cookingHighScores') || '[]');
    scores.push({
        recipe_id: recipeId,
        score: score,
        completed: completed,
        date: new Date().toISOString()
    });
    scores.sort((a, b) => b.score - a.score);
    localStorage.setItem('cookingHighScores', JSON.stringify(scores.slice(0, 10)));
}

// ==================== UI FUNCTIONS ====================

function updateCoinsDisplay() {
    elements.playerCoins.textContent = gameState.playerCoins.toLocaleString();
}

function renderRecipes() {
    elements.recipeSelection.innerHTML = '';
    
    Object.values(RECIPES).forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'recipe-card';
        card.dataset.recipeId = recipe.id;
        card.innerHTML = `
            <span class="recipe-emoji">${recipe.emoji}</span>
            <div class="recipe-name">${recipe.name}</div>
            <div class="recipe-info">${recipe.ingredients.length} ingredients • ${recipe.timeLimit / 1000}s</div>
            <div class="recipe-reward">🪙 ${recipe.baseReward} coins</div>
        `;
        
        card.addEventListener('click', () => selectRecipe(recipe.id));
        elements.recipeSelection.appendChild(card);
    });
}

function renderHighScores() {
    if (!gameState.highScores || gameState.highScores.length === 0) {
        elements.scoreList.innerHTML = '<li class="score-item">No scores yet - play to record your best!</li>';
        return;
    }
    
    elements.scoreList.innerHTML = gameState.highScores
        .slice(0, 5)
        .map((score, index) => {
            const recipe = RECIPES[score.recipe_id] || { name: 'Unknown', emoji: '❓' };
            return `
                <li class="score-item ${score.highlight ? 'highlight' : ''}">
                    <span>#${index + 1} ${recipe.emoji} ${recipe.name}</span>
                    <span>🪙 ${score.score}</span>
                </li>
            `;
        })
        .join('');
}

function selectRecipe(recipeId) {
    gameState.currentRecipe = RECIPES[recipeId];
    
    // Update UI
    document.querySelectorAll('.recipe-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.recipeId === recipeId);
    });
    
    elements.startBtn.disabled = false;
}

function showScreen(screenName) {
    elements.menuScreen.style.display = 'none';
    elements.gameScreen.style.display = 'none';
    elements.resultScreen.style.display = 'none';
    elements.loading.style.display = 'none';
    
    switch (screenName) {
        case 'menu':
            elements.menuScreen.style.display = 'block';
            break;
        case 'game':
            elements.gameScreen.style.display = 'block';
            break;
        case 'result':
            elements.resultScreen.style.display = 'block';
            break;
        case 'loading':
            elements.loading.style.display = 'block';
            break;
    }
}

function renderIngredientSlots() {
    elements.ingredientsList.innerHTML = '';
    
    gameState.currentRecipe.ingredients.forEach((ing, index) => {
        const slot = document.createElement('div');
        slot.className = 'ingredient-slot';
        slot.dataset.index = index;
        slot.textContent = '?';
        slot.title = '???';
        elements.ingredientsList.appendChild(slot);
    });
}

function updateIngredientSlots() {
    const slots = elements.ingredientsList.querySelectorAll('.ingredient-slot');
    
    slots.forEach((slot, index) => {
        const ing = gameState.currentRecipe.ingredients[index];
        const collected = gameState.collectedIngredients.includes(ing.id);
        const isCurrent = index === gameState.collectedIngredients.length;
        
        slot.classList.remove('collected', 'current');
        
        if (collected) {
            slot.classList.add('collected');
            slot.textContent = ing.emoji;
            slot.title = ing.name;
        } else if (isCurrent) {
            slot.classList.add('current');
            slot.textContent = '?';
            slot.title = 'Next needed';
        } else {
            slot.textContent = '?';
            slot.title = '???';
        }
    });
    
    elements.progressCount.textContent = 
        `${gameState.collectedIngredients.length}/${gameState.currentRecipe.ingredients.length}`;
}

// ==================== GAME LOGIC ====================

function startGame() {
    if (!gameState.currentRecipe) return;
    
    // Reset game state
    gameState.collectedIngredients = [];
    gameState.fallingIngredients = [];
    gameState.timeRemaining = gameState.currentRecipe.timeLimit;
    gameState.score = 0;
    gameState.accuracy = 0;
    
    // Start session on server
    startGameSession(gameState.currentRecipe.id);
    
    // Update UI
    elements.currentRecipe.textContent = gameState.currentRecipe.name;
    elements.cookingSection.style.display = 'none';
    renderIngredientSlots();
    updateIngredientSlots();
    
    showScreen('game');
    
    // Start canvas rendering
    initCanvas();
    startCollectingPhase();
}

function initCanvas() {
    canvas = elements.canvas;
    ctx = canvas.getContext('2d');
    
    // Handle canvas resizing
    const resizeCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Click handler for collecting ingredients
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('touchstart', handleCanvasTouch);
}

function handleCanvasClick(e) {
    if (gameState.gamePhase !== 'collecting') return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    checkIngredientClick(x, y);
}

function handleCanvasTouch(e) {
    e.preventDefault();
    if (gameState.gamePhase !== 'collecting') return;
    
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    
    checkIngredientClick(x, y);
}

function checkIngredientClick(x, y) {
    const clickRadius = 40;
    
    for (let i = gameState.fallingIngredients.length - 1; i >= 0; i--) {
        const ing = gameState.fallingIngredients[i];
        const dx = x - ing.x;
        const dy = y - ing.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < clickRadius) {
            onIngredientClicked(ing, i);
            break;
        }
    }
}

function onIngredientClicked(ingredient, index) {
    const nextNeeded = gameState.currentRecipe.ingredients[gameState.collectedIngredients.length];
    
    if (ingredient.id === nextNeeded.id) {
        // Correct ingredient!
        gameState.collectedIngredients.push(ingredient.id);
        gameState.fallingIngredients.splice(index, 1);
        updateIngredientSlots();
        
        // Check if all ingredients collected
        if (gameState.collectedIngredients.length >= gameState.currentRecipe.ingredients.length) {
            endCollectingPhase();
        }
    } else {
        // Wrong ingredient - penalty
        gameState.timeRemaining = Math.max(0, gameState.timeRemaining - 1000);
        showFeedback('❌', ingredient.x, ingredient.y, '#e74c3c');
    }
}

function showFeedback(emoji, x, y, color) {
    const feedback = {
        emoji,
        x,
        y,
        color,
        life: 30
    };
    // Add to game state for rendering
    if (!gameState.feedbacks) gameState.feedbacks = [];
    gameState.feedbacks.push(feedback);
}

function startCollectingPhase() {
    gameState.gamePhase = 'collecting';
    lastTime = performance.now();
    
    // Start timer
    gameIntervalId = setInterval(() => {
        gameState.timeRemaining -= 100;
        elements.gameTimer.textContent = (gameState.timeRemaining / 1000).toFixed(1) + 's';
        
        if (gameState.timeRemaining <= 3000) {
            elements.gameTimer.classList.add('warning');
        }
        
        if (gameState.timeRemaining <= 0) {
            endGame(false, 'Time\'s up!');
        }
    }, 100);
    
    // Start animation loop
    requestAnimationFrame(gameLoop);
    
    // Spawn ingredients
    spawnIngredient();
}

function spawnIngredient() {
    if (gameState.gamePhase !== 'collecting') return;
    
    const neededIngredient = gameState.currentRecipe.ingredients[gameState.collectedIngredients.length];
    const isNeeded = Math.random() < 0.3; // 30% chance to spawn needed ingredient
    
    let ingredient;
    if (isNeeded) {
        ingredient = { ...neededIngredient };
    } else {
        // Random wrong ingredient
        const wrongIngredients = ALL_INGREDIENTS.filter(i => i.id !== neededIngredient.id);
        ingredient = { ...wrongIngredients[Math.floor(Math.random() * wrongIngredients.length)] };
    }
    
    ingredient.x = Math.random() * (canvas.width - 60) + 30;
    ingredient.y = -40;
    ingredient.vx = (Math.random() - 0.5) * 2;
    ingredient.vy = 2 + Math.random() * 2;
    ingredient.rotation = Math.random() * Math.PI * 2;
    ingredient.rotationSpeed = (Math.random() - 0.5) * 0.1;
    
    gameState.fallingIngredients.push(ingredient);
    
    // Schedule next spawn
    const spawnDelay = 800 + Math.random() * 1000;
    setTimeout(spawnIngredient, spawnDelay);
}

function gameLoop(currentTime) {
    if (gameState.gamePhase !== 'collecting') return;
    
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Update ingredients
    updateIngredients();
    
    // Render
    render();
    
    requestAnimationFrame(gameLoop);
}

function updateIngredients() {
    const gravity = 0.1;
    
    gameState.fallingIngredients = gameState.fallingIngredients.filter(ing => {
        ing.vy += gravity;
        ing.x += ing.vx;
        ing.y += ing.vy;
        ing.rotation += ing.rotationSpeed;
        
        // Bounce off walls
        if (ing.x < 20 || ing.x > canvas.width - 20) {
            ing.vx *= -0.8;
            ing.x = Math.max(20, Math.min(canvas.width - 20, ing.x));
        }
        
        // Remove if off screen
        return ing.y < canvas.height + 50;
    });
    
    // Update feedbacks
    if (gameState.feedbacks) {
        gameState.feedbacks = gameState.feedbacks.filter(f => {
            f.y -= 1;
            f.life--;
            return f.life > 0;
        });
    }
}

function render() {
    // Clear canvas
    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }
    
    // Draw ingredients
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    gameState.fallingIngredients.forEach(ing => {
        ctx.save();
        ctx.translate(ing.x, ing.y);
        ctx.rotate(ing.rotation);
        
        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillText(ing.emoji, 3, 3);
        
        // Emoji
        ctx.fillStyle = '#fff';
        ctx.fillText(ing.emoji, 0, 0);
        
        ctx.restore();
    });
    
    // Draw feedbacks
    if (gameState.feedbacks) {
        ctx.font = '24px Arial';
        gameState.feedbacks.forEach(f => {
            ctx.fillStyle = f.color;
            ctx.globalAlpha = f.life / 30;
            ctx.fillText(f.emoji, f.x, f.y);
            ctx.globalAlpha = 1;
        });
    }
}

function endCollectingPhase() {
    gameState.gamePhase = 'cooking';
    clearInterval(gameIntervalId);
    elements.gameTimer.classList.remove('warning');
    
    // Show cooking bar
    elements.cookingSection.style.display = 'block';
    
    // Start cooking minigame
    startCookingMinigame();
}

function startCookingMinigame() {
    gameState.cookingNeedlePosition = 0;
    gameState.cookingNeedleDirection = 1;
    gameState.cookingNeedleSpeed = 1.5 + (gameState.currentRecipe.difficulty === 'hard' ? 1 : 0.5);
    
    const updateNeedle = () => {
        if (gameState.gamePhase !== 'cooking') return;
        
        gameState.cookingNeedlePosition += gameState.cookingNeedleSpeed * gameState.cookingNeedleDirection;
        
        if (gameState.cookingNeedlePosition >= 100) {
            gameState.cookingNeedlePosition = 100;
            gameState.cookingNeedleDirection = -1;
        } else if (gameState.cookingNeedlePosition <= 0) {
            gameState.cookingNeedlePosition = 0;
            gameState.cookingNeedleDirection = 1;
        }
        
        elements.cookingNeedle.style.left = gameState.cookingNeedlePosition + '%';
    };
    
    cookingIntervalId = setInterval(updateNeedle, 16); // ~60fps
}

function onCookingClick() {
    if (gameState.gamePhase !== 'cooking') return;
    
    clearInterval(cookingIntervalId);
    
    // Calculate accuracy (green zone is 45-55%)
    const position = gameState.cookingNeedlePosition;
    const greenStart = 45;
    const greenEnd = 55;
    const greenCenter = 50;
    
    if (position >= greenStart && position <= greenEnd) {
        // In green zone
        const distanceFromCenter = Math.abs(position - greenCenter);
        gameState.accuracy = 100 - (distanceFromCenter * 10);
        endGame(true, 'Perfect cooking!');
    } else if (position >= 40 && position <= 60) {
        // Close (yellow zone)
        gameState.accuracy = 60 + (10 - Math.abs(position - 50));
        endGame(true, 'Good job!');
    } else {
        // Missed (red zone)
        gameState.accuracy = Math.max(0, 40 - Math.abs(position - 50) * 2);
        endGame(false, 'Burnt the food!');
    }
}

async function endGame(success, message) {
    gameState.gamePhase = 'result';
    clearInterval(gameIntervalId);
    clearInterval(cookingIntervalId);
    
    // Calculate final score
    const recipe = gameState.currentRecipe;
    let score = 0;
    
    if (success) {
        const timeBonus = Math.floor(gameState.timeRemaining / 1000) * 2;
        const accuracyBonus = Math.floor(gameState.accuracy / 10) * 2;
        score = recipe.baseReward + timeBonus + accuracyBonus;
    }
    
    gameState.score = score;
    
    // Send results to server
    const result = await completeGameSession(success, gameState.accuracy, score);
    
    // Update coins
    if (result.coins_earned) {
        gameState.playerCoins += result.coins_earned;
        updateCoinsDisplay();
    }
    
    // Show result screen
    showResultScreen(success, message, score, result.coins_earned || score);
}

function showResultScreen(success, message, score, coinsEarned) {
    const recipe = gameState.currentRecipe;
    
    elements.resultEmoji.textContent = success ? recipe.emoji : '💨';
    elements.resultTitle.textContent = success ? 'Delicious!' : 'Oh no!';
    elements.resultTitle.className = 'result-title ' + (success ? 'success' : 'failure');
    elements.resultMessage.textContent = message;
    elements.resultReward.textContent = success ? `+${coinsEarned} coins` : 'No reward this time';
    
    showScreen('result');
}

// ==================== EVENT LISTENERS ====================

elements.startBtn.addEventListener('click', startGame);

elements.cookingBtn.addEventListener('click', onCookingClick);

elements.playAgainBtn.addEventListener('click', () => {
    showScreen('menu');
    elements.startBtn.disabled = true;
    document.querySelectorAll('.recipe-card').forEach(c => c.classList.remove('selected'));
    gameState.currentRecipe = null;
});

elements.backToMenuBtn.addEventListener('click', () => {
    showScreen('menu');
    fetchHighScores(); // Refresh scores
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState.gamePhase === 'cooking') {
        e.preventDefault();
        onCookingClick();
    }
});

// ==================== INITIALIZATION ====================

async function init() {
    renderRecipes();
    showScreen('loading');
    
    try {
        await fetchPlayerProfile();
        await fetchHighScores();
    } catch (err) {
        console.error('Initialization error:', err);
    }
    
    showScreen('menu');
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
