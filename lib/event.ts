/*
 * @Author: Whzcorcd
 * @Date: 2020-08-20 15:48:37
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-08-21 11:26:12
 * @Description: file content
 */

type Event = { [k: string]: any }

export default class EventEmitter {
  event: Event
  maxListeners: number

  constructor() {
    this.event = {}
    this.maxListeners = 10
  }

  // 监听
  on(type: string, listener: any) {
    if (this.event[type]) {
      if (this.event[type].length >= this.maxListeners) {
        console.error(
          '同一监听器最多允许被十个对象监听，否则可能造成内存泄漏.\n'
        )
        return
      }
      this.event[type].push(listener)
    } else {
      this.event[type] = [listener]
    }
  }

  // 发送监听
  emit(type: string, ...args: any[]) {
    if (this.event[type]) {
      this.event[type].map((fn: any) => fn.apply(this, args))
    }
  }

  // 移除监听器
  removeListener(type: string) {
    if (this.event[type]) {
      delete this.event[type]
      console.log(this.event)
    }
  }

  // 移除所有的监听器
  removeAllListener() {
    this.event = {}
  }
}
