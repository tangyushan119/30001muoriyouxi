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
        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
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
        this.ctx.fillStyle = '#1a1a1a';
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