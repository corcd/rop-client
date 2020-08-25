/*
 * @Author: Whzcorcd
 * @Date: 2020-08-25 15:15:13
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-08-25 15:16:10
 * @Description: file content
 */

export type Event = { [k: string]: any }

export interface IROP {
  ICS_ADDR: string
  ROP_FLASH_SITE: string
}

export type Qos = 0 | 1 | 2
