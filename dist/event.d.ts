export default class EventEmitter {
    private event;
    private maxListeners;
    constructor();
    on(type: string, listener: any): void;
    emit(type: string, ...args: any[]): void;
    removeListener(type: string): void;
    removeAllListener(): void;
}
