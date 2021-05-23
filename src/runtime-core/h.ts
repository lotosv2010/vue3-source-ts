import { createVNode } from "./vnode";

// 穿件元素的虚拟节点
export function h(type, props = {}, children =null) {
  return createVNode(type, props, children)
}