import { CanvasEngine } from '../engine/CanvasEngine.js';
import { GameStore } from '../store/GameStore.js';
import { ResourceLoader } from '../loader/ResourceLoader.js';
import { SaveManager } from '../save/SaveManager.js';
import { Player } from '../entity/Player.js';
import { GameMap } from '../map/GameMap.js';

export class Game {
    constructor() {
        this.canvasEngine = null;
        this.gameStore = null;
        this.resourceLoader = null;
        this.saveManager = null;
        this.player = null;
        this.map = null;
        this.miniMapCanvas = null;
        this.miniMapCtx = null;
        this.isInitialized = false;
        this.isGameStarted = false;
        this.hudElements = {};
        this.init();
    }

    async init() {
        this.canvasEngine = new CanvasEngine('game-canvas');
        this.gameStore = new GameStore();
        this.resourceLoader = new ResourceLoader();
        this.saveManager = new SaveManager();
        
        this.miniMapCanvas = document.getElementById('mini-map-canvas');
        this.miniMapCanvas.width = 140;
        this.miniMapCanvas.height = 140;
        this.miniMapCtx = this.miniMapCanvas.getContext('2d');
        
        this.setupHUD();
        this.setupEventListeners();
        this.setupStoreSubscriptions();
        
        await this.preloadResources();
        this.showStartScreen();
        this.isInitialized = true;
    }

    async preloadResources() {
        this.resourceLoader.addResource('json', 'gameConfig', 'data/gameConfig.json');
        this.resourceLoader.addResource('json', 'items', 'data/items.json');
        
        await this.resourceLoader.loadAll(
            (progress) => {
                this.updateLoadingProgress(progress);
            },
            () => {
                console.log('All resources loaded');
            }
        );
    }

    updateLoadingProgress(progress) {
        const loadingBar = document.getElementById('loading-bar');
        const loadingText = document.getElementById('loading-text');
        if (loadingBar) loadingBar.style.width = `${progress}%`;
        if (loadingText) loadingText.textContent = `加载中... ${progress}%`;
    }

    setupHUD() {
        this.hudElements = {
            health: document.getElementById('health-value'),
            hunger: document.getElementById('hunger-value'),
            thirst: document.getElementById('thirst-value'),
            stamina: document.getElementById('stamina-value')
        };
    }

