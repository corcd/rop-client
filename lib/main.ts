/*
 * @Author: Whzcorcd
 * @Date: 2020-08-20 10:01:49
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-08-21 11:05:53
 * @Description: file content
 */

import EventEmitter from './event'
import Paho from 'paho-mqtt'

interface IROP {
  ICS_ADDR: string
  ROP_FLASH_SITE: string
}

type Qos = 0 | 1 | 2

class ROP extends EventEmitter {
  ROP_FLASH_SITE: string
  ICS_ADDR: string

  topic_list_: any[]
  pubKey_: string
  subKey_: string
  mqttClient_: any
  useSSL_: boolean
  timers: number
  state_: number
  reenter_max_: number
  reenter_df_: number
  re_enter_timeout_: number
  enter_times_: number
  client_id_: string
  timer_: any

  static STATE_INIT = 0
  static STATE_ENTERING = 4
  static STATE_ENTERED = 5
  static STATE_ENTER_FAILED = 6
  static STATE_REENTERING = 7

  constructor(options: IROP) {
    super()
    console.log(options)
    this.ICS_ADDR = options.ICS_ADDR || 'mqttdms.aodianyun.com'
    this.ROP_FLASH_SITE = options.ROP_FLASH_SITE || '//cdn.aodianyun.com/dms/'

    this.topic_list_ = []
    this.pubKey_ = ''
    this.subKey_ = ''
    this.mqttClient_ = null
    this.useSSL_ = false
    this.timers = 0

    this.state_ = ROP.STATE_INIT

    this.reenter_max_ = 5000
    this.reenter_df_ = 1000
    this.re_enter_timeout_ = this.reenter_df_
    this.timer_ = null
    this.enter_times_ = 0
    this.client_id_ = ''
  }

  private getUuid(): string {
    const s = []
    const hexDigits = '0123456789abcdef'
    for (let i = 0; i < 36; i++) {
      s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1)
    }
    s[14] = '4' // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] as string & 0x3) | 0x8, 1) // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = '-'

