export class ResourceLoader {
    constructor() {
        this.resources = {};
        this.loadingQueue = [];
        this.loadedCount = 0;
        this.totalCount = 0;
        this.onProgress = null;
        this.onComplete = null;
        this.isLoading = false;
        this.cache = new Map();
    }

    addResource(type, key, path) {
        if (!this.resources[type]) {
            this.resources[type] = {};
        }
        
        if (this.resources[type][key]) {
            console.warn(`Resource ${key} already exists`);
            return;
        }
        
        this.resources[type][key] = {
            path,
            data: null,
            loaded: false,
            type
        };
        
        this.loadingQueue.push({ type, key, path });
        this.totalCount++;
    }

    async loadAll(onProgressCallback = null, onCompleteCallback = null) {
        if (this.isLoading) {
            console.warn('Already loading resources');
            return;
        }
        
        this.onProgress = onProgressCallback;
        this.onComplete = onCompleteCallback;
        this.isLoading = true;
        this.loadedCount = 0;
        
        const promises = [];
        
        for (const item of this.loadingQueue) {
            promises.push(this.loadResource(item.type, item.key, item.path));
        }
        
        try {
            await Promise.all(promises);
            this.isLoading = false;
            this.loadingQueue = [];
            
            if (this.onComplete) {
                this.onComplete(this.resources);
            }
        } catch (error) {
            console.error('Failed to load resources:', error);
            this.isLoading = false;
        }
    }

    async loadResource(type, key, path) {
        try {
            let data = null;
            
            switch (type) {
                case 'image':
                    data = await this.loadImage(path);
                    break;
                case 'json':
                    data = await this.loadJSON(path);
                    break;
                case 'audio':
                    data = await this.loadAudio(path);
                    break;
                case 'text':
                    data = await this.loadText(path);
                    break;
                default:
                    console.warn(`Unknown resource type: ${type}`);
                    return;
            }
            
            if (this.resources[type] && this.resources[type][key]) {
                this.resources[type][key].data = data;
                this.resources[type][key].loaded = true;
                this.cache.set(`${type}:${key}`, data);
            }
            
            this.loadedCount++;
            this.notifyProgress();
        } catch (error) {
            console.error(`Failed to load ${type} resource ${key}:`, error);
            this.loadedCount++;
            this.notifyProgress();
        }
    }

    async loadImage(path) {
        return new Promise((resolve, reject) => {
            if (this.cache.has(`image:${path}`)) {
                resolve(this.cache.get(`image:${path}`));
                return;
            }
            
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.cache.set(`image:${path}`, img);
                resolve(img);
            };
            img.onerror = () => reject(new Error(`Failed to load image: ${path}`));
            img.src = path;
        });
    }

    async loadJSON(path) {
        if (this.cache.has(`json:${path}`)) {
            return this.cache.get(`json:${path}`);
        }
        
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load JSON: ${path}`);
        }
        const data = await response.json();
        this.cache.set(`json:${path}`, data);
        return data;
    }

    async loadAudio(path) {
        return new Promise((resolve, reject) => {
            if (this.cache.has(`audio:${path}`)) {
                resolve(this.cache.get(`audio:${path}`));
                return;
            }
            
            const audio = new Audio(path);
            audio.onloadeddata = () => {
                this.cache.set(`audio:${path}`, audio);
                resolve(audio);
            };
            audio.onerror = () => reject(new Error(`Failed to load audio: ${path}`));
            audio.load();
        });
    }

    async loadText(path) {
        if (this.cache.has(`text:${path}`)) {
            return this.cache.get(`text:${path}`);
        }
        
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`Failed to load text: ${path}`);
        }
        const text = await response.text();
        this.cache.set(`text:${path}`, text);
        return text;
    }

    getResource(type, key) {
        if (this.resources[type] && this.resources[type][key]) {
            return this.resources[type][key].data;
        }
        return null;
    }

    isResourceLoaded(type, key) {
        return !!(this.resources[type] && this.resources[type][key]?.loaded);
    }

    notifyProgress() {
        const progress = Math.round((this.loadedCount / this.totalCount) * 100);
        if (this.onProgress) {
            this.onProgress(progress, this.loadedCount, this.totalCount);
        }
    }

    getProgress() {
        return {
            loaded: this.loadedCount,
            total: this.totalCount,
            percentage: Math.round((this.loadedCount / this.totalCount) * 100)
        };
    }

    clearCache() {
        this.cache.clear();
    }

    unloadResource(type, key) {
        if (this.resources[type] && this.resources[type][key]) {
            const resource = this.resources[type][key];
            if (resource.data instanceof Image) {
                resource.data.src = '';
            } else if (resource.data instanceof Audio) {
                resource.data.pause();
                resource.data.src = '';
            }
            this.cache.delete(`${type}:${key}`);
            delete this.resources[type][key];
        }
    }

    preloadImages(imagePaths) {
        imagePaths.forEach((path, index) => {
            this.addResource('image', `preload_${index}`, path);
        });
    }
}