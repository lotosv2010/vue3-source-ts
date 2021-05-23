import { isArray, isObject, isString, ShapeFlags } from "../share/index"

// 创建组件的虚拟节点
export function createVNode(type, props: any = {}, children = null) {
  const shapeFlag = isString(type) ?
    ShapeFlags.ELEMENT :
    isObject(type) ?
      ShapeFlags.STATEFUL_COMPONENT :
      0

  // 虚拟节点可以表示 dom 结构，也可以用来表示组件
  const vnode = {
    type,
    props,
    children,
    component: null, // 组件的实例
    el: null, // 虚拟节点要和真实节点做一个映射
    key: props.key,
    shapeFlag // 虚拟节点的类型(元素、组件)，vue3中的非常优秀的做法
  }

  if(isArray(children)) {
    //例如: 1 |= 16 ==> 17
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  } else {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  }

  return vnode
}