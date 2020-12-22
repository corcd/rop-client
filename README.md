# Rop Client

基于 typescript 重写的 ROP 客户端

## usage

### 直接引入

将 `dist/index.js` 取出后，在工程内引用，或者使用 `<script>` 标签全局引入

```javascript
import ROP from '***.js'

const rc = new ROP({
  ICS_ADDR: '*',
  ROP_FLASH_SITE: '*',
  PORT: xxxx,
  SSL_PORT: xxxx
})

rc.On('*', () => {})
```

### NPM 安装

```bash
sudo npm install @gdyfe/rop-client --save
sudo yarn add @gdyfe/rop-client
```

```javascript
import ROP from '@gdyfe/rop-client'

const rc = new ROP({
  ICS_ADDR: '*',
  ROP_FLASH_SITE: '//*'
})

rc.On('*', () => {})
```
