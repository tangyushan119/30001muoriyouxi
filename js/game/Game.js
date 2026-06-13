import { CanvasEngine } from '../engine/CanvasEngine.js';
import { GameStore } from '../store/GameStore.js';
import { ResourceLoader } from '../loader/ResourceLoader.js';
import { SaveManager } from '../save/SaveManager.js';
import { Player } from '../entity/Player.js';
import { GameMap } from '../map/GameMap.js';
import { ResourceEntity } from '../entity/ResourceEntity.js';

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
        this.resourceEntities = [];
        this.nearbyResources = [];
        this.currentInteractionTarget = null;
        this.isHarvesting = false;
        this.harvestingEntity = null;
        this.init();
    }

    async init() {
        try {
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
            this.isInitialized = true;
            
            this.tryAutoLoadGame();
        } catch (error) {
            console.error('Game initialization failed:', error);
            this.showStartScreen();
        }
    }
    
    async tryAutoLoadGame() {
        const saves = this.saveManager.getAllSaves();
        const latestSave = saves.find(s => s.timestamp !== null);
        
        if (latestSave) {
            await this.loadGameFromSlot(latestSave.slot);
        } else {
            this.showStartScreen();
        }
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
            
            if (e.key === 'e' || e.key === 'E') {
                this.handleInteraction();
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
        
        try {
            this.gameStore.actions.resetGame();
            
            const seed = Date.now();
            this.map = new GameMap(seed);
            this.gameStore.actions.setMapSeed(seed);
            
            const spawnPoint = this.map.getSpawnPoint();
            
            this.initResourceEntities();
            
            this.player = new Player(spawnPoint.x - 16, spawnPoint.y - 24, this.gameStore);
            this.gameStore.actions.setSpawnPoint(spawnPoint.x, spawnPoint.y);
            
            this.setupRenderables();
            
            this.canvasEngine.setCameraPosition(spawnPoint.x, spawnPoint.y);
            this.canvasEngine.start();
            
            this.saveManager.startAutoSave(() => this.gameStore.getStateSnapshot());
            
            this.hideAllScreens();
            this.isGameStarted = true;
            
            this.startGameLoop();
        } catch (error) {
            console.error('Failed to start new game:', error);
            alert('启动游戏失败，请重试');
            this.showStartScreen();
        }
    }
    
    setupRenderables() {
        this.canvasEngine.renderables = [];
        
        this.canvasEngine.addRenderable({
            update: (deltaTime) => this.map.update(deltaTime),
            render: (ctx) => this.map.render(ctx, this.canvasEngine.camera)
        });
        
        this.canvasEngine.addRenderable({
            update: (deltaTime) => this.updateResourceEntities(deltaTime),
            render: (ctx) => this.renderResourceEntities(ctx)
        });
        
        this.canvasEngine.addRenderable({
            update: (deltaTime) => this.player.update(deltaTime, this.map),
            render: (ctx) => this.player.render(ctx)
        });
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
        
        this.checkNearbyResources();
        this.updateInteractionPrompt();
    }

    initResourceEntities() {
        this.resourceEntities = [];
        const mapEntities = this.map.getResourceEntities();
        
        mapEntities.forEach(entityData => {
            const entity = new ResourceEntity(entityData.x, entityData.y, entityData.type, this.map.tileSize);
            this.resourceEntities.push(entity);
        });
    }

    updateResourceEntities(deltaTime) {
        this.resourceEntities.forEach(entity => {
            entity.update(deltaTime);
            
            if (entity.isHarvestComplete()) {
                const item = entity.completeHarvest();
                if (item) {
                    this.gameStore.actions.addInventoryItem(item);
                }
                this.isHarvesting = false;
                this.harvestingEntity = null;
            }
        });
    }

    renderResourceEntities(ctx) {
        const camera = this.canvasEngine.camera;
        const startTileX = Math.floor((camera.x - ctx.canvas.width / 2 / camera.zoom) / this.map.tileSize) - 1;
        const endTileX = Math.floor((camera.x + ctx.canvas.width / 2 / camera.zoom) / this.map.tileSize) + 1;
        const startTileY = Math.floor((camera.y - ctx.canvas.height / 2 / camera.zoom) / this.map.tileSize) - 1;
        const endTileY = Math.floor((camera.y + ctx.canvas.height / 2 / camera.zoom) / this.map.tileSize) + 1;
        
        this.resourceEntities.forEach(entity => {
            if (entity.tileX >= startTileX && entity.tileX <= endTileX &&
                entity.tileY >= startTileY && entity.tileY <= endTileY) {
                entity.render(ctx);
            }
        });
    }

    checkNearbyResources() {
        if (!this.player || !this.resourceEntities.length) return;
        
        const playerPos = this.player.getPosition();
        const playerCenterX = playerPos.x + this.player.width / 2;
        const playerCenterY = playerPos.y + this.player.height / 2;
        
        this.nearbyResources = this.resourceEntities.filter(entity => {
            return !entity.isDepleted && entity.isNearby(playerCenterX, playerCenterY, 60);
        });
        
        if (this.nearbyResources.length > 0 && !this.isHarvesting) {
            this.nearbyResources.sort((a, b) => {
                const distA = Math.sqrt(
                    Math.pow(a.x - playerCenterX, 2) +
                    Math.pow(a.y - playerCenterY, 2)
                );
                const distB = Math.sqrt(
                    Math.pow(b.x - playerCenterX, 2) +
                    Math.pow(b.y - playerCenterY, 2)
                );
                return distA - distB;
            });
            this.currentInteractionTarget = this.nearbyResources[0];
        } else {
            this.currentInteractionTarget = null;
        }
    }

    handleInteraction() {
        if (!this.isGameStarted || this.isHarvesting) return;
        
        if (this.currentInteractionTarget && !this.currentInteractionTarget.isDepleted && !this.currentInteractionTarget.isHarvesting) {
            this.startHarvest(this.currentInteractionTarget);
        }
    }

    startHarvest(entity) {
        if (entity.isDepleted || entity.isHarvesting) return;
        
        this.isHarvesting = true;
        this.harvestingEntity = entity;
        entity.startHarvest();
    }

    updateInteractionPrompt() {
        const promptElement = document.getElementById('interaction-prompt');
        
        if (this.currentInteractionTarget && !this.currentInteractionTarget.isDepleted && !this.isHarvesting) {
            const prompt = this.currentInteractionTarget.getInteractionPrompt();
            if (promptElement) {
                promptElement.innerHTML = `<span class="key">${prompt.key}</span> ${prompt.action}`;
                promptElement.style.display = 'block';
                
                const playerPos = this.player.getPosition();
                promptElement.style.left = `${playerPos.x + this.player.width / 2 - promptElement.offsetWidth / 2}px`;
                promptElement.style.top = `${playerPos.y - 30}px`;
            }
        } else if (promptElement) {
            promptElement.style.display = 'none';
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
        
        try {
            const result = this.saveManager.loadGame(slot);
            
            if (!result.success) {
                alert(result.message);
                this.showStartScreen();
                return;
            }
            
            this.gameStore.actions.loadGame(result.data);
            
            const savedState = result.data;
            
            this.map = new GameMap(savedState.map.seed);
            this.initResourceEntities();
            this.player = new Player(savedState.player.x, savedState.player.y, this.gameStore);
            
            this.setupRenderables();
            
            this.canvasEngine.setCameraPosition(savedState.player.x, savedState.player.y);
            this.canvasEngine.start();
            
            this.saveManager.startAutoSave(() => this.gameStore.getStateSnapshot());
            
            this.hideAllScreens();
            this.isGameStarted = true;
            
            this.startGameLoop();
        } catch (error) {
            console.error('Failed to load game:', error);
            alert('加载存档失败，请重试');
            this.showStartScreen();
        }
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