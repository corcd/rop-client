var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import EventEmitter from './event';
import Paho from 'paho-mqtt';
var ROP = (function (_super) {
    __extends(ROP, _super);
    function ROP(options) {
        var _this = _super.call(this) || this;
        console.log(options);
        _this.ICS_ADDR = options.ICS_ADDR || 'mqttdms.aodianyun.com';
        _this.ROP_FLASH_SITE = options.ROP_FLASH_SITE || '//cdn.aodianyun.com/dms/';
        _this.topic_list_ = [];
        _this.pubKey_ = '';
        _this.subKey_ = '';
        _this.mqttClient_ = null;
        _this.useSSL_ = false;
        _this.state_ = ROP.STATE_INIT;
        _this.reenter_df_ = 1000;
        _this.re_enter_timeout_ = _this.reenter_df_;
        _this.timer_ = null;
        _this.enter_times_ = 0;
        _this.client_id_ = '';
        return _this;
    }
    ROP.prototype.getUuid = function () {
        var s = [];
        var hexDigits = '0123456789abcdef';
        for (var i = 0; i < 36; i++) {
            s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
        }
        s[14] = '4';
        s[19] = hexDigits.substr(s[19] | 0x8, 1);
        s[8] = s[13] = s[18] = s[23] = '-';
        return s.join('');
    };
    ROP.prototype.ReEnter = function () {
        var _this = this;
        if (this.timer_)
            return;
        if (this.state_ === ROP.STATE_ENTERED || ROP.STATE_REENTERING) {
            this.state_ = ROP.STATE_REENTERING;
            this.timer_ = setTimeout(function () { return _this.InternalEnter(); }, this.re_enter_timeout_);
            this.re_enter_timeout_ += this.reenter_df_;
            this.re_enter_timeout_ = Math.min(this.re_enter_timeout_, 5000);
        }
    };
    ROP.prototype.InternalSubscribe = function (topic, qos) {
        if (qos === void 0) { qos = 0; }
        if (this.state_ === ROP.STATE_ENTERED) {
            this.mqttClient_.subscribe(topic, { qos: qos });
        }
    };
    ROP.prototype.InternalUnSubscribe = function (topic) {
        if (this.state_ === ROP.STATE_ENTERED) {
            this.mqttClient_.unsubscribe(topic);
        }
    };
    ROP.prototype.InternalEnter = function () {
        var _this = this;
        if (this.timer_) {
            clearTimeout(this.timer_);
            this.timer_ = null;
        }
        var port_ = 0;
        if (this.state_ === ROP.STATE_REENTERING) {
            _super.prototype.emit.call(this, 'reconnect');
        }
        if (!this.client_id_) {
            console.log(this.client_id_);
            this.client_id_ = "ws2-" + this.getUuid();
        }
        if (this.useSSL_) {
            port_ = 8300;
        }
        else {
            port_ = 8000;
        }
        if (this.mqttClient_) {
            try {
                this.mqttClient_.disconnect();
            }
            catch (err) {
                console.error(err);
            }
        }
        this.mqttClient_ = new Paho.Client(this.ICS_ADDR, port_, this.client_id_);
        this.mqttClient_.onConnectionLost = function (responseObject) {
            if (responseObject.errorCode !== 0) {
                _super.prototype.emit.call(_this, 'offline', responseObject.errorMessage);
                _this.ReEnter();
            }
        };
        this.mqttClient_.onMessageArrived = function (message) {
            if (message.destinationName === '__sys__') {
                try {
                    var msg = JSON.parse(message.payloadString);
                    if (msg.cmd === 'kill') {
                        _super.prototype.emit.call(_this, 'connectold');
                        _super.prototype.emit.call(_this, 'losed');
                        _this.Leave();
                        return;
                    }
                }
                catch (err) {
                    console.error(err);
                }
            }
            _super.prototype.emit.call(_this, 'publish_data', message.payloadString, message.destinationName);
        };
        try {
            this.mqttClient_.connect({
                timeout: 10,
                userName: this.pubKey_,
                password: this.subKey_,
                keepAliveInterval: 60,
                cleanSession: true,
                useSSL: this.useSSL_,
                onSuccess: function () {
                    _this.state_ = ROP.STATE_ENTERED;
                    _this.re_enter_timeout_ = _this.reenter_df_;
                    _this.topic_list_.map(function (item) {
                        return _this.InternalSubscribe(item.topic, item.qos);
                    });
                    _super.prototype.emit.call(_this, 'enter_suc');
                },
                onFailure: function (err) {
                    if (_this.state_ === ROP.STATE_ENTERING) {
                        console.log(err);
                        if (_this.enter_times_++ >= 3) {
                            _this.state_ = ROP.STATE_ENTER_FAILED;
                            _this.enter_times_ = 0;
                            _super.prototype.emit.call(_this, 'enter_fail', err.errorMessage);
                            _this.Leave();
                        }
                        else {
                            setTimeout(function () { return _this.InternalEnter(); }, 1000);
                        }
                    }
                    else if (_this.state_ === ROP.STATE_REENTERING) {
                        console.error(err);
                        _super.prototype.emit.call(_this, 'offline', err.errorMessage);
                        _this.ReEnter();
                    }
                },
            });
        }
        catch (err) {
            console.error(err);
            this.ReEnter();
        }
    };
    ROP.prototype.Enter = function (pubKey, subKey, client_id, useSSL) {
        if (this.state_ === ROP.STATE_INIT) {
            this.state_ = ROP.STATE_ENTERING;
            this.pubKey_ = pubKey;
            this.useSSL_ = !!useSSL;
            this.subKey_ = subKey;
            if (!this.subKey_) {
                this.subKey_ = pubKey;
            }
            if (client_id) {
                this.client_id_ = client_id;
            }
            this.InternalEnter();
        }
    };
    ROP.prototype.Leave = function () {
        this.state_ = ROP.STATE_INIT;
        this.enter_times_ = 0;
        clearTimeout(this.timer_);
        try {
            if (this.mqttClient_)
                this.mqttClient_.disconnect();
        }
        catch (err) {
            console.error(err);
        }
    };
    ROP.prototype.On = function (evt, func) {
        _super.prototype.on.call(this, evt, func);
    };
    ROP.prototype.Publish = function (body, topic, qos, retain) {
        if (qos === void 0) { qos = 0; }
        if (retain === void 0) { retain = true; }
        if (this.state_ === ROP.STATE_ENTERED) {
            var message = new Paho.Message(body);
            message.destinationName = topic;
            message.qos = qos;
            message.retained = Boolean(retain);
            this.mqttClient_.send(message);
        }
    };
    ROP.prototype.Subscribe = function (topic, qos) {
        if (qos === void 0) { qos = 0; }
        var strTopic = topic.toString();
        if (!topic || topic.length === 0)
            return;
        for (var k = 0; k < this.topic_list_.length; k++) {
            if (this.topic_list_[k].topic === strTopic) {
                return;
            }
        }
        var numQos = Number(qos);
        if (numQos > 2)
            numQos = 2;
        if (numQos < 0)
            numQos = 0;
        this.topic_list_.push({ topic: strTopic, qos: numQos });
        this.InternalSubscribe(strTopic, numQos);
    };
    ROP.prototype.UnSubscribe = function (topic) {
        var _this = this;
        var strTopic = topic.toString();
        if (!strTopic || strTopic.length === 0)
            return;
        this.topic_list_.forEach(function (item, index) {
            if (item.topic === strTopic) {
                _this.topic_list_.splice(index, 1);
                _this.InternalUnSubscribe(strTopic);
            }
        });
    };
    ROP.STATE_INIT = 0;
    ROP.STATE_ENTERING = 4;
    ROP.STATE_ENTERED = 5;
    ROP.STATE_ENTER_FAILED = 6;
    ROP.STATE_REENTERING = 7;
    return ROP;
}(EventEmitter));
export default ROP;
