export class GameMap {
    constructor(seed, width = 100, height = 100) {
        this.seed = seed;
        this.width = width;
        this.height = height;
        this.tileSize = 32;
        this.tiles = [];
        this.spawnPoint = { x: 0, y: 0 };
        this.resourceEntities = [];
        this.init();
    }

    init() {
        this.generateMap();
        this.createSpawnArea();
        this.createResourceEntities();
    }

    generateMap() {
        this.tiles = [];
        this.resourceEntities = [];
        
        for (let y = 0; y < this.height; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.width; x++) {
                const tileType = this.getTileType(x, y);
                this.tiles[y][x] = {
                    type: tileType,
                    collision: this.isCollidable(tileType),
                    elevation: this.getElevation(x, y),
                    waterLevel: 0,
                    vegetation: null,
                    feature: null,
                    buildable: this.isBuildable(tileType),
                    farmable: this.isFarmable(tileType),
                    explored: false
                };
            }
        }
        
        this.generateForestClusters();
        this.generateStreams();
        this.generateDirtRoads();
        this.generateStonePatches();
        this.generatePonds();
        this.generateFlowerPatches();
        this.generateScatteredVegetation();
        this.generateRocks();
        this.generateGrassPatches();
        this.generateBerryBushes();
        this.generateFruitTrees();
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
        return tileType === 'water' || tileType === 'rock' || tileType === 'mountain' || tileType === 'stream';
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

    generateStreams() {
        const streamCount = 5 + Math.floor(Math.random() * 4);
        
        for (let i = 0; i < streamCount; i++) {
            this.createStream();
        }
    }

    createStream() {
        const startX = Math.floor(Math.random() * this.width);
        const startY = Math.floor(Math.random() * this.height);
        
        let x = startX;
        let y = startY;
        let length = 12 + Math.floor(Math.random() * 20);
        
        const direction = Math.random() > 0.5 ? 1 : -1;
        
        for (let i = 0; i < length; i++) {
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' || tile.type === 'dirt' || tile.type === 'stone') {
                    tile.type = 'stream';
                    tile.collision = true;
                    tile.vegetation = null;
                }
            }
            
