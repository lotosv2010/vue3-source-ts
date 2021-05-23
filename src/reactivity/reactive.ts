import { isObject } from "../share/index"
import { mutableHandlers } from './baseHandlers'

// 做缓存使用
const proxyMap = new WeakMap()
function createReactiveObject(target, baseHandlers) {
  if(!isObject(target)) {
    return target
  }
  const existingProxy = proxyMap.get(target)
  if(existingProxy) {
    return existingProxy
  }

  // 只对最外层对象做代理，默认不会递归，而且不会重新重写对象中的属性
  const proxy = new Proxy(target, baseHandlers)
  // 将代理的对象和代理后的结果做一个映射表
  proxyMap.set(target, proxy)
  return proxy
}

export function reactive(target) {
  // 将目标变成响应式对象 Proxy
  return createReactiveObject(target, mutableHandlers)
}