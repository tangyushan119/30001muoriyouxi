export class ResourceEntity {
    constructor(tileX, tileY, type, tileSize = 32) {
        this.id = `${type}_${tileX}_${tileY}_${Date.now()}`;
        this.tileX = tileX;
        this.tileY = tileY;
        this.type = type;
        this.tileSize = tileSize;
        this.x = tileX * tileSize + tileSize / 2;
        this.y = tileY * tileSize + tileSize / 2;
        this.isDepleted = false;
        this.regenerationTimer = 0;
        this.regenerationDelay = this.getRegenerationDelay();
        this.isHarvesting = false;
        this.harvestProgress = 0;
        this.harvestDuration = this.getHarvestDuration();
        this.animationFrame = 0;
        this.animationTimer = 0;
    }

    getRegenerationDelay() {
        const delays = {
            tree: 60000,
            rock: 45000,
            grass: 15000,
            bush: 20000,
            berry_bush: 25000,
            fruit_tree: 30000
        };
        return delays[this.type] || 30000;
    }

    getHarvestDuration() {
        const durations = {
            tree: 2000,
            rock: 1500,
            grass: 500,
            bush: 800,
            berry_bush: 600,
            fruit_tree: 1000
        };
        return durations[this.type] || 1000;
    }

    getHarvestItem() {
        const items = {
            tree: { id: 'log', quantity: 1 },
            rock: { id: 'stone', quantity: 1 },
            grass: { id: 'grass', quantity: 1 },
            bush: { id: 'grass', quantity: 2 },
            berry_bush: { id: 'berry', quantity: 2 },
            fruit_tree: { id: 'apple', quantity: 1 }
        };
        return items[this.type] || { id: 'grass', quantity: 1 };
    }

    update(deltaTime) {
        if (this.isHarvesting) {
            this.harvestProgress += deltaTime;
            if (this.harvestProgress >= this.harvestDuration) {
                this.completeHarvest();
            }
        } else if (this.isDepleted) {
            this.regenerationTimer += deltaTime;
            if (this.regenerationTimer >= this.regenerationDelay) {
                this.regenerate();
            }
        }

        this.animationTimer += deltaTime;
        if (this.animationTimer >= 0.2) {
            this.animationTimer = 0;
            this.animationFrame = (this.animationFrame + 1) % 4;
        }
    }

    startHarvest() {
        if (!this.isDepleted && !this.isHarvesting) {
            this.isHarvesting = true;
            this.harvestProgress = 0;
        }
    }

    completeHarvest() {
        this.isHarvesting = false;
        this.isDepleted = true;
        this.harvestProgress = 0;
        this.regenerationTimer = 0;
        return this.getHarvestItem();
    }

    regenerate() {
        this.isDepleted = false;
        this.regenerationTimer = 0;
        this.harvestProgress = 0;
    }

    render(ctx) {
        const screenX = this.tileX * this.tileSize;
        const screenY = this.tileY * this.tileSize;

        if (this.isDepleted) {
            this.renderDepleted(ctx, screenX, screenY);
            return;
        }

        if (this.isHarvesting) {
            this.renderHarvestingAnimation(ctx, screenX, screenY);
        }

        this.renderResource(ctx, screenX, screenY);

        if (this.isHarvesting) {
            this.renderHarvestProgress(ctx, screenX, screenY);
        }
    }

    renderResource(ctx, x, y) {
        ctx.save();

        switch (this.type) {
            case 'tree':
                this.renderTree(ctx, x, y);
                break;
            case 'rock':
                this.renderRock(ctx, x, y);
                break;
            case 'grass':
                this.renderGrass(ctx, x, y);
                break;
            case 'bush':
                this.renderBush(ctx, x, y);
                break;
            case 'berry_bush':
                this.renderBerryBush(ctx, x, y);
                break;
            case 'fruit_tree':
                this.renderFruitTree(ctx, x, y);
                break;
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

        const swayOffset = Math.sin(Date.now() / 500 + this.tileX) * 2;

        for (let layer = 0; layer < foliageLayers; layer++) {
            const layerY = y + this.tileSize - trunkHeight - layer * 10;
            const layerSize = 18 - layer * 4;

            ctx.fillStyle = foliageColors[layer % foliageColors.length];
            ctx.beginPath();
            ctx.moveTo(x + this.tileSize / 2 + swayOffset, layerY - layerSize);
            ctx.lineTo(x + this.tileSize / 2 + layerSize + swayOffset, layerY);
            ctx.lineTo(x + this.tileSize / 2 - layerSize + swayOffset, layerY);
            ctx.closePath();
            ctx.fill();
        }
    }

    renderRock(ctx, x, y) {
        const stoneColor = '#7a7a7a';
        const stoneShade = '#5a5a5a';
        const size = 10 + Math.random() * 4;

        ctx.fillStyle = stoneColor;
        ctx.beginPath();
        ctx.ellipse(x + this.tileSize / 2, y + this.tileSize / 2 + 4, size, size * 0.7, 0.2 + this.tileX * 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = stoneShade;
        ctx.beginPath();
        ctx.ellipse(x + this.tileSize / 2 - 3, y + this.tileSize / 2 + 2, size * 0.4, size * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8a8a8a';
        ctx.beginPath();
        ctx.ellipse(x + this.tileSize / 2 + 2, y + this.tileSize / 2, size * 0.3, size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    renderGrass(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.8;

        for (let i = 0; i < 5; i++) {
            const gx = x + 8 + i * 5;
            const gy = y + this.tileSize - 5;
            const length = 8 + Math.sin(this.animationFrame * 0.5 + i) * 2;
            const sway = Math.sin(Date.now() / 300 + i + this.tileX) * 1.5;

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

    renderBush(ctx, x, y) {
        const bushColors = ['#3d7a2f', '#4a8f3a', '#5a9f4a'];
        const swayOffset = Math.sin(Date.now() / 400 + this.tileX) * 1;

        for (let i = 0; i < 3; i++) {
            const offsetX = (i - 1) * 6 + swayOffset;
            const offsetY = i * 3;
            const size = 8 - i * 2;

            ctx.fillStyle = bushColors[i];
            ctx.beginPath();
            ctx.arc(x + this.tileSize / 2 + offsetX, y + this.tileSize - 10 + offsetY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderBerryBush(ctx, x, y) {
        const bushColors = ['#3d7a2f', '#4a8f3a'];
        const swayOffset = Math.sin(Date.now() / 400 + this.tileX) * 1;

        for (let i = 0; i < 2; i++) {
            const offsetX = (i - 0.5) * 10 + swayOffset;
            const offsetY = i * 4;
            const size = 10 - i * 3;

            ctx.fillStyle = bushColors[i];
            ctx.beginPath();
            ctx.arc(x + this.tileSize / 2 + offsetX, y + this.tileSize - 8 + offsetY, size, 0, Math.PI * 2);
            ctx.fill();
        }

        for (let i = 0; i < 5; i++) {
            const bx = x + this.tileSize / 2 + (i - 2) * 6 + swayOffset;
            const by = y + this.tileSize - 12;
            const berrySize = 3;

            ctx.fillStyle = '#cc2222';
            ctx.beginPath();
            ctx.arc(bx, by, berrySize, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ff6666';
            ctx.beginPath();
            ctx.arc(bx - 1, by - 1, berrySize * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    renderFruitTree(ctx, x, y) {
        const trunkWidth = 5;
        const trunkHeight = 10;

        ctx.fillStyle = '#5d4037';
        ctx.fillRect(x + this.tileSize / 2 - trunkWidth / 2, y + this.tileSize - trunkHeight, trunkWidth, trunkHeight);

        const foliageColors = ['#3d7a2f', '#4a8f3a'];
        const swayOffset = Math.sin(Date.now() / 500 + this.tileX) * 2;

        for (let layer = 0; layer < 2; layer++) {
            const layerY = y + this.tileSize - trunkHeight - 5 - layer * 8;
            const layerSize = 14 - layer * 3;

            ctx.fillStyle = foliageColors[layer];
            ctx.beginPath();
            ctx.moveTo(x + this.tileSize / 2 + swayOffset, layerY - layerSize);
            ctx.lineTo(x + this.tileSize / 2 + layerSize + swayOffset, layerY);
            ctx.lineTo(x + this.tileSize / 2 - layerSize + swayOffset, layerY);
            ctx.closePath();
            ctx.fill();
        }

        const fruitPositions = [
            { dx: -6, dy: -8 },
            { dx: 6, dy: -6 },
            { dx: 0, dy: -14 },
            { dx: -4, dy: -12 },
            { dx: 4, dy: -10 }
        ];

        fruitPositions.forEach(pos => {
            const fx = x + this.tileSize / 2 + pos.dx + swayOffset;
            const fy = y + this.tileSize - trunkHeight + pos.dy;

            ctx.fillStyle = '#ff6b35';
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#ffaa88';
            ctx.beginPath();
            ctx.arc(fx - 1.5, fy - 1.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    renderHarvestingAnimation(ctx, x, y) {
        const progress = this.harvestProgress / this.harvestDuration;
        const shakeIntensity = 3;
        const shake = Math.sin(Date.now() / 50) * shakeIntensity * (1 - progress);

        ctx.save();
        ctx.translate(x + this.tileSize / 2, y + this.tileSize / 2);
        ctx.translate(shake, shake);
        ctx.translate(-x - this.tileSize / 2, -y - this.tileSize / 2);

        this.renderResource(ctx, x, y);

        ctx.restore();
    }

    renderHarvestProgress(ctx, x, y) {
        const barWidth = this.tileSize - 8;
        const barHeight = 4;
        const barX = x + 4;
        const barY = y + this.tileSize + 4;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const progress = this.harvestProgress / this.harvestDuration;
        ctx.fillStyle = '#44ff44';
        ctx.fillRect(barX, barY, barWidth * progress, barHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }

    renderDepleted(ctx, x, y) {
        ctx.save();
        ctx.globalAlpha = 0.3;

        switch (this.type) {
            case 'tree':
                const trunkWidth = 6;
                const trunkHeight = 12;
                ctx.fillStyle = '#3d3027';
                ctx.fillRect(x + this.tileSize / 2 - trunkWidth / 2, y + this.tileSize - trunkHeight, trunkWidth, trunkHeight);
                break;
            case 'rock':
                ctx.fillStyle = '#4a4a4a';
                ctx.beginPath();
                ctx.ellipse(x + this.tileSize / 2, y + this.tileSize / 2 + 4, 6, 5, 0.2, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'grass':
                ctx.fillStyle = '#555';
                ctx.fillRect(x + this.tileSize / 2 - 2, y + this.tileSize - 4, 4, 4);
                break;
            case 'bush':
            case 'berry_bush':
                ctx.fillStyle = '#333';
                ctx.beginPath();
                ctx.arc(x + this.tileSize / 2, y + this.tileSize - 8, 5, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'fruit_tree':
                const fTrunkWidth = 5;
                const fTrunkHeight = 10;
                ctx.fillStyle = '#3d3027';
                ctx.fillRect(x + this.tileSize / 2 - fTrunkWidth / 2, y + this.tileSize - fTrunkHeight, fTrunkWidth, fTrunkHeight);
                break;
        }

        ctx.restore();
    }

    getBounds() {
        return {
            x: this.tileX * this.tileSize,
            y: this.tileY * this.tileSize,
            width: this.tileSize,
            height: this.tileSize
        };
    }

    isNearby(playerX, playerY, range = 48) {
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        return Math.sqrt(dx * dx + dy * dy) < range;
    }

    getInteractionPrompt() {
        const prompts = {
            tree: { key: 'E', action: '砍伐' },
            rock: { key: 'E', action: '采集' },
            grass: { key: 'E', action: '采集' },
            bush: { key: 'E', action: '采集' },
            berry_bush: { key: 'E', action: '采集浆果' },
            fruit_tree: { key: 'E', action: '采摘水果' }
        };
        return prompts[this.type] || { key: 'E', action: '采集' };
    }
}