import { hasChange, hasOwn, isArray, isInteger, isObject, isSymbol } from "../share/index"
import { track, trigger } from "./effect"
import { reactive } from "./reactive"

function createGet() {
  return function get(target, key, receiver) {
    const res = Reflect.get(target, key, receiver) // target[key]
    // 如果 key 是symbol类型
    if(isSymbol(key)) {
      return res
    }
    // todo: 依赖收集
    track(target, key)
    console.log(`收集到属性 ${key} target为 ${target}`)
    // 递归代理
    if(isObject(res)) {
      return reactive(res)
    }
    return res
  }
}

function createSet() {
  return function set(target, key, value, receiver) {
    // 新增还是修改
    const oldValue = target[key]
    // 看一下有没有这个属性
    // 第一种是数组新增的逻辑，第二种是对象新增的逻辑
    const hasKey = isArray(target) && isInteger(key) ? Number(key) < target.length : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)

    // todo:触发更新
    if(!hasKey) { // 新增
      console.log(`新增属性 ${key} 值为 ${value}`)
      trigger(target, 'add', key, value)
    } else if (hasChange(value, oldValue)){ // 修改
      console.log(`修改属性 ${key} 值为 ${value}`)
      trigger(target, 'set', key, value, oldValue)
    }
    return result
  }
}

// 为了预置参数
const get = createGet()
const set = createSet()

export const mutableHandlers = {
  get,
  set
}