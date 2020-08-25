/*
 * @Author: Whzcorcd
 * @Date: 2020-08-20 15:48:37
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-08-25 15:20:29
 * @Description: file content
 */

import { Event } from './types'

export default class EventEmitter {
  private event: Event
  private maxListeners: number

  constructor() {
    this.event = {}
    this.maxListeners = 10
  }

  // 监听
  public on(type: string, listener: any): void {
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
  public emit(type: string, ...args: any[]): void {
    if (this.event[type]) {
      this.event[type].map((fn: any) => fn.apply(this, args))
    }
  }

  // 移除监听器
  public removeListener(type: string): void {
    if (this.event[type]) {
      delete this.event[type]
      console.log(this.event)
    }
  }

  // 移除所有的监听器
  public removeAllListener(): void {
    this.event = {}
  }
}
