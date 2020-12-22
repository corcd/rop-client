var EventEmitter = (function () {
    function EventEmitter() {
        this.event = {};
        this.maxListeners = 10;
    }
    EventEmitter.prototype.on = function (type, listener) {
        if (this.event[type]) {
            if (this.event[type].length >= this.maxListeners) {
                console.error('同一监听器最多允许被十个对象监听，否则可能造成内存泄漏.\n');
                return;
            }
            this.event[type].push(listener);
        }
        else {
            this.event[type] = [listener];
        }
    };
    EventEmitter.prototype.emit = function (type) {
        var _this = this;
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (this.event[type]) {
            this.event[type].map(function (fn) { return fn.apply(_this, args); });
        }
    };
    EventEmitter.prototype.removeListener = function (type) {
        if (this.event[type]) {
            delete this.event[type];
            console.log(this.event);
        }
    };
    EventEmitter.prototype.removeAllListener = function () {
        this.event = {};
    };
    return EventEmitter;
}());
export default EventEmitter;
