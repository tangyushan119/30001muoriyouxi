export class CanvasEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 0;
        this.height = 0;
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.isRunning = false;
        this.lastTime = 0;
        this.deltaTime = 0;
        this.renderables = [];
        this.debugMode = false;
        this.grassPattern = null;
        this.init();
    }

    init() {
        this.resize();
        this.createGrassPattern();
        window.addEventListener('resize', () => this.resize());
    }

    createGrassPattern() {
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = 128;
        patternCanvas.height = 128;
        const ctx = patternCanvas.getContext('2d');
        
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 128);
        gradient.addColorStop(0, '#5a8f2a');
        gradient.addColorStop(0.5, '#4a7c23');
        gradient.addColorStop(1, '#3d6b1f');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const length = 4 + Math.random() * 10;
            const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.4;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(angle) * length, y - Math.sin(angle) * length);
            
            const bladeGradient = ctx.createLinearGradient(x, y, x + Math.cos(angle) * length, y - Math.sin(angle) * length);
            const brightness = 0.6 + Math.random() * 0.4;
            const greenShade = Math.random() > 0.5 ? '4a7c23' : '3d6b1f';
            bladeGradient.addColorStop(0, `#${greenShade}`);
            bladeGradient.addColorStop(1, `rgba(56, 115, 35, ${brightness * 0.7})`);
            ctx.strokeStyle = bladeGradient;
            ctx.lineWidth = 1 + Math.random() * 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
        
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const size = 1 + Math.random() * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            const flowerColor = Math.random() > 0.7 ? '#ff69b4' : Math.random() > 0.5 ? '#ffd700' : Math.random() > 0.5 ? '#ffffff' : '#ff9966';
            ctx.fillStyle = flowerColor;
            ctx.fill();
        }
        
        for (let i = 0; i < 25; i++) {
            const x = Math.random() * 128;
            const y = Math.random() * 128;
            const size = 2 + Math.random() * 3;
            
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(139, 119, 101, 0.3)';
            ctx.fill();
        }
        
        this.grassPattern = this.ctx.createPattern(patternCanvas, 'repeat');
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }

    stop() {
        this.isRunning = false;
    }

    gameLoop() {
        if (!this.isRunning) return;
        
        const currentTime = performance.now();
        this.deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        this.renderables.forEach(renderable => {
            if (renderable.update) {
                renderable.update(this.deltaTime);
            }
        });
    }

    render() {
        this.ctx.fillStyle = this.grassPattern || '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.save();
        this.ctx.translate(this.width / 2, this.height / 2);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.renderables.forEach(renderable => {
            if (renderable.render) {
                this.ctx.save();
                renderable.render(this.ctx);
                this.ctx.restore();
            }
        });
        
        this.ctx.restore();
        
        if (this.debugMode) {
            this.drawDebugInfo();
        }
    }

    drawDebugInfo() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px monospace';
        this.ctx.fillText(`Camera: (${Math.round(this.camera.x)}, ${Math.round(this.camera.y)})`, 10, 20);
        this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}`, 10, 35);
        this.ctx.fillText(`FPS: ${Math.round(1 / this.deltaTime)}`, 10, 50);
        this.ctx.fillText(`Renderables: ${this.renderables.length}`, 10, 65);
    }

    addRenderable(renderable) {
        if (!this.renderables.includes(renderable)) {
            this.renderables.push(renderable);
        }
    }

    removeRenderable(renderable) {
        const index = this.renderables.indexOf(renderable);
        if (index > -1) {
            this.renderables.splice(index, 1);
        }
    }

    setCameraPosition(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }

    setCameraZoom(zoom) {
        this.camera.zoom = Math.max(0.5, Math.min(3, zoom));
    }

    screenToWorld(x, y) {
        return {
            x: (x - this.width / 2) / this.camera.zoom + this.camera.x,
            y: (y - this.height / 2) / this.camera.zoom + this.camera.y
        };
    }

    worldToScreen(x, y) {
        return {
            x: (x - this.camera.x) * this.camera.zoom + this.width / 2,
            y: (y - this.camera.y) * this.camera.zoom + this.height / 2
        };
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    destroy() {
        this.stop();
        window.removeEventListener('resize', () => this.resize());
        this.renderables = [];
    }
}