export class Player {
    constructor(x, y, gameStore) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 48;
        this.speed = 5;
        this.runningSpeed = 8;
        this.currentSpeed = this.speed;
        this.direction = 'down';
        this.isMoving = false;
        this.isRunning = false;
        this.animationFrame = 0;
        this.animationTimer = 0;
        this.gameStore = gameStore;
        this.collisionBox = {
            x: this.x + 4,
            y: this.y + 8,
            width: this.width - 8,
            height: this.height - 12
        };
        this.keys = {};
        this.initControls();
    }

    initControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key === 'Shift') {
                this.isRunning = true;
                this.currentSpeed = this.runningSpeed;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
            
            if (e.key === 'Shift') {
                this.isRunning = false;
                this.currentSpeed = this.speed;
            }
        });
    }

    update(deltaTime, map) {
        const prevX = this.x;
        const prevY = this.y;
        
        let dx = 0;
        let dy = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) {
            dy = -this.currentSpeed;
            this.direction = 'up';
            this.isMoving = true;
        } else if (this.keys['s'] || this.keys['arrowdown']) {
            dy = this.currentSpeed;
            this.direction = 'down';
            this.isMoving = true;
        } else if (this.keys['a'] || this.keys['arrowleft']) {
            dx = -this.currentSpeed;
            this.direction = 'left';
            this.isMoving = true;
        } else if (this.keys['d'] || this.keys['arrowright']) {
            dx = this.currentSpeed;
            this.direction = 'right';
            this.isMoving = true;
        } else {
            this.isMoving = false;
            this.animationFrame = 0;
        }
        
        if (this.isRunning && this.gameStore) {
            const stamina = this.gameStore.getState().player.stamina;
            if (stamina <= 0) {
                this.isRunning = false;
                this.currentSpeed = this.speed;
            } else {
                this.gameStore.actions.updatePlayerStats({
                    stamina: Math.max(0, stamina - 0.1)
                });
            }
        } else if (!this.isMoving && this.gameStore) {
            const stamina = this.gameStore.getState().player.stamina;
            this.gameStore.actions.updatePlayerStats({
                stamina: Math.min(100, stamina + 0.05)
            });
        }
        
        this.x += dx;
        this.y += dy;
        
        this.updateCollisionBox();
        
        if (map && this.checkCollision(map)) {
            this.x = prevX;
            this.y = prevY;
            this.updateCollisionBox();
            this.isMoving = false;
        }
        
        if (this.isMoving) {
            this.animationTimer += deltaTime;
            if (this.animationTimer >= 0.15) {
                this.animationTimer = 0;
                this.animationFrame = (this.animationFrame + 1) % 4;
            }
        }
        
        if (this.gameStore) {
            this.gameStore.actions.updatePlayerPosition(this.x, this.y);
        }
    }

    updateCollisionBox() {
        this.collisionBox = {
            x: this.x + 4,
            y: this.y + 8,
            width: this.width - 8,
            height: this.height - 12
        };
    }

    checkCollision(map) {
        const tileSize = 32;
        const startTileX = Math.floor(this.collisionBox.x / tileSize);
        const endTileX = Math.floor((this.collisionBox.x + this.collisionBox.width) / tileSize);
        const startTileY = Math.floor(this.collisionBox.y / tileSize);
        const endTileY = Math.floor((this.collisionBox.y + this.collisionBox.height) / tileSize);
        
        for (let tx = startTileX; tx <= endTileX; tx++) {
            for (let ty = startTileY; ty <= endTileY; ty++) {
                const tile = map.getTile(tx, ty);
                if (tile && tile.collision) {
                    return true;
                }
            }
        }
        
        return false;
    }

    render(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        if (this.direction === 'left') {
            ctx.scale(-1, 1);
        }
        
        const frameSize = 16;
        const frameY = this.direction === 'up' ? 0 : this.direction === 'down' ? 1 : 2;
        
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(-this.width / 2 + 4, -this.height / 2, this.width - 8, 16);
        
        ctx.fillStyle = '#654321';
        ctx.fillRect(-this.width / 2 + 6, -this.height / 2 + 16, this.width - 12, 24);
        
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(-this.width / 2 + 4, -this.height / 2 + 40, this.width - 8, 8);
        
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        
        ctx.restore();
        
        if (this.gameStore) {
            this.renderStaminaBar(ctx);
        }
    }

    renderStaminaBar(ctx) {
        const stamina = this.gameStore.getState().player.stamina;
        const barWidth = 40;
        const barHeight = 4;
        const barX = this.x + this.width / 2 - barWidth / 2;
        const barY = this.y - 10;
        
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        ctx.fillStyle = stamina > 30 ? '#44ff44' : '#ffaa00';
        ctx.fillRect(barX, barY, barWidth * (stamina / 100), barHeight);
    }

    destroy() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.updateCollisionBox();
        if (this.gameStore) {
            this.gameStore.actions.updatePlayerPosition(x, y);
        }
    }

    getPosition() {
        return { x: this.x, y: this.y };
    }
}