    setupEventListeners() {
        document.getElementById('new-game-btn')?.addEventListener('click', () => this.startNewGame());
        document.getElementById('load-game-btn')?.addEventListener('click', () => this.showLoadMenu());
        document.getElementById('resume-btn')?.addEventListener('click', () => this.resumeGame());
        document.getElementById('save-game-btn')?.addEventListener('click', () => this.saveGame());
        document.getElementById('quit-btn')?.addEventListener('click', () => this.quitToMenu());
        
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isGameStarted) {
                this.togglePause();
            }
        });
    }

    setupStoreSubscriptions() {
        this.gameStore.subscribe((state) => {
            this.updateHUD(state.player);
        });
    }

    updateHUD(player) {
        if (this.hudElements.health) this.hudElements.health.textContent = Math.round(player.health);
        if (this.hudElements.hunger) this.hudElements.hunger.textContent = Math.round(player.hunger);
        if (this.hudElements.thirst) this.hudElements.thirst.textContent = Math.round(player.thirst);
        if (this.hudElements.stamina) this.hudElements.stamina.textContent = Math.round(player.stamina);
    }

    showStartScreen() {
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('pause-menu').style.display = 'none';
    }

    showLoadingScreen() {
        document.getElementById('loading-screen').style.display = 'flex';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('pause-menu').style.display = 'none';
    }

    hideAllScreens() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('pause-menu').style.display = 'none';
    }

    async startNewGame() {
        this.showLoadingScreen();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.gameStore.actions.resetGame();
        
        const seed = Date.now();
        this.map = new GameMap(seed);
        this.gameStore.actions.setMapSeed(seed);
        
        const spawnPoint = this.map.getSpawnPoint();
        this.player = new Player(spawnPoint.x - 16, spawnPoint.y - 24, this.gameStore);
        this.gameStore.actions.setSpawnPoint(spawnPoint.x, spawnPoint.y);
        
        this.canvasEngine.renderables = [];
        this.canvasEngine.addRenderable({
            update: (deltaTime) => this.map.update(deltaTime),
            render: (ctx) => this.map.render(ctx, this.canvasEngine.camera)
        });
        this.canvasEngine.addRenderable({
            update: (deltaTime) => this.player.update(deltaTime, this.map),
            render: (ctx) => this.player.render(ctx)
        });
        
        this.canvasEngine.setCameraPosition(spawnPoint.x, spawnPoint.y);
        this.canvasEngine.start();
        
        this.saveManager.startAutoSave(() => this.gameStore.getStateSnapshot());
        
        this.hideAllScreens();
        this.isGameStarted = true;
        
        this.startGameLoop();
    }

    startGameLoop() {
        this.gameLoop();
    }

    gameLoop() {
        if (!this.isGameStarted) return;
        
        this.updateMiniMap();
        
        if (!this.gameStore.getState().game.isPaused) {
            this.updateWorld();
        }
        
        requestAnimationFrame(() => this.gameLoop());
    }

    updateWorld() {
        const state = this.gameStore.getState();
        
        if (state.player.health <= 0) {
            this.gameOver();
            return;
        }
    }

    updateMiniMap() {
        if (!this.miniMapCtx || !this.map) return;
        
        this.miniMapCtx.clearRect(0, 0, this.miniMapCanvas.width, this.miniMapCanvas.height);
        
        this.map.renderMiniMap(this.miniMapCtx);
        
        const playerTileX = Math.floor(this.player.x / this.map.tileSize);
        const playerTileY = Math.floor(this.player.y / this.map.tileSize);
        
        const scale = Math.min(
            this.miniMapCanvas.width / this.map.width,
            this.miniMapCanvas.height / this.map.height
        );
        
        this.miniMapCtx.fillStyle = '#ff0000';
        this.miniMapCtx.beginPath();
        this.miniMapCtx.arc(
            playerTileX * scale + scale / 2,
            playerTileY * scale + scale / 2,
            scale / 2,
            0,
            Math.PI * 2
        );
        this.miniMapCtx.fill();
    }

    togglePause() {
        const isPaused = !this.gameStore.getState().game.isPaused;
        this.gameStore.actions.setGamePaused(isPaused);
        
        if (isPaused) {
            this.canvasEngine.stop();
            document.getElementById('pause-menu').style.display = 'flex';
        } else {
            document.getElementById('pause-menu').style.display = 'none';
            this.canvasEngine.start();
        }
    }

    resumeGame() {
        this.togglePause();
    }

    saveGame() {
        const state = this.gameStore.getState();
        const result = this.saveManager.saveGame(0, state);
        alert(result.message);
    }

    quitToMenu() {
        this.isGameStarted = false;
        this.canvasEngine.stop();
        this.saveManager.stopAutoSave();
        this.showStartScreen();
    }

    showLoadMenu() {
        const saves = this.saveManager.getAllSaves();
        let menuHtml = '<div class="modal"><h3>选择存档</h3>';
        
        saves.forEach((save, index) => {
            if (save.timestamp) {
                menuHtml += `<button onclick="game.loadGameFromSlot(${index})">存档 ${index + 1}: ${this.saveManager.formatGameTime(save.day, save.time)}</button>`;
            } else {
                menuHtml += `<button disabled style="opacity: 0.5">存档 ${index + 1}: 空</button>`;
            }
        });
        
        menuHtml += '<button onclick="game.closeModal()">取消</button></div>';
        
        const modal = document.createElement('div');
        modal.innerHTML = menuHtml;
        modal.id = 'save-menu-modal';
        document.body.appendChild(modal);
    }

    closeModal() {
        const modal = document.getElementById('save-menu-modal');
        if (modal) modal.remove();
    }

    async loadGameFromSlot(slot) {
        this.closeModal();
        this.showLoadingScreen();
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = this.saveManager.loadGame(slot);
        
        if (!result.success) {
            alert(result.message);
            this.showStartScreen();
            return;
        }
        
        this.gameStore.actions.loadGame(result.data);
        
        const savedState = result.data;
        
        this.map = new GameMap(savedState.map.seed);
        this.player = new Player(savedState.player.x, savedState.player.y, this.gameStore);
        
        this.canvasEngine.renderables = [];
        this.canvasEngine.addRenderable({
            update: (deltaTime) => this.map.update(deltaTime),
            render: (ctx) => this.map.render(ctx, this.canvasEngine.camera)
        });
        this.canvasEngine.addRenderable({
            update: (deltaTime) => this.player.update(deltaTime, this.map),
            render: (ctx) => this.player.render(ctx)
        });
        
        this.canvasEngine.setCameraPosition(savedState.player.x, savedState.player.y);
        this.canvasEngine.start();
        
        this.saveManager.startAutoSave(() => this.gameStore.getStateSnapshot());
        
        this.hideAllScreens();
        this.isGameStarted = true;
        
        this.startGameLoop();
    }

    gameOver() {
        this.isGameStarted = false;
        this.canvasEngine.stop();
        alert('游戏结束！');
        this.quitToMenu();
    }

    destroy() {
        this.saveManager.stopAutoSave();
        this.canvasEngine?.destroy();
        this.player?.destroy();
    }
}