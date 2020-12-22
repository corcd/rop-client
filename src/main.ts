/*
 * @Author: Whzcorcd
 * @Date: 2020-08-20 10:01:49
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-10-27 18:21:08
 * @Description: file content
 */

import { IROP, Qos } from './types'

import EventEmitter from './event'
import Paho from 'paho-mqtt'

class ROP extends EventEmitter {
  public ROP_FLASH_SITE: string
  public ICS_ADDR: string
  public PORT: number
  public SSL_PORT: number

  private _topicList: any[]
  private _pubKey: string
  private _subKey: string
  private _mqttClient: any
  private _useSSL: boolean
  private _state: number
  private _reenterDf: number
  private _reEnterTimeout: number
  private _enterTimes: number
  private _clientId: string
  private _timer: any

  static STATE_INIT = 0
  static STATE_ENTERING = 4
  static STATE_ENTERED = 5
  static STATE_ENTER_FAILED = 6
  static STATE_REENTERING = 7

  constructor({
    ICS_ADDR = 'mqttdms.aodianyun.com',
    ROP_FLASH_SITE = 'cdn.aodianyun.com/dms/',
    PORT = 8000,
    SSL_PORT = 8300,
  }: IROP) {
    console.log(ICS_ADDR, ROP_FLASH_SITE, PORT, SSL_PORT)
    super()

    this.ICS_ADDR = ICS_ADDR
    this.ROP_FLASH_SITE = `//${ROP_FLASH_SITE}`
    this.PORT = PORT
    this.SSL_PORT = SSL_PORT

    this._topicList = []
    this._pubKey = ''
    this._subKey = ''
    this._mqttClient = null
    this._useSSL = false

    this._state = ROP.STATE_INIT

    this._reenterDf = 1000
    this._reEnterTimeout = this._reenterDf
    this._timer = null
    this._enterTimes = 0
    this._clientId = ''
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
    if (this._timer) return

    if (this._state === ROP.STATE_ENTERED || ROP.STATE_REENTERING) {
      this._state = ROP.STATE_REENTERING
      this._timer = setTimeout(() => this.InternalEnter(), this._reEnterTimeout)
      this._reEnterTimeout += this._reenterDf
      this._reEnterTimeout = Math.min(this._reEnterTimeout, 5000)
    }
  }

  private InternalSubscribe(topic: string, qos: number = 0): void {
    if (this._state === ROP.STATE_ENTERED) {
      this._mqttClient.subscribe(topic, { qos: qos })
    }
  }

  private InternalUnSubscribe(topic: string): void {
    if (this._state === ROP.STATE_ENTERED) {
      this._mqttClient.unsubscribe(topic)
    }
  }

  private InternalEnter(): void {
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = null
    }

    let _port = 0

    if (this._state === ROP.STATE_REENTERING) {
      super.emit('reconnect')
    }
    if (!this._clientId) {
      console.log(this._clientId)
      this._clientId = `ws2-${this.getUuid()}`
    }
    if (this._useSSL) {
      _port = this.SSL_PORT
      // TODO mqtt ssl
      // this.ICS_ADDR = 'mqttdms.aodianyun.com'
    } else {
      _port = this.PORT
    }
    if (this._mqttClient) {
      try {
        this._mqttClient.disconnect()
        this._mqttClient = null
      } catch (err) {
        console.error(err)
      }
    }
    this._mqttClient = new Paho.Client(this.ICS_ADDR, _port, this._clientId)
    this._mqttClient.onConnectionLost = (responseObject: {
      errorCode: number
      errorMessage: any
    }) => {
      if (responseObject.errorCode !== 0) {
        super.emit('offline', responseObject.errorMessage)
        this.ReEnter()
      }
    }
    this._mqttClient.onMessageArrived = (message: {
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
      this._mqttClient.connect({
        timeout: 10, // connect timeout
        userName: this._pubKey,
        password: this._subKey,
        keepAliveInterval: 60, // keepalive
        cleanSession: true,
        useSSL: this._useSSL,
        onSuccess: () => {
          this._state = ROP.STATE_ENTERED
          this._reEnterTimeout = this._reenterDf
          this._topicList.map(item =>
            this.InternalSubscribe(item.topic, item.qos)
          )
          super.emit('enter_suc')
        },
        onFailure: (err: { errorMessage: string }) => {
          if (this._state === ROP.STATE_ENTERING) {
            console.log(err)
            if (this._enterTimes++ >= 3) {
              this._state = ROP.STATE_ENTER_FAILED
              this._enterTimes = 0
              super.emit('enter_fail', err.errorMessage)
              this.Leave()
            } else {
              setTimeout(() => this.InternalEnter(), 1000)
            }
          } else if (this._state === ROP.STATE_REENTERING) {
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

  public Enter(
    pubKey: string,
    subKey: string,
    clientId: string,
    useSSL: boolean
  ): void {
    if (this._state === ROP.STATE_INIT) {
      this._state = ROP.STATE_ENTERING
      this._pubKey = pubKey
      this._useSSL = !!useSSL
      this._subKey = subKey
      if (!this._subKey) {
        this._subKey = pubKey
      }
      if (clientId) {
        this._clientId = clientId
      }

      this.InternalEnter()
    }
  }

  public Leave(): void {
    this._state = ROP.STATE_INIT
    this._enterTimes = 0
    clearTimeout(this._timer)
    try {
      if (this._mqttClient) {
        this._mqttClient.disconnect()
        this._mqttClient = null
      }
    } catch (err) {
      console.error(err)
    }
  }

  public On(evt: string, func: any): void {
    super.on(evt, func)
  }

  public Publish(
    body: string,
    topic: string,
    qos: Qos = 0,
    retain: boolean = true
  ): void {
    if (this._state === ROP.STATE_ENTERED) {
      const message = new Paho.Message(body)
      message.destinationName = topic
      message.qos = qos
      message.retained = Boolean(retain)
      this._mqttClient.send(message)
    }
  }

  public Subscribe(topic: string, qos: number = 0): void {
    const strTopic = topic.toString()
    if (!topic || topic.length === 0) return
    for (let k = 0; k < this._topicList.length; k++) {
      if (this._topicList[k].topic === strTopic) {
        return
      }
    }

    let numQos = Number(qos)
    if (numQos > 2) numQos = 2
    if (numQos < 0) numQos = 0
    this._topicList.push({ topic: strTopic, qos: numQos })
    this.InternalSubscribe(strTopic, numQos)
  }

  public UnSubscribe(topic: string): void {
    const strTopic = topic.toString()
    if (!strTopic || strTopic.length === 0) return

    this._topicList.forEach((item, index) => {
      if (item.topic === strTopic) {
        this._topicList.splice(index, 1)
        this.InternalUnSubscribe(strTopic)
      }
    })
  }
}

export default ROP
