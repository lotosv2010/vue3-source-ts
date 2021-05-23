import { createRenderer } from "../runtime-core/index"
import { nodeOps } from "./nodeOps"
import { patchProp } from "./patchProp"

const renderOptions = { ...nodeOps, patchProp } // 平台相关的操作，dom 操作
function ensureRenderer() {
  // 平台相关的操作传递到核心模块
  return createRenderer(renderOptions)
}

export function createApp(rootComponent) {
  // 1.根据组件，创建一个渲染器
  const app = ensureRenderer().createApp(rootComponent)
  const { mount } = app
  app.mount = function (container) {
    container = document.querySelector(container)
    // 1.挂载时需要情况容器，再进行挂载
    container.innerHTML = ''
    mount(container)
  }
  return app
}