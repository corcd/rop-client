import EventEmitter from './event';
interface IROP {
    ICS_ADDR: string;
    ROP_FLASH_SITE: string;
}
declare type Qos = 0 | 1 | 2;
declare class ROP extends EventEmitter {
    private ROP_FLASH_SITE;
    private ICS_ADDR;
    private topic_list_;
    private pubKey_;
    private subKey_;
    private mqttClient_;
    private useSSL_;
    private state_;
    private reenter_df_;
    private re_enter_timeout_;
    private enter_times_;
    private client_id_;
    private timer_;
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
