export class GameStore {
    constructor() {
        this.state = {
            player: {
                x: 0,
                y: 0,
                health: 100,
                hunger: 100,
                thirst: 100,
                stamina: 100,
                inventory: [],
                skills: {}
            },
            world: {
                day: 1,
                time: 6,
                weather: 'sunny',
                temperature: 25
            },
            map: {
                seed: 0,
                tiles: [],
                spawnPoint: { x: 0, y: 0 }
            },
            game: {
                isPaused: false,
                isLoading: false,
                currentScreen: 'start',
                loadingProgress: 0
            },
            entities: []
        };
        
        this.listeners = {};
        this.actions = this.createActions();
    }

    createActions() {
        return {
            updatePlayerPosition: (x, y) => {
                this.setState(state => ({
                    ...state,
                    player: { ...state.player, x, y }
                }));
            },
            
            updatePlayerStats: (stats) => {
                this.setState(state => ({
                    ...state,
                    player: { ...state.player, ...stats }
                }));
            },
            
            addInventoryItem: (item) => {
                this.setState(state => {
                    const inventory = [...state.player.inventory];
                    const existingIndex = inventory.findIndex(i => i.id === item.id);
                    if (existingIndex >= 0) {
                        inventory[existingIndex] = {
                            ...inventory[existingIndex],
                            quantity: inventory[existingIndex].quantity + (item.quantity || 1)
                        };
                    } else {
                        inventory.push({ ...item, quantity: item.quantity || 1 });
                    }
                    return { ...state, player: { ...state.player, inventory } };
                });
            },
            
            removeInventoryItem: (itemId, quantity = 1) => {
                this.setState(state => {
                    const inventory = [...state.player.inventory];
                    const existingIndex = inventory.findIndex(i => i.id === itemId);
                    if (existingIndex >= 0) {
                        if (inventory[existingIndex].quantity <= quantity) {
                            inventory.splice(existingIndex, 1);
                        } else {
                            inventory[existingIndex] = {
                                ...inventory[existingIndex],
                                quantity: inventory[existingIndex].quantity - quantity
                            };
                        }
                    }
                    return { ...state, player: { ...state.player, inventory } };
                });
            },
            
            updateWorldTime: (hours) => {
                this.setState(state => {
                    let newTime = state.world.time + hours;
                    let newDay = state.world.day;
                    while (newTime >= 24) {
                        newTime -= 24;
                        newDay++;
                    }
                    return {
                        ...state,
                        world: { ...state.world, time: newTime, day: newDay }
                    };
                });
            },
            
            setWeather: (weather) => {
                this.setState(state => ({
                    ...state,
                    world: { ...state.world, weather }
                }));
            },
            
            setTemperature: (temperature) => {
                this.setState(state => ({
                    ...state,
                    world: { ...state.world, temperature }
                }));
            },
            
            setMapTiles: (tiles) => {
                this.setState(state => ({
                    ...state,
                    map: { ...state.map, tiles }
                }));
            },
            
            setSpawnPoint: (x, y) => {
                this.setState(state => ({
                    ...state,
                    map: { ...state.map, spawnPoint: { x, y } }
                }));
            },
            
            setMapSeed: (seed) => {
                this.setState(state => ({
                    ...state,
                    map: { ...state.map, seed }
                }));
            },
            
            addEntity: (entity) => {
                this.setState(state => ({
                    ...state,
                    entities: [...state.entities, entity]
                }));
            },
            
            removeEntity: (entityId) => {
                this.setState(state => ({
                    ...state,
                    entities: state.entities.filter(e => e.id !== entityId)
                }));
            },
            
            updateEntity: (entityId, updates) => {
                this.setState(state => ({
                    ...state,
                    entities: state.entities.map(e => 
                        e.id === entityId ? { ...e, ...updates } : e
                    )
                }));
            },
            
            setGamePaused: (isPaused) => {
                this.setState(state => ({
                    ...state,
                    game: { ...state.game, isPaused }
                }));
            },
            
            setLoading: (isLoading) => {
                this.setState(state => ({
                    ...state,
                    game: { ...state.game, isLoading }
                }));
            },
            
            setLoadingProgress: (progress) => {
                this.setState(state => ({
                    ...state,
                    game: { ...state.game, loadingProgress: Math.min(100, Math.max(0, progress)) }
                }));
            },
            
            setCurrentScreen: (screen) => {
                this.setState(state => ({
                    ...state,
                    game: { ...state.game, currentScreen: screen }
                }));
            },
            
            resetGame: () => {
                this.setState({
                    player: {
                        x: 0,
                        y: 0,
                        health: 100,
                        hunger: 100,
                        thirst: 100,
                        stamina: 100,
                        inventory: [],
                        skills: {}
                    },
                    world: {
                        day: 1,
                        time: 6,
                        weather: 'sunny',
                        temperature: 25
                    },
                    map: {
                        seed: Date.now(),
                        tiles: [],
                        spawnPoint: { x: 0, y: 0 }
                    },
                    game: {
                        isPaused: false,
                        isLoading: false,
                        currentScreen: 'game',
                        loadingProgress: 0
                    },
                    entities: []
                });
            },
            
            loadGame: (savedState) => {
                this.setState({ ...savedState });
            }
        };
    }

    setState(updater) {
        const newState = typeof updater === 'function' ? updater(this.state) : updater;
        this.state = { ...this.state, ...newState };
        this.notifyAll();
    }

    getState() {
        return { ...this.state };
    }

    subscribe(listener, key = '*') {
        if (!this.listeners[key]) {
            this.listeners[key] = [];
        }
        this.listeners[key].push(listener);
        return () => {
            this.listeners[key] = this.listeners[key].filter(l => l !== listener);
        };
    }

    notifyAll() {
        Object.keys(this.listeners).forEach(key => {
            this.listeners[key].forEach(listener => {
                try {
                    listener(this.state);
                } catch (error) {
                    console.error('Listener error:', error);
                }
            });
        });
    }

    getStateSnapshot() {
        return JSON.parse(JSON.stringify(this.state));
    }
}