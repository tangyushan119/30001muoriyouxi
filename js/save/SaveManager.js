export class SaveManager {
    constructor() {
        this.saveKeyPrefix = 'sandbox_survival_save_';
        this.maxSaves = 5;
        this.autoSaveInterval = 60000;
        this.autoSaveTimer = null;
    }

    saveGame(saveSlot, gameState) {
        if (saveSlot < 0 || saveSlot >= this.maxSaves) {
            throw new Error(`Invalid save slot: ${saveSlot}. Must be between 0 and ${this.maxSaves - 1}`);
        }
        
        const saveData = {
            state: gameState,
            timestamp: Date.now(),
            slot: saveSlot
        };
        
        try {
            localStorage.setItem(`${this.saveKeyPrefix}${saveSlot}`, JSON.stringify(saveData));
            return { success: true, message: '保存成功' };
        } catch (error) {
            console.error('Failed to save game:', error);
            return { success: false, message: '保存失败' };
        }
    }

    loadGame(saveSlot) {
        if (saveSlot < 0 || saveSlot >= this.maxSaves) {
            throw new Error(`Invalid save slot: ${saveSlot}. Must be between 0 and ${this.maxSaves - 1}`);
        }
        
        try {
            const savedData = localStorage.getItem(`${this.saveKeyPrefix}${saveSlot}`);
            if (!savedData) {
                return { success: false, message: '存档不存在', data: null };
            }
            
            const parsedData = JSON.parse(savedData);
            return { success: true, message: '读取成功', data: parsedData.state };
        } catch (error) {
            console.error('Failed to load game:', error);
            return { success: false, message: '读取失败', data: null };
        }
    }

    deleteSave(saveSlot) {
        if (saveSlot < 0 || saveSlot >= this.maxSaves) {
            throw new Error(`Invalid save slot: ${saveSlot}. Must be between 0 and ${this.maxSaves - 1}`);
        }
        
        try {
            localStorage.removeItem(`${this.saveKeyPrefix}${saveSlot}`);
            return { success: true, message: '删除成功' };
        } catch (error) {
            console.error('Failed to delete save:', error);
            return { success: false, message: '删除失败' };
        }
    }

    getAllSaves() {
        const saves = [];
        
        for (let i = 0; i < this.maxSaves; i++) {
            try {
                const savedData = localStorage.getItem(`${this.saveKeyPrefix}${i}`);
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    saves.push({
                        slot: i,
                        timestamp: parsedData.timestamp,
                        day: parsedData.state?.world?.day || 1,
                        time: parsedData.state?.world?.time || 6
                    });
                } else {
                    saves.push({
                        slot: i,
                        timestamp: null,
                        day: null,
                        time: null
                    });
                }
            } catch (error) {
                saves.push({
                    slot: i,
                    timestamp: null,
                    day: null,
                    time: null,
                    error: true
                });
            }
        }
        
        return saves;
    }

    hasSave(saveSlot) {
        if (saveSlot < 0 || saveSlot >= this.maxSaves) {
            return false;
        }
        
        try {
            return localStorage.getItem(`${this.saveKeyPrefix}${saveSlot}`) !== null;
        } catch (error) {
            return false;
        }
    }

    startAutoSave(gameStateProvider) {
        if (this.autoSaveTimer) {
            this.stopAutoSave();
        }
        
        this.autoSaveTimer = setInterval(() => {
            const state = gameStateProvider();
            if (state) {
                const existingSaves = this.getAllSaves().filter(s => s.timestamp !== null);
                const targetSlot = existingSaves.length > 0 ? 0 : 0;
                this.saveGame(targetSlot, state);
            }
        }, this.autoSaveInterval);
    }

    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    formatTimestamp(timestamp) {
        if (!timestamp) return '空存档';
        
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    }

    formatGameTime(day, time) {
        if (day === null || time === null) return '';
        
        const hours = Math.floor(time);
        const minutes = Math.round((time - hours) * 60);
        
        return `第 ${day} 天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }

    exportSave(saveSlot) {
        const result = this.loadGame(saveSlot);
        if (!result.success) {
            return result;
        }
        
        const exportData = {
            version: '1.0.0',
            ...result.data
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `sandbox_survival_save_${saveSlot}_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        return { success: true, message: '导出成功' };
    }

    importSave(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (!data.state) {
                        resolve({ success: false, message: '无效的存档文件' });
                        return;
                    }
                    
                    const existingSaves = this.getAllSaves().filter(s => s.timestamp !== null);
                    let targetSlot = 0;
                    
                    for (let i = 0; i < this.maxSaves; i++) {
                        if (!this.hasSave(i)) {
                            targetSlot = i;
                            break;
                        }
                    }
                    
                    const result = this.saveGame(targetSlot, data.state);
                    resolve(result);
                } catch (error) {
                    console.error('Failed to import save:', error);
                    resolve({ success: false, message: '解析存档文件失败' });
                }
            };
            
            reader.onerror = () => {
                resolve({ success: false, message: '读取文件失败' });
            };
            
            reader.readAsText(file);
        });
    }
}