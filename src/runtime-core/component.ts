import { isFunction } from "../share/index"

export function createComponentInstance(vnode) {
  const instance = {
    type: vnode.type,
    props: {},
    vnode,
    render: null,
    setupState: null,
    isMounted: false //默认没有挂载
  }
  return instance
}

// 合并setup 和 render
function finishComponentSetup(instance) {
  const Component = instance.type
  // 默认 render 优先级高于 setup 返回的 render
  if(Component.render) {
    instance.render = Component.render
  } else if(!instance.render) {
    // compile(Component.template) // 编译成render函数，即模版的编译过程
  }
  // vue3 兼容 vue2 的属性，如 data component watch...
  // vue2 和 vue3 中的 setup 返回的结果做合并操作
  // applyOptions()
}

function handleSetupResult(instance, setupResult) {
  if(isFunction) {
    instance.render = setupResult // 获取render方法
  } else {
    instance.setupState = setupResult
  }
  finishComponentSetup(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type // 组件的虚拟节点
  const { setup } = Component
  if(setup) {
    const setupResult = setup() // 获取 setup 返回的值
    // 判断返回值类型
    handleSetupResult(instance, setupResult)
  }
}

export function setupComponent(instance) {
  // 1.源码中会对属性进行初始化
  // 2.源码中会对插槽进行初始化
  // 3.调用 setup 方法
  setupStatefulComponent(instance)
}