export class GameMap {
    constructor(seed, width = 100, height = 100) {
        this.seed = seed;
        this.width = width;
        this.height = height;
        this.tileSize = 32;
        this.tiles = [];
        this.spawnPoint = { x: 0, y: 0 };
        this.init();
    }

    init() {
        this.generateMap();
        this.createSpawnArea();
    }

    generateMap() {
        this.tiles = [];
        
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                const tileType = this.getTileType(x, y);
                this.tiles[y][x] = {
                    type: tileType,
                    collision: this.isCollidable(tileType),
                    elevation: this.getElevation(x, y),
                    waterLevel: 0,
                    vegetation: this.getVegetation(x, y),
                    buildable: this.isBuildable(tileType),
                    farmable: this.isFarmable(tileType),
                    explored: false
                };
            }
        }
    }

    getTileType(x, y) {
        const noise = this.noise(x, y);
        
        if (noise < 0.2) return 'water';
        if (noise < 0.25) return 'sand';
        if (noise < 0.45) return 'grass';
        if (noise < 0.7) return 'forest';
        if (noise < 0.85) return 'rock';
        return 'mountain';
    }

    noise(x, y) {
        let n = 0;
        n += this.simplexNoise(x / 50, y / 50) * 0.5;
        n += this.simplexNoise(x / 25, y / 25) * 0.25;
        n += this.simplexNoise(x / 10, y / 10) * 0.125;
        n += this.simplexNoise(x / 5, y / 5) * 0.125;
        return (n + 1) / 2;
    }

    simplexNoise(x, y) {
        const n = Math.sin(x * 0.1 + this.seed) + Math.cos(y * 0.1 + this.seed);
        const m = Math.sin(x * 0.05 - y * 0.05) + Math.cos(x * 0.03 + y * 0.03);
        return (n + m) / 4;
    }

    isCollidable(tileType) {
        return tileType === 'water' || tileType === 'rock' || tileType === 'mountain';
    }

    isBuildable(tileType) {
        return tileType === 'grass' || tileType === 'sand';
    }

    isFarmable(tileType) {
        return tileType === 'grass';
    }

    getElevation(x, y) {
        const noise = this.noise(x, y);
        return Math.floor(noise * 5);
    }

    getVegetation(x, y) {
        const noise = this.noise(x + 1000, y + 1000);
        if (noise > 0.4 && noise < 0.7) {
            const rand = Math.random();
            if (rand < 0.3) return 'tree';
            if (rand < 0.5) return 'bush';
        }
        return null;
    }

    createSpawnArea() {
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        const spawnRadius = 3;
        
        for (let dy = -spawnRadius; dy <= spawnRadius; dy++) {
            for (let dx = -spawnRadius; dx <= spawnRadius; dx++) {
                const x = centerX + dx;
                const y = centerY + dy;
                
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.tiles[y][x].type = 'grass';
                    this.tiles[y][x].collision = false;
                    this.tiles[y][x].buildable = true;
                    this.tiles[y][x].farmable = true;
                    this.tiles[y][x].vegetation = null;
                }
            }
        }
        
        this.createFarmPlot(centerX - 1, centerY - 1);
        this.createFarmPlot(centerX + 1, centerY - 1);
        this.createFarmPlot(centerX - 1, centerY + 1);
        this.createFarmPlot(centerX + 1, centerY + 1);
        
        this.spawnPoint = {
            x: centerX * this.tileSize + this.tileSize / 2,
            y: centerY * this.tileSize + this.tileSize / 2
        };
    }

    createFarmPlot(x, y) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.tiles[y][x].farmable = true;
            this.tiles[y][x].type = 'farmland';
        }
    }

    getTile(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return null;
        }
        return this.tiles[y]?.[x] || null;
    }

    render(ctx, camera) {
        const startTileX = Math.floor((camera.x - ctx.canvas.width / 2 / camera.zoom) / this.tileSize) - 1;
        const endTileX = Math.floor((camera.x + ctx.canvas.width / 2 / camera.zoom) / this.tileSize) + 1;
        const startTileY = Math.floor((camera.y - ctx.canvas.height / 2 / camera.zoom) / this.tileSize) - 1;
        const endTileY = Math.floor((camera.y + ctx.canvas.height / 2 / camera.zoom) / this.tileSize) + 1;
        
        for (let ty = startTileY; ty <= endTileY; ty++) {
            for (let tx = startTileX; tx <= endTileX; tx++) {
                const tile = this.getTile(tx, ty);
                if (!tile) continue;
                
                const screenX = tx * this.tileSize;
                const screenY = ty * this.tileSize;
                
                this.renderTile(ctx, tile, screenX, screenY);
            }
        }
    }

    renderTile(ctx, tile, x, y) {
        const colors = {
            water: 'rgba(30, 144, 255, 0.9)',
            sand: 'rgba(244, 164, 96, 0.85)',
            grass: 'rgba(34, 139, 34, 0.3)',
            forest: 'rgba(34, 139, 34, 0.5)',
            rock: 'rgba(128, 128, 128, 0.9)',
            mountain: 'rgba(105, 105, 105, 0.9)',
            farmland: 'rgba(205, 133, 63, 0.8)'
        };
        
        ctx.fillStyle = colors[tile.type] || 'rgba(50, 50, 50, 0.5)';
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        ctx.strokeStyle = 'rgba(26, 26, 26, 0.3)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, this.tileSize, this.tileSize);
        
        if (tile.vegetation) {
            this.renderVegetation(ctx, tile.vegetation, x, y);
        }
        
        if (tile.type === 'farmland') {
            this.renderFarmland(ctx, x, y);
        }
    }

    renderVegetation(ctx, vegetation, x, y) {
        ctx.save();
        
        if (vegetation === 'tree') {
            ctx.fillStyle = '#228b22';
            ctx.beginPath();
            ctx.moveTo(x + this.tileSize / 2, y + 4);
            ctx.lineTo(x + this.tileSize - 8, y + this.tileSize - 8);
            ctx.lineTo(x + 8, y + this.tileSize - 8);
            ctx.closePath();
            ctx.fill();
            
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(x + this.tileSize / 2 - 3, y + this.tileSize - 8, 6, 8);
        } else if (vegetation === 'bush') {
            ctx.fillStyle = '#32cd32';
            ctx.beginPath();
            ctx.arc(x + this.tileSize / 2, y + this.tileSize - 8, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    renderFarmland(ctx, x, y) {
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(x, y + this.tileSize / 3);
        ctx.lineTo(x + this.tileSize, y + this.tileSize / 3);
        ctx.moveTo(x, y + (this.tileSize * 2) / 3);
        ctx.lineTo(x + this.tileSize, y + (this.tileSize * 2) / 3);
        ctx.moveTo(x + this.tileSize / 3, y);
        ctx.lineTo(x + this.tileSize / 3, y + this.tileSize);
        ctx.moveTo(x + (this.tileSize * 2) / 3, y);
        ctx.lineTo(x + (this.tileSize * 2) / 3, y + this.tileSize);
        ctx.stroke();
    }

    renderMiniMap(ctx) {
        const miniMapWidth = ctx.canvas.width;
        const miniMapHeight = ctx.canvas.height;
        
        const scaleX = miniMapWidth / this.width;
        const scaleY = miniMapHeight / this.height;
        const scale = Math.min(scaleX, scaleY);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (!tile) continue;
                
                const colors = {
                    water: '#1e90ff',
                    sand: '#f4a460',
                    grass: '#228b22',
                    forest: '#006400',
                    rock: '#808080',
                    mountain: '#696969',
                    farmland: '#cd853f'
                };
                
                ctx.fillStyle = colors[tile.type] || '#333';
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }

    update(deltaTime) {
    }

    getSpawnPoint() {
        return { ...this.spawnPoint };
    }

    getSize() {
        return { width: this.width * this.tileSize, height: this.height * this.tileSize };
    }
}