            const dir = Math.random();
            if (dir < 0.25) x += direction;
            else if (dir < 0.5) x -= direction;
            else if (dir < 0.7) y++;
            else y--;
        }
    }

    generateDirtRoads() {
        const roadCount = 4 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < roadCount; i++) {
            this.createRoad();
        }
    }

    createRoad() {
        const isHorizontal = Math.random() > 0.5;
        const startPos = Math.floor(Math.random() * (isHorizontal ? this.width : this.height));
        const startFixed = Math.floor(Math.random() * (isHorizontal ? this.height : this.width));
        const length = 20 + Math.floor(Math.random() * 30);
        
        for (let i = 0; i < length; i++) {
            const x = isHorizontal ? startPos + i : startFixed;
            const y = isHorizontal ? startFixed : startPos + i;
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' || tile.type === 'stone') {
                    tile.type = 'dirt';
                    tile.collision = false;
                    tile.buildable = false;
                    tile.vegetation = null;
                }
            }
            
            if (i > 0 && i < length - 1 && Math.random() < 0.1) {
                const offsetX = isHorizontal ? 0 : (Math.random() > 0.5 ? 1 : -1);
                const offsetY = isHorizontal ? (Math.random() > 0.5 ? 1 : -1) : 0;
                const sideX = x + offsetX;
                const sideY = y + offsetY;
                
                if (sideX >= 0 && sideX < this.width && sideY >= 0 && sideY < this.height) {
                    const sideTile = this.tiles[sideY][sideX];
                    if (sideTile.type === 'grass') {
                        sideTile.type = 'dirt';
                        sideTile.collision = false;
                        sideTile.buildable = false;
                    }
                }
            }
        }
    }

    generateStonePatches() {
        const stoneCount = 12 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < stoneCount; i++) {
            const centerX = Math.floor(Math.random() * this.width);
            const centerY = Math.floor(Math.random() * this.height);
            const radius = 2 + Math.floor(Math.random() * 3);
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius) {
                        const x = centerX + dx;
                        const y = centerY + dy;
                        
                        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                            const tile = this.tiles[y][x];
                            if (tile.type === 'grass' && Math.random() > 0.4) {
                                tile.type = 'stone';
                                tile.collision = false;
                                tile.buildable = false;
                                tile.vegetation = null;
                            }
                        }
                    }
                }
            }
        }
    }

    generateForestClusters() {
        const clusterCount = 6 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < clusterCount; i++) {
            this.createForestCluster();
        }
    }

    createForestCluster() {
        const centerX = Math.floor(Math.random() * this.width);
        const centerY = Math.floor(Math.random() * this.height);
        const radius = 6 + Math.floor(Math.random() * 8);
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= radius) {
                    const x = centerX + dx;
                    const y = centerY + dy;
                    
                    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                        const tile = this.tiles[y][x];
                        if (tile.type === 'grass') {
                            const rand = Math.random();
                            const density = 1 - dist / radius;
                            
                            if (rand < density * 0.5) {
                                tile.type = 'forest';
                                tile.vegetation = 'tree';
                            } else if (rand < density * 0.7) {
                                tile.type = 'forest';
                                tile.vegetation = 'bush';
                            } else if (rand < density * 0.8) {
                                tile.vegetation = 'bush';
                            }
                        }
                    }
                }
            }
        }
    }

    generateScatteredVegetation() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation) {
                    const rand = Math.random();
                    if (rand < 0.12) {
                        tile.vegetation = Math.random() > 0.35 ? 'tree' : 'bush';
                    }
                }
            }
        }
    }

    generatePonds() {
        const pondCount = 3 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < pondCount; i++) {
            const centerX = Math.floor(Math.random() * this.width);
            const centerY = Math.floor(Math.random() * this.height);
            const radius = 2 + Math.floor(Math.random() * 3);
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius) {
                        const x = centerX + dx;
                        const y = centerY + dy;
                        
                        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                            const tile = this.tiles[y][x];
                            if (tile.type === 'grass') {
                                tile.type = 'water';
                                tile.collision = true;
                                tile.vegetation = null;
                            }
                        }
                    }
                }
            }
        }
    }

    generateFlowerPatches() {
        const patchCount = 10 + Math.floor(Math.random() * 8);
        
        for (let i = 0; i < patchCount; i++) {
            const centerX = Math.floor(Math.random() * this.width);
            const centerY = Math.floor(Math.random() * this.height);
            const radius = 1 + Math.floor(Math.random() * 2);
            
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist <= radius) {
                        const x = centerX + dx;
                        const y = centerY + dy;
                        
                        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                            const tile = this.tiles[y][x];
                            if (tile.type === 'grass' && Math.random() > 0.3) {
                                tile.feature = 'flower_patch';
                            }
                        }
                    }
                }
            }
        }
    }

    generateRocks() {
        const rockCount = 15 + Math.floor(Math.random() * 10);
        
        for (let i = 0; i < rockCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation && !tile.feature) {
                    tile.feature = 'rock';
                }
            }
        }
    }

    createSpawnArea() {
        const centerX = Math.floor(this.width / 2);
        const centerY = Math.floor(this.height / 2);
        const spawnRadius = 4;
        
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
                    this.tiles[y][x].feature = null;
                }
            }
        }
        
        this.createFarmPlot(centerX - 2, centerY - 1);
        this.createFarmPlot(centerX, centerY - 1);
        this.createFarmPlot(centerX + 2, centerY - 1);
        this.createFarmPlot(centerX - 2, centerY + 1);
        this.createFarmPlot(centerX, centerY + 1);
        this.createFarmPlot(centerX + 2, centerY + 1);
        
        this.spawnPoint = {
            x: centerX * this.tileSize + this.tileSize / 2,
            y: centerY * this.tileSize + this.tileSize / 2
        };
        
        this.generateSpawnResources(centerX, centerY);
    }

    generateSpawnResources(centerX, centerY) {
        const resourceRadius = 6;
        
        const treePositions = [
            { dx: -resourceRadius, dy: 0 },
            { dx: resourceRadius, dy: 0 },
            { dx: 0, dy: -resourceRadius },
            { dx: 0, dy: resourceRadius },
            { dx: -resourceRadius + 2, dy: -resourceRadius + 2 },
            { dx: resourceRadius - 2, dy: resourceRadius - 2 }
        ];
        
        treePositions.forEach(pos => {
            const x = centerX + pos.dx;
            const y = centerY + pos.dy;
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass') {
                    tile.vegetation = 'tree';
                }
            }
        });
        
        const rockPositions = [
            { dx: -resourceRadius + 1, dy: resourceRadius },
            { dx: resourceRadius - 1, dy: -resourceRadius },
            { dx: -resourceRadius + 3, dy: resourceRadius - 2 },
            { dx: resourceRadius - 3, dy: -resourceRadius + 2 }
        ];
        
        rockPositions.forEach(pos => {
            const x = centerX + pos.dx;
            const y = centerY + pos.dy;
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation) {
                    tile.feature = 'rock';
                }
            }
        });
        
        const berryPositions = [
            { dx: -resourceRadius + 2, dy: -1 },
            { dx: resourceRadius - 2, dy: 1 },
            { dx: 1, dy: -resourceRadius + 2 },
            { dx: -1, dy: resourceRadius - 2 }
        ];
        
        berryPositions.forEach(pos => {
            const x = centerX + pos.dx;
            const y = centerY + pos.dy;
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation && !tile.feature) {
                    tile.feature = 'berry_bush';
                }
            }
        });
        
        for (let i = 0; i < 8; i++) {
            const dx = Math.floor((Math.random() - 0.5) * resourceRadius * 1.5);
            const dy = Math.floor((Math.random() - 0.5) * resourceRadius * 1.5);
            const x = centerX + dx;
            const y = centerY + dy;
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation && !tile.feature) {
                    tile.feature = 'grass_patch';
                }
            }
        }
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
            water: '#1e6b8a',
            sand: '#d4a574',
            grass: '#5a8f2a',
            forest: '#2d5a1f',
            rock: '#6b6b6b',
            mountain: '#555555',
            farmland: '#b8860b',
            dirt: '#8b7355',
            stone: '#7a7a7a',
            stream: '#2e8b9a'
        };
        
        const baseColor = colors[tile.type] || '#444444';
        
        this.drawTexturedTile(ctx, tile.type, x, y, baseColor);
        
        if (tile.type === 'farmland') {
            this.renderFarmland(ctx, x, y);
        }
        
        if (tile.feature === 'flower_patch') {
            this.renderFlowerPatch(ctx, x, y);
        } else if (tile.feature === 'rock') {
            this.renderSmallRock(ctx, x, y);
        } else if (tile.feature === 'grass_patch') {
            this.renderGrassPatch(ctx, x, y);
        } else if (tile.feature === 'berry_bush') {
            this.renderBerryBush(ctx, x, y);
        }
        
        if (tile.vegetation) {
            this.renderVegetation(ctx, tile.vegetation, x, y);
        }
    }

    drawTexturedTile(ctx, type, x, y, baseColor) {
        ctx.fillStyle = baseColor;
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        if (type === 'grass') {
            this.drawGrassTexture(ctx, x, y);
        } else if (type === 'water' || type === 'stream') {
            this.drawWaterTexture(ctx, x, y);
        } else if (type === 'sand') {
            this.drawSandTexture(ctx, x, y);
        } else if (type === 'rock' || type === 'mountain') {
            this.drawRockTexture(ctx, x, y, type);
        } else if (type === 'dirt') {
            this.drawDirtTexture(ctx, x, y);
        }
    }

    drawGrassTexture(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        
        for (let i = 0; i < 8; i++) {
            const gx = x + Math.random() * this.tileSize;
            const gy = y + Math.random() * this.tileSize;
            const length = 4 + Math.random() * 6;
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + Math.cos(angle) * length, gy - Math.sin(angle) * length);
            ctx.strokeStyle = '#4a7c23';
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        for (let i = 0; i < 3; i++) {
            const fx = x + Math.random() * this.tileSize;
            const fy = y + Math.random() * this.tileSize;
            const flowerSize = 1.5 + Math.random() * 1.5;
            const flowerColor = Math.random() > 0.6 ? '#ff69b4' : Math.random() > 0.5 ? '#ffd700' : '#ffffff';
            
            ctx.beginPath();
            ctx.arc(fx, fy, flowerSize, 0, Math.PI * 2);
            ctx.fillStyle = flowerColor;
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawWaterTexture(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        
        ctx.strokeStyle = '#4da6ff';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const offset = (Date.now() / 1000 + i * 0.5) % 2;
            ctx.moveTo(x, y + 10 + i * 10 + offset);
            ctx.bezierCurveTo(
                x + this.tileSize * 0.3, y + 8 + i * 10 - offset,
                x + this.tileSize * 0.7, y + 12 + i * 10 + offset,
                x + this.tileSize, y + 10 + i * 10 - offset
            );
            ctx.stroke();
        }
        
        ctx.restore();
    }

    drawSandTexture(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        
        for (let i = 0; i < 15; i++) {
            const sx = x + Math.random() * this.tileSize;
            const sy = y + Math.random() * this.tileSize;
            const size = 0.5 + Math.random() * 1;
            
            ctx.beginPath();
            ctx.arc(sx, sy, size, 0, Math.PI * 2);
            ctx.fillStyle = '#f4d03f';
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawRockTexture(ctx, x, y, type) {
        ctx.save();
        
        const darkness = type === 'mountain' ? 0.3 : 0.2;
        ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
        
        for (let i = 0; i < 5; i++) {
            const rx = x + Math.random() * this.tileSize;
            const ry = y + Math.random() * this.tileSize;
            const rSize = 3 + Math.random() * 5;
            
            ctx.beginPath();
            ctx.arc(rx, ry, rSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }

    drawDirtTexture(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        
        for (let i = 0; i < 10; i++) {
            const dx = x + Math.random() * this.tileSize;
            const dy = y + Math.random() * this.tileSize;
            const size = 1 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(dx, dy, size, 0, Math.PI * 2);
            ctx.fillStyle = '#6b5344';
            ctx.fill();
        }
        
        ctx.restore();
    }

    renderVegetation(ctx, vegetation, x, y) {
        ctx.save();
        
        if (vegetation === 'tree') {
            this.renderTree(ctx, x, y);
        } else if (vegetation === 'bush') {
            this.renderBush(ctx, x, y);
        }
        
        ctx.restore();
    }

    renderTree(ctx, x, y) {
        const trunkWidth = 6;
        const trunkHeight = 12;
        
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x + this.tileSize / 2 - trunkWidth / 2, y + this.tileSize - trunkHeight, trunkWidth, trunkHeight);
        
        const foliageColors = ['#2d5a1f', '#3d7a2f', '#4a8f3a'];
        const foliageLayers = 3;
        
        for (let layer = 0; layer < foliageLayers; layer++) {
            const layerY = y + this.tileSize - trunkHeight - layer * 10;
            const layerSize = 18 - layer * 4;
            
            ctx.fillStyle = foliageColors[layer % foliageColors.length];
            ctx.beginPath();
            ctx.moveTo(x + this.tileSize / 2, layerY - layerSize);
            ctx.lineTo(x + this.tileSize / 2 + layerSize, layerY);
            ctx.lineTo(x + this.tileSize / 2 - layerSize, layerY);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderBush(ctx, x, y) {
        const bushColors = ['#3d7a2f', '#4a8f3a', '#5a9f4a'];
        
        for (let i = 0; i < 3; i++) {
            const offsetX = (i - 1) * 6;
            const offsetY = i * 3;
            const size = 8 - i * 2;
            
            ctx.fillStyle = bushColors[i];
            ctx.beginPath();
            ctx.arc(x + this.tileSize / 2 + offsetX, y + this.tileSize - 10 + offsetY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderStone(ctx, x, y) {
        ctx.save();
        
        const stoneColor = '#8a8a8a';
        const stoneShade = '#6a6a6a';
        
        ctx.fillStyle = stoneColor;
        ctx.beginPath();
        ctx.ellipse(x + this.tileSize / 2, y + this.tileSize / 2, 10, 8, Math.random() * 0.3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = stoneShade;
        ctx.beginPath();
        ctx.ellipse(x + this.tileSize / 2 - 3, y + this.tileSize / 2 - 3, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    renderSmallRock(ctx, x, y) {
        ctx.save();
        
        const stoneColor = '#7a7a7a';
        const stoneShade = '#5a5a5a';
        const size = 4 + Math.random() * 3;
        
        ctx.fillStyle = stoneColor;
        ctx.beginPath();
        ctx.ellipse(x + this.tileSize / 2, y + this.tileSize / 2 + 4, size, size * 0.8, Math.random() * 0.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = stoneShade;
        ctx.beginPath();
        ctx.ellipse(x + this.tileSize / 2 - 2, y + this.tileSize / 2 + 2, size * 0.4, size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }

    renderFlowerPatch(ctx, x, y) {
        ctx.save();
        
        const flowerColors = ['#ff69b4', '#ffd700', '#ffffff', '#ff9966', '#9932cc', '#00ced1'];
        
        for (let i = 0; i < 6; i++) {
            const fx = x + Math.random() * this.tileSize;
            const fy = y + Math.random() * this.tileSize;
            const size = 2 + Math.random() * 2;
            const color = flowerColors[Math.floor(Math.random() * flowerColors.length)];
            
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(fx, fy, size, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(fx - 0.5, fy - 0.5, size * 0.3, 0, Math.PI * 2);
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

    renderTilePatch(ctx, tileType, x, y) {
        switch(tileType) {
            case 'water':
                this.renderWaterPatch(ctx, x, y);
                break;
            case 'forest':
                this.renderForestPatch(ctx, x, y);
                break;
            case 'rock':
                this.renderRockPatch(ctx, x, y);
                break;
            default:
                break;
        }
    }

    renderWaterPatch(ctx, x, y) {
        ctx.fillStyle = '#1e6b8a';
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#4da6ff';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            const offset = (Date.now() / 1000 + i * 0.5) % 2;
            ctx.moveTo(x, y + 10 + i * 10 + offset);
            ctx.bezierCurveTo(
                x + this.tileSize * 0.3, y + 8 + i * 10 - offset,
                x + this.tileSize * 0.7, y + 12 + i * 10 + offset,
                x + this.tileSize, y + 10 + i * 10 - offset
            );
            ctx.stroke();
        }
        ctx.restore();
    }

    renderForestPatch(ctx, x, y) {
        ctx.fillStyle = '#2d5a1f';
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        ctx.save();
        ctx.globalAlpha = 0.4;
        
        for (let i = 0; i < 5; i++) {
            const gx = x + Math.random() * this.tileSize;
            const gy = y + Math.random() * this.tileSize;
            const length = 6 + Math.random() * 8;
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.3;
            
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + Math.cos(angle) * length, gy - Math.sin(angle) * length);
            ctx.strokeStyle = '#3d7a2f';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        ctx.restore();
        
        const trunkWidth = 4;
        const trunkHeight = 8;
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x + this.tileSize / 2 - trunkWidth / 2, y + this.tileSize - trunkHeight - 5, trunkWidth, trunkHeight);
        
        const foliageColors = ['#2d5a1f', '#3d7a2f'];
        for (let layer = 0; layer < 2; layer++) {
            const layerY = y + this.tileSize - trunkHeight - 8 - layer * 8;
            const layerSize = 12 - layer * 3;
            
            ctx.fillStyle = foliageColors[layer];
            ctx.beginPath();
            ctx.moveTo(x + this.tileSize / 2, layerY - layerSize);
            ctx.lineTo(x + this.tileSize / 2 + layerSize, layerY);
            ctx.lineTo(x + this.tileSize / 2 - layerSize, layerY);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderRockPatch(ctx, x, y) {
        ctx.fillStyle = '#6b6b6b';
        ctx.fillRect(x, y, this.tileSize, this.tileSize);
        
        ctx.save();
        
        const stoneColor = '#8a8a8a';
        const stoneShade = '#5a5a5a';
        
        for (let i = 0; i < 3; i++) {
            const rx = x + 5 + Math.random() * (this.tileSize - 10);
            const ry = y + 5 + Math.random() * (this.tileSize - 10);
            const rSize = 5 + Math.random() * 6;
            
            ctx.fillStyle = stoneColor;
            ctx.beginPath();
            ctx.ellipse(rx, ry, rSize, rSize * 0.7, Math.random() * 0.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = stoneShade;
            ctx.beginPath();
            ctx.ellipse(rx - rSize * 0.3, ry - rSize * 0.3, rSize * 0.4, rSize * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
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
                    water: '#1e6b8a',
                    sand: '#d4a574',
                    grass: '#5a8f2a',
                    forest: '#2d5a1f',
                    rock: '#6b6b6b',
                    mountain: '#555555',
                    farmland: '#b8860b',
                    dirt: '#8b7355',
                    stone: '#7a7a7a',
                    stream: '#2e8b9a'
                };
                
                ctx.fillStyle = colors[tile.type] || '#444';
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }

    update(deltaTime) {
        this.resourceEntities.forEach(entity => {
            entity.update(deltaTime);
        });
    }

    generateGrassPatches() {
        const grassCount = 40 + Math.floor(Math.random() * 30);
        
        for (let i = 0; i < grassCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation && !tile.feature) {
                    tile.feature = 'grass_patch';
                }
            }
        }
    }

    generateBerryBushes() {
        const bushCount = 20 + Math.floor(Math.random() * 15);
        
        for (let i = 0; i < bushCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation && !tile.feature) {
                    tile.feature = 'berry_bush';
                }
            }
        }
    }

    generateFruitTrees() {
        const treeCount = 10 + Math.floor(Math.random() * 8);
        
        for (let i = 0; i < treeCount; i++) {
            const x = Math.floor(Math.random() * this.width);
            const y = Math.floor(Math.random() * this.height);
            
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                const tile = this.tiles[y][x];
                if (tile.type === 'grass' && !tile.vegetation && !tile.feature) {
                    tile.vegetation = 'fruit_tree';
                }
            }
        }
    }

    createResourceEntities() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tile = this.tiles[y][x];
                
                if (tile.vegetation === 'tree') {
                    this.resourceEntities.push({ type: 'tree', x, y });
                } else if (tile.vegetation === 'fruit_tree') {
                    this.resourceEntities.push({ type: 'fruit_tree', x, y });
                } else if (tile.feature === 'rock') {
                    this.resourceEntities.push({ type: 'rock', x, y });
                } else if (tile.feature === 'grass_patch') {
                    this.resourceEntities.push({ type: 'grass', x, y });
                } else if (tile.feature === 'bush') {
                    this.resourceEntities.push({ type: 'bush', x, y });
                } else if (tile.feature === 'berry_bush') {
                    this.resourceEntities.push({ type: 'berry_bush', x, y });
                }
            }
        }
    }

    getResourceEntities() {
        return this.resourceEntities;
    }

    getSpawnPoint() {
        return { ...this.spawnPoint };
    }

    renderGrassPatch(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.8;

        for (let i = 0; i < 5; i++) {
            const gx = x + 6 + i * 5;
            const gy = y + this.tileSize - 4;
            const length = 6 + Math.sin(Date.now() / 300 + i + x) * 1.5;
            const sway = Math.sin(Date.now() / 250 + i + x) * 1;

            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.lineTo(gx + sway, gy - length);
            ctx.strokeStyle = '#4a7c23';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        ctx.restore();
    }

    renderBerryBush(ctx, x, y) {
        ctx.save();
        
        const bushColors = ['#3d7a2f', '#4a8f3a'];
        const swayOffset = Math.sin(Date.now() / 400 + x) * 1;

        for (let i = 0; i < 2; i++) {
            const offsetX = (i - 0.5) * 10 + swayOffset;
            const offsetY = i * 4;
            const size = 10 - i * 3;

            ctx.fillStyle = bushColors[i];
            ctx.beginPath();
            ctx.arc(x + this.tileSize / 2 + offsetX, y + this.tileSize - 8 + offsetY, size, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < 4; i++) {
            const bx = x + this.tileSize / 2 + (i - 1.5) * 7 + swayOffset;
            const by = y + this.tileSize - 10;

            ctx.fillStyle = '#cc2222';
            ctx.beginPath();
            ctx.arc(bx, by, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.arc(bx - 1, by - 1, 1.2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    getSize() {
        return { width: this.width * this.tileSize, height: this.height * this.tileSize };
    }
}