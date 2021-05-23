import { createVNode } from "./vnode"

export function createAppApi(render) {
  return (rootComponent) => {
    const app = {
      // 此处的 mount 和平台无关
      mount(container) { 
        // 用户调用的mount方法
        const vnode = createVNode(rootComponent)
        render(vnode, container)
      }
    }
    return app
  }
}