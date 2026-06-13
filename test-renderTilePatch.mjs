import { strict as assert } from 'assert';
import { GameMap } from './js/map/GameMap.js';

function createMockContext() {
    const ctx = {};
    ctx._fillStyle = '';
    ctx._strokeStyle = '';
    ctx._lineWidth = 1;
    ctx._globalAlpha = 1;
    ctx._lineCap = 'butt';
    
    ctx.fillRectCalls = [];
    ctx.beginPathCalls = 0;
    ctx.moveToCalls = [];
    ctx.lineToCalls = [];
    ctx.bezierCurveToCalls = [];
    ctx.strokeCalls = 0;
    ctx.fillCalls = 0;
    ctx.arcCalls = [];
    ctx.ellipseCalls = [];
    ctx.closePathCalls = 0;
    
    Object.defineProperty(ctx, 'fillStyle', {
        set: function(style) { this._fillStyle = style; },
        get: function() { return this._fillStyle || ''; }
    });
    
    Object.defineProperty(ctx, 'strokeStyle', {
        set: function(style) { this._strokeStyle = style; },
        get: function() { return this._strokeStyle || ''; }
    });
    
    Object.defineProperty(ctx, 'lineWidth', {
        set: function(width) { this._lineWidth = width; },
        get: function() { return this._lineWidth || 1; }
    });
    
    Object.defineProperty(ctx, 'globalAlpha', {
        set: function(alpha) { this._globalAlpha = alpha; },
        get: function() { return this._globalAlpha || 1; }
    });
    
    Object.defineProperty(ctx, 'lineCap', {
        set: function(cap) { this._lineCap = cap; },
        get: function() { return this._lineCap || 'butt'; }
    });
    
    ctx.fillRect = function(x, y, w, h) {
        ctx.fillRectCalls.push({ x, y, width: w, height: h, fillStyle: ctx._fillStyle });
    };
    
    ctx.beginPath = function() {
        ctx.beginPathCalls++;
    };
    
    ctx.moveTo = function(x, y) {
        ctx.moveToCalls.push({ x, y });
    };
    
    ctx.lineTo = function(x, y) {
        ctx.lineToCalls.push({ x, y });
    };
    
    ctx.bezierCurveTo = function(cp1x, cp1y, cp2x, cp2y, x, y) {
        ctx.bezierCurveToCalls.push({ cp1x, cp1y, cp2x, cp2y, x, y });
    };
    
    ctx.stroke = function() {
        ctx.strokeCalls++;
    };
    
    ctx.fill = function() {
        ctx.fillCalls++;
    };
    
    ctx.arc = function(x, y, r, sa, ea) {
        ctx.arcCalls.push({ x, y, radius: r, startAngle: sa, endAngle: ea });
    };
    
    ctx.ellipse = function(x, y, rx, ry, rot, sa, ea) {
        ctx.ellipseCalls.push({ x, y, radiusX: rx, radiusY: ry, rotation: rot, startAngle: sa, endAngle: ea });
    };
    
    ctx.closePath = function() {
        ctx.closePathCalls++;
    };
    
    ctx.save = function() {};
    ctx.restore = function() {};
    
    return ctx;
}

function runTests() {
    let passed = 0;
    let failed = 0;
    
    function test(name, fn) {
        try {
            fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (err) {
            console.log(`✗ ${name}`);
            console.log(`  Error: ${err.message}`);
            failed++;
        }
    }
    
    test('renderTilePatch 函数存在', () => {
        const gameMap = new GameMap(123);
        assert.strictEqual(typeof gameMap.renderTilePatch, 'function');
    });
    
    test('renderTilePatch 处理 water 类型', () => {
        const gameMap = new GameMap(123);
        const ctx = createMockContext();
        
        gameMap.renderTilePatch(ctx, 'water', 0, 0);
        
        assert.ok(ctx.fillRectCalls.length > 0, '应该调用 fillRect');
        const fillCall = ctx.fillRectCalls.find(call => call.fillStyle === '#1e6b8a');
        assert.ok(fillCall, 'water 应该使用蓝色 #1e6b8a');
        assert.ok(ctx.bezierCurveToCalls.length > 0, 'water 应该绘制波纹');
    });
    
    test('renderTilePatch 处理 forest 类型', () => {
        const gameMap = new GameMap(123);
        const ctx = createMockContext();
        
        gameMap.renderTilePatch(ctx, 'forest', 0, 0);
        
        assert.ok(ctx.fillRectCalls.length > 0, '应该调用 fillRect');
        const fillCall = ctx.fillRectCalls.find(call => call.fillStyle === '#2d5a1f');
        assert.ok(fillCall, 'forest 应该使用深绿色 #2d5a1f');
        assert.ok(ctx.lineToCalls.length > 0, 'forest 应该绘制草纹理');
    });
    
    test('renderTilePatch 处理 rock 类型', () => {
        const gameMap = new GameMap(123);
        const ctx = createMockContext();
        
        gameMap.renderTilePatch(ctx, 'rock', 0, 0);
        
        assert.ok(ctx.fillRectCalls.length > 0, '应该调用 fillRect');
        const fillCall = ctx.fillRectCalls.find(call => call.fillStyle === '#6b6b6b');
        assert.ok(fillCall, 'rock 应该使用灰色 #6b6b6b');
        assert.ok(ctx.ellipseCalls.length > 0, 'rock 应该绘制石头椭圆');
    });
    
    test('renderTilePatch 处理未知类型不报错', () => {
        const gameMap = new GameMap(123);
        const ctx = createMockContext();
        
        assert.doesNotThrow(() => {
            gameMap.renderTilePatch(ctx, 'unknown', 0, 0);
        });
    });
    
    test('renderWaterPatch 方法存在', () => {
        const gameMap = new GameMap(123);
        assert.strictEqual(typeof gameMap.renderWaterPatch, 'function');
    });
    
    test('renderForestPatch 方法存在', () => {
        const gameMap = new GameMap(123);
        assert.strictEqual(typeof gameMap.renderForestPatch, 'function');
    });
    
    test('renderRockPatch 方法存在', () => {
        const gameMap = new GameMap(123);
        assert.strictEqual(typeof gameMap.renderRockPatch, 'function');
    });
    
    console.log('\n========== 测试结果 ==========');
    console.log(`通过: ${passed}`);
    console.log(`失败: ${failed}`);
    console.log(`总计: ${passed + failed}`);
    
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
