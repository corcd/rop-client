/*
 * @Author: Whzcorcd
 * @Date: 2020-08-25 15:15:13
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-12-22 10:36:52
 * @Description: file content
 */

export type Event = { [k: string]: any }

export interface IROP {
  ICS_ADDR?: string
  ROP_FLASH_SITE?: string
  PORT?: number
  SSL_PORT?: number
}

export type Qos = 0 | 1 | 2
