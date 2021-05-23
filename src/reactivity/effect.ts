import { isArray, isInteger } from "../share/index"

let activeEffect // 用来存储当前的effect函数，相当于vue2的Dep.target
let uid = 0
const effectStack = []
function createReactiveEffect(fn, options) {
  const effect = function () {
    if (!effectStack.includes(effect)) { // 防止递归执行
      try {
        activeEffect = effect
        effectStack.push(activeEffect)
        // 用户自己写的逻辑，内部会对数据进行取值操作
        // 在取值时，可以拿到这个activeEffect
        return fn()
      } finally {
        effectStack.pop()
        activeEffect = null
      }
    }
  }
  effect.id = uid++
  effect.deps = [] // 用来表示effect中依赖了哪些属性
  effect.options = options
  return effect
}

// 收集依赖
// 将属性和effect做一个关联
// 收集到的数据结构为：{ object: {key: [effect1, effect2, ....]}}
const targetMap = new WeakMap()
export function track(target, key) {
  if (!activeEffect) { // 外面没有调用effect时，直接返回
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  // 如果没有effect就把effect放到集合中
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep) // 双向记忆的过程
  }
  // console.log(targetMap)
}

// 触发更新
export function trigger(target, type, key, value?, oldValue?) {
  // 判断属性是否存在
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
  const run = effects => {
    if (effects) effects.forEach(effect => effect());
  }
  // 数组处理 length
  if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      // 如果改的长度小于数组原有的长度时应该更新视图
      if(key == 'length' || key >= value) {
        run(dep)
      }
    });
  } else {
    // 对象处理
    if (key != void 0) { // 说明修改了key
      run(depsMap.get(key))
    }
    switch (type) {
      case 'add': // 如果给数组通过索引增加选项
        if(isArray(target)) {
          if(isInteger(key)) {
            // 因为如果页面中直接使用了数组也会对数组进行取值操作
            // length 进行收集，新增属性时直接触发 length 即可
            run(depsMap.get('length'))
          }
        }
        break;
    
      default:
        break;
    }
  }
}

export function effect(fn, options: any = {}) { // 等价vue中的 watcher
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    effect()
  }
  return effect
}