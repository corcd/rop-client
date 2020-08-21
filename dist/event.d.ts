declare type Event = {
    [k: string]: any;
};
export default class EventEmitter {
    event: Event;
    maxListeners: number;
    constructor();
    on(type: string, listener: any): void;
    emit(type: string, ...args: any[]): void;
    removeListener(type: string): void;
    removeAllListener(): void;
}
export {};
