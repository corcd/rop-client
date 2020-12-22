/*
 * @Author: Whzcorcd
 * @Date: 2020-08-20 14:44:23
 * @LastEditors: Whzcorcd
 * @LastEditTime: 2020-12-22 10:32:19
 * @Description: file content
 */

// rollup.config.js
import typescript from 'rollup-plugin-typescript2'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'

export default {
  input: 'src/main.ts',
  output: {
    name: 'rop',
    file: 'dist/main.js',
    format: 'iife',
    exports: 'auto',
  },
  plugins: [
    resolve(),
    commonjs({
      // All of our own sources will be ES6 modules, so only node_modules need to be resolved with cjs
      include: 'node_modules/**',
    }),
    typescript({
      tsconfig: 'tsconfig.json',
    }),
  ],
}