    return s.join('')
  }

  private ReEnter(): void {
    if (this.timer_) return
    if (this.state_ === ROP.STATE_ENTERED || ROP.STATE_REENTERING) {
      this.state_ = ROP.STATE_REENTERING
      this.timer_ = setTimeout(
        () => this.InternalEnter(),
        this.re_enter_timeout_
      )
      this.re_enter_timeout_ += this.reenter_df_
      this.re_enter_timeout_ = Math.min(this.re_enter_timeout_, 5000)
    }
  }

  private InternalSubscribe(topic: string, qos: number = 0) {
    if (this.state_ === ROP.STATE_ENTERED) {
      this.mqttClient_.subscribe(topic, { qos: qos })
    }
  }

  private InternalUnSubscribe(topic: string) {
    if (this.state_ === ROP.STATE_ENTERED) {
      this.mqttClient_.unsubscribe(topic)
    }
  }

  private InternalEnter() {
    if (this.timer_) {
      clearTimeout(this.timer_)
      this.timer_ = null
    }

    let port_ = 0

    if (this.state_ === ROP.STATE_REENTERING) {
      super.emit('reconnect')
    }
    if (!this.client_id_) {
      console.log(this.client_id_)
      this.client_id_ = `ws2-${this.getUuid()}`
    }
    if (this.useSSL_) {
      port_ = 8300
      // TODO mqtt ssl
      // this.ICS_ADDR = 'mqttdms.aodianyun.com'
    } else {
      port_ = 8000
    }
    if (this.mqttClient_) {
      try {
        this.mqttClient_.disconnect()
      } catch (err) {
        console.error(err)
      }
    }
    this.mqttClient_ = new Paho.Client(this.ICS_ADDR, port_, this.client_id_)
    this.mqttClient_.onConnectionLost = (responseObject: {
      errorCode: number
      errorMessage: any
    }) => {
      if (responseObject.errorCode !== 0) {
        super.emit('offline', responseObject.errorMessage)
        this.ReEnter()
      }
    }
    this.mqttClient_.onMessageArrived = (message: {
      destinationName: string
      payloadString: string
    }) => {
      if (message.destinationName === '__sys__') {
        try {
          const msg = JSON.parse(message.payloadString)
          if (msg.cmd === 'kill') {
            super.emit('connectold')
            super.emit('losed')
            this.Leave()
            return
          }
        } catch (err) {
          console.error(err)
        }
      }
      super.emit('publish_data', message.payloadString, message.destinationName)
    }
    try {
      this.mqttClient_.connect({
        timeout: 10, // connect timeout
        userName: this.pubKey_,
        password: this.subKey_,
        keepAliveInterval: 60, // keepalive
        cleanSession: true,
        useSSL: this.useSSL_,
        onSuccess: () => {
          this.state_ = ROP.STATE_ENTERED
          this.re_enter_timeout_ = this.reenter_df_
          this.topic_list_.map(item =>
            this.InternalSubscribe(item.topic, item.qos)
          )
          super.emit('enter_suc')
        },
        onFailure: (err: { errorMessage: string }) => {
          if (this.state_ === ROP.STATE_ENTERING) {
            console.log(err)
            if (this.enter_times_++ >= 3) {
              this.state_ = ROP.STATE_ENTER_FAILED
              this.enter_times_ = 0
              super.emit('enter_fail', err.errorMessage)
              this.Leave()
            } else {
              setTimeout(() => this.InternalEnter(), 1000)
            }
          } else if (this.state_ === ROP.STATE_REENTERING) {
            console.error(err)
            super.emit('offline', err.errorMessage)
            this.ReEnter()
          }
        },
      })
    } catch (err) {
      console.error(err)
      this.ReEnter()
    }
  }

  Enter(pubKey: string, subKey: string, client_id: string, useSSL: boolean) {
    if (this.state_ === ROP.STATE_INIT) {
      this.state_ = ROP.STATE_ENTERING
      this.pubKey_ = pubKey
      this.useSSL_ = !!useSSL
      this.subKey_ = subKey
      if (!this.subKey_) {
        this.subKey_ = pubKey
      }
      if (client_id) {
        this.client_id_ = client_id
      }

      this.InternalEnter()
    }
  }

  Leave() {
    this.state_ = ROP.STATE_INIT
    this.enter_times_ = 0
    clearTimeout(this.timer_)
    try {
      if (this.mqttClient_) this.mqttClient_.disconnect()
    } catch (err) {
      console.error(err)
    }
  }

  On(evt: string, func: any) {
    super.on(evt, func)
  }

  Publish(body: string, topic: string, qos: Qos = 0, retain: boolean = true) {
    if (this.state_ === ROP.STATE_ENTERED) {
      const message = new Paho.Message(body)
      message.destinationName = topic
      message.qos = qos
      message.retained = Boolean(retain)
      this.mqttClient_.send(message)
    }
  }

  Subscribe(topic: string, qos: number = 0) {
    const strTopic = topic.toString()
    if (!topic || topic.length === 0) return
    for (let k = 0; k < this.topic_list_.length; k++) {
      if (this.topic_list_[k].topic === strTopic) {
        return
      }
    }

    let numQos = Number(qos)
    if (numQos > 2) numQos = 2
    if (numQos < 0) numQos = 0
    this.topic_list_.push({ topic: strTopic, qos: numQos })
    this.InternalSubscribe(strTopic, numQos)
  }

  UnSubscribe(topic: string) {
    const strTopic = topic.toString()
    if (!strTopic || strTopic.length === 0) return

    this.topic_list_.forEach((item, index) => {
      if (item.topic === strTopic) {
        this.topic_list_.splice(index, 1)
        this.InternalUnSubscribe(strTopic)
      }
    })
  }
}

export default ROP
