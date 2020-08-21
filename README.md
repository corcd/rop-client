<!--
 * @Author: Whzcorcd
 * @Date: 2020-08-21 11:37:56
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-08-21 12:24:45
 * @Description: file content
-->
# Rop Client

基于 typescript 重写的 class 语法 rop 客户端

## usage

### 直接引入

将 `dist/index.js` 取出后，在工程内引用，或者使用 `<script>` 标签全局引入

```javascript
import ROP from '***.js'

const rc = new ROP({
  ICS_ADDR: '*',
  ROP_FLASH_SITE: '//*'
})

rc.On('*', () => {})
```

### NPM 安装

```bash
sudo npm install @whzcorcd/rop-client --save
sudo yarn add @whzcorcd/rop-client
```

```javascript
import ROP from '@whzcorcd/rop-client'

const rc = new ROP({
  ICS_ADDR: '*',
  ROP_FLASH_SITE: '//*'
})

rc.On('*', () => {})
```
