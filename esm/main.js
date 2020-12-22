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
    function ROP(_a) {
        var _b = _a.ICS_ADDR, ICS_ADDR = _b === void 0 ? 'mqttdms.aodianyun.com' : _b, _c = _a.ROP_FLASH_SITE, ROP_FLASH_SITE = _c === void 0 ? 'cdn.aodianyun.com/dms/' : _c, _d = _a.PORT, PORT = _d === void 0 ? 8000 : _d, _e = _a.SSL_PORT, SSL_PORT = _e === void 0 ? 8300 : _e;
        var _this = this;
        console.log(ICS_ADDR, ROP_FLASH_SITE, PORT, SSL_PORT);
        _this = _super.call(this) || this;
        _this.ICS_ADDR = ICS_ADDR;
        _this.ROP_FLASH_SITE = "//" + ROP_FLASH_SITE;
        _this.PORT = PORT;
        _this.SSL_PORT = SSL_PORT;
        _this._topicList = [];
        _this._pubKey = '';
        _this._subKey = '';
        _this._mqttClient = null;
        _this._useSSL = false;
        _this._state = ROP.STATE_INIT;
        _this._reenterDf = 1000;
        _this._reEnterTimeout = _this._reenterDf;
        _this._timer = null;
        _this._enterTimes = 0;
        _this._clientId = '';
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
        if (this._timer)
            return;
        if (this._state === ROP.STATE_ENTERED || ROP.STATE_REENTERING) {
            this._state = ROP.STATE_REENTERING;
            this._timer = setTimeout(function () { return _this.InternalEnter(); }, this._reEnterTimeout);
            this._reEnterTimeout += this._reenterDf;
            this._reEnterTimeout = Math.min(this._reEnterTimeout, 5000);
        }
    };
    ROP.prototype.InternalSubscribe = function (topic, qos) {
        if (qos === void 0) { qos = 0; }
        if (this._state === ROP.STATE_ENTERED) {
            this._mqttClient.subscribe(topic, { qos: qos });
        }
    };
    ROP.prototype.InternalUnSubscribe = function (topic) {
        if (this._state === ROP.STATE_ENTERED) {
            this._mqttClient.unsubscribe(topic);
        }
    };
    ROP.prototype.InternalEnter = function () {
        var _this = this;
        if (this._timer) {
            clearTimeout(this._timer);
            this._timer = null;
        }
        var _port = 0;
        if (this._state === ROP.STATE_REENTERING) {
            _super.prototype.emit.call(this, 'reconnect');
        }
        if (!this._clientId) {
            console.log(this._clientId);
            this._clientId = "ws2-" + this.getUuid();
        }
        if (this._useSSL) {
            _port = this.SSL_PORT;
        }
        else {
            _port = this.PORT;
        }
        if (this._mqttClient) {
            try {
                this._mqttClient.disconnect();
                this._mqttClient = null;
            }
            catch (err) {
                console.error(err);
            }
        }
        this._mqttClient = new Paho.Client(this.ICS_ADDR, _port, this._clientId);
        this._mqttClient.onConnectionLost = function (responseObject) {
            if (responseObject.errorCode !== 0) {
                _super.prototype.emit.call(_this, 'offline', responseObject.errorMessage);
                _this.ReEnter();
            }
        };
        this._mqttClient.onMessageArrived = function (message) {
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
            this._mqttClient.connect({
                timeout: 10,
                userName: this._pubKey,
                password: this._subKey,
                keepAliveInterval: 60,
                cleanSession: true,
                useSSL: this._useSSL,
                onSuccess: function () {
                    _this._state = ROP.STATE_ENTERED;
                    _this._reEnterTimeout = _this._reenterDf;
                    _this._topicList.map(function (item) {
                        return _this.InternalSubscribe(item.topic, item.qos);
                    });
                    _super.prototype.emit.call(_this, 'enter_suc');
                },
                onFailure: function (err) {
                    if (_this._state === ROP.STATE_ENTERING) {
                        console.log(err);
                        if (_this._enterTimes++ >= 3) {
                            _this._state = ROP.STATE_ENTER_FAILED;
                            _this._enterTimes = 0;
                            _super.prototype.emit.call(_this, 'enter_fail', err.errorMessage);
                            _this.Leave();
                        }
                        else {
                            setTimeout(function () { return _this.InternalEnter(); }, 1000);
                        }
                    }
                    else if (_this._state === ROP.STATE_REENTERING) {
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
    ROP.prototype.Enter = function (pubKey, subKey, clientId, useSSL) {
        if (this._state === ROP.STATE_INIT) {
            this._state = ROP.STATE_ENTERING;
            this._pubKey = pubKey;
            this._useSSL = !!useSSL;
            this._subKey = subKey;
            if (!this._subKey) {
                this._subKey = pubKey;
            }
            if (clientId) {
                this._clientId = clientId;
            }
            this.InternalEnter();
        }
    };
    ROP.prototype.Leave = function () {
        this._state = ROP.STATE_INIT;
        this._enterTimes = 0;
        clearTimeout(this._timer);
        try {
            if (this._mqttClient) {
                this._mqttClient.disconnect();
                this._mqttClient = null;
            }
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
        if (this._state === ROP.STATE_ENTERED) {
            var message = new Paho.Message(body);
            message.destinationName = topic;
            message.qos = qos;
            message.retained = Boolean(retain);
            this._mqttClient.send(message);
        }
    };
    ROP.prototype.Subscribe = function (topic, qos) {
        if (qos === void 0) { qos = 0; }
        var strTopic = topic.toString();
        if (!topic || topic.length === 0)
            return;
        for (var k = 0; k < this._topicList.length; k++) {
            if (this._topicList[k].topic === strTopic) {
                return;
            }
        }
        var numQos = Number(qos);
        if (numQos > 2)
            numQos = 2;
        if (numQos < 0)
            numQos = 0;
        this._topicList.push({ topic: strTopic, qos: numQos });
        this.InternalSubscribe(strTopic, numQos);
    };
    ROP.prototype.UnSubscribe = function (topic) {
        var _this = this;
        var strTopic = topic.toString();
        if (!strTopic || strTopic.length === 0)
            return;
        this._topicList.forEach(function (item, index) {
            if (item.topic === strTopic) {
                _this._topicList.splice(index, 1);
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
