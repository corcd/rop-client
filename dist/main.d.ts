import EventEmitter from './event';
interface IROP {
    ICS_ADDR: string;
    ROP_FLASH_SITE: string;
}
declare type Qos = 0 | 1 | 2;
declare class ROP extends EventEmitter {
    ROP_FLASH_SITE: string;
    ICS_ADDR: string;
    topic_list_: any[];
    pubKey_: string;
    subKey_: string;
    mqttClient_: any;
    useSSL_: boolean;
    timers: number;
    state_: number;
    reenter_max_: number;
    reenter_df_: number;
    re_enter_timeout_: number;
    enter_times_: number;
    client_id_: string;
    timer_: any;
    static STATE_INIT: number;
    static STATE_ENTERING: number;
    static STATE_ENTERED: number;
    static STATE_ENTER_FAILED: number;
    static STATE_REENTERING: number;
    constructor(options: IROP);
    private getUuid;
    private ReEnter;
    private InternalSubscribe;
    private InternalUnSubscribe;
    private InternalEnter;
    Enter(pubKey: string, subKey: string, client_id: string, useSSL: boolean): void;
    Leave(): void;
    On(evt: string, func: any): void;
    Publish(body: string, topic: string, qos?: Qos, retain?: boolean): void;
    Subscribe(topic: string, qos?: number): void;
    UnSubscribe(topic: string): void;
}
export default ROP;
