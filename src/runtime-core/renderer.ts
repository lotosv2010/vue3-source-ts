import { effect } from "../reactivity/index"
import { ShapeFlags } from "../share/index"
import { createAppApi } from "./apiCreateApp"
import { createComponentInstance, setupComponent } from "./component"

function baseCreateRenderer(options) {
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp
  } = options
  
  const setupRenderEffect = (instance, initialVnode, container) => {
    effect(function componentEffect() {
      if(!instance.isMounted) {
        // 渲染组件中的内容
        const subTree = instance.subTree = instance.render() // 组件对应渲染的结果
        // 渲染子组件
        patch(null, subTree, container)
        instance.isMounted = true
      } else {
        // todo:更新逻辑
        let pre = instance.subTree // 上一次的渲染结果
        let next =instance.render()
        // console.log(pre, next)
        patch(pre, next, container)
      }
    })
  }

  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
       patch(null, children[i], container)
    }
  }

  const mountElement = (vnode, container, anchor) => {
    let { shapeFlag, props } = vnode
    let el = vnode.el = hostCreateElement(vnode.type)

    // 创建儿子节点
    if(shapeFlag & ShapeFlags.TEXT_CHILDREN) { // 文本
      hostSetElementText(el, vnode.children)
    } else if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 数组
      mountChildren(vnode.children, el)
    }
    // 渲染属性
    if(props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    hostInsert(el, container, anchor)
  }

  const patchProps = (oldProps, newProps, el) => {
    if(oldProps !== newProps) {
      // 新的属性，需要覆盖掉老的
      for(const key in newProps) {
        const prev = oldProps[key]
        const next = newProps[key]
        if(prev !== next) {
          hostPatchProp(el, key, prev, next)
        }
      }
      // 老的有属性，新的没有，需要删除老的
      for(const key in oldProps) {
        if(!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }

  const patchKeyChildren = (c1, c2, el) => {
    // 内部有优化策略
    let i = 0
    let e1 = c1.length - 1 // 老儿子中的最后一项索引
    let e2 = c2.length - 1 // 新儿子中的最后一项索引
    // 1. 从头比
    // abc
    // abde
    while(i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if(isSameVnodeType(n1, n2)) {
        patch(n1, n2, el) // 会递归比对子元素
      } else {
        break
      }
      i++
    }
    // console.log(i) // 2

    // 2. 从尾比
    // abc
    // eabc
    while (i <= e1 && i<= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]
      if(isSameVnodeType(n1, n2)) {
        patch(n1, n2, el)
      } else {
        break
      }
      e1--
      e2--
    }
    // console.log(i, e1, e2) // 0 -1 0

    // 3.只考虑元素新增和删除的情况
    // abc => abcd  => (i = 3, e1 = 2, e2 = 3)
    // abc => dabc  => (i = 0, e1 = -1, e2 = 0)
    // 只要 i 大于 e1 表示新增属性
    if(i > e1) {
      if(i <= e2) { // 表示有新增的部分
        // 先根据 e2 的下一个位置和数组长度进行比较
        const nextPos = e2 + 1
        const anchor = nextPos < c2.length ? c2[nextPos].el : null
        while(i <= e2) {
          patch(null, c2[i], el, anchor)
          i++
        }
      }
    } else if(i > e2){
      // 4.老的元素比新的多，删除
      // abcd => abc  => (i = 3, e1 = 3, e2 = 2)
      while(i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 5.无规律情况，diff算法
      // ab cde fg  // i = s1 = 2, e1 = 4 
      // ab edch fg // i = s2 = 2, e2 = 5 => [5, 4, 3, 0]
      const s1 = i
      const s2 = i
      // 新的索引和 key 做一个映射表
      const keyToNewIndexMap = new Map()
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }
      // console.log(keyToNewIndexMap)
      const toBePatched = e2- s2 + 1
      const newIndexToOldMapIndex = new Array(toBePatched).fill(0)

      // 只做相同属性的diff，但位置可能不变
      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]
        let newIndex = keyToNewIndexMap.get(prevChild.key) // 获取新的索引
        if(newIndex == undefined) {
          hostRemove(prevChild.el) // 老的有，新的没有删除
        } else {
          newIndexToOldMapIndex[newIndex - s2] = i + 1
          patch(prevChild, c2[newIndex], el)
        }
      }
      // console.log(newIndexToOldMapIndex)

      // 最长增长序列
      let increasingIndexSequence = getSequence(newIndexToOldMapIndex)
      // console.log('increasingIndexSequence', increasingIndexSequence) // [0, 1]
      let j = increasingIndexSequence.length - 1

      // 倒序插入
      for (let i = toBePatched - 1; i >=0; i--) {
        const nextIndex = s2 + i // [edch] 找到h
        const nextChild = c2[nextIndex] // 找到h
        let anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null // 找到当前元素的下一个

        if(newIndexToOldMapIndex[i] == 0) { // 这是一个新元素，直接创建并插入到当前元素的下一个
          patch(null, nextChild, el, anchor)
        } else {
          // 根据参照物将节点直接移动过去，所有节点会动
          // 但是有些节点可以不动，需要 通过 getSequence 优化
          if(j < 0 || i != increasingIndexSequence[j]) {
            console.log(111)
            hostInsert(nextChild.el, el, anchor)
          } else {
            console.log(222)
            j--
          }
        }
      }
    }
  }

  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children // 获取所有老的节点
    const c2 = n2.children // 获取所有新的节点
    const prevShapeFlag = n1.shapeFlag // 上一次元素的类型
    const shapeFlag = n2.shapeFlag // 当前元素的类型

    if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 老的是文本，新的是文本 => 新的覆盖老的
      // 老的是数组，新的是文本 => 新的覆盖老的
      if(c2 !== c1) {
        hostSetElementText(el, c2)
      }
    } else {
      // 新的是数组
      if(prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 老的是数组，新的是数组 => diff算法
        // todo:diff算法
        console.log('diff算法')
        patchKeyChildren(c1, c2, el)
      } else {
        // 老的是文本，新的是数组 => 移除老的文本，生成新的节点
        if(prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 移除老的
          hostSetElementText(el, '')
        }
        if(shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 插入新的节点
          for(let i = 0; i < c2.length; i++) {
            patch(null, c2[i], el)
          }
        }
      }
    }

    // 老的是数组，新的是数组 => diff算法
  }

  const patchElement = (n1, n2, container) => {
    // 如果n1 和 n2 的类型一样
    let el = (n2.el = n1.el)
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    // 比对前后属性的元素差异
    patchProps(oldProps, newProps, el)
    // 比较子节点属性
    patchChildren(n1, n2, el)
  }
  const mountComponent = (initialVnode, container) => {
    // 组件挂载逻辑
    // 1.创建组件实例,组件实例要记录当前组件的状态
    const instance = initialVnode.component = createComponentInstance(initialVnode)
    // 2.找到组件的render方法
    setupComponent(instance)
    // 3.执行render方法
    // 调用render方法,如果render方法中数据变化了，会重新渲染
    // 给组件创建一个 effect 用于渲染 watcher
    setupRenderEffect(instance, initialVnode, container)
  }
  const updateComponent = (n1, n2, container) => {}

  const processElement =(n1, n2, container, anchor) => {
    if(!n1) {
      mountElement(n2, container, anchor)
    } else {
      // 比较两个虚拟节点
      patchElement(n1, n2, container)
    }
  }
  const processComponent =(n1, n2, container) => {
    if(!n1) {
      mountComponent(n2, container)
    } else {
      updateComponent(n1, n2, container)
    }
  }

  const isSameVnodeType = (n1, n2) => {
    return n1.type == n2.type && n1.key === n2.key
  }

  /**
   * 需要将虚拟节点变成真实节点，挂载的容器上
   * @param n1 老节点
   * @param n2 新节点
   * @param container 容器
   */
  const patch = (n1,n2, container, anchor = null) => {
    let { shapeFlag } = n2

    // 老节点存在并且新老节点不一样的情况
    if(n1 && !isSameVnodeType(n1, n2)) {
      // 删除老节点
      hostRemove(n1.el)
      n1 = null
    }

    // 例如: 20,组件孩子里有数组，4 + 16
    // 10100 => 20
    // 00001 => ShapeFlags.ELEMENT
    // & 都是1才是1，否则为0: 00000 => 不是组件
    if(shapeFlag & ShapeFlags.ELEMENT) {
      processElement(n1, n2, container, anchor)
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
      // 例如: 20
      // 10100 => 20
      // 00100 => ShapeFlags.ELEMENT
      // & 都是1才是1，否则为0: 00100 => 是组件
      processComponent(n1, n2, container)
    }
  }

  const render = (vnode, container) => {
    // 需要将虚拟节点变成真实节点，挂载的容器上
    patch(null, vnode, container) // 第一次渲染
  }

  return {
    createApp: createAppApi(render)
  }
}

// 返回最长递增子序列的索引
function getSequence(arr) {
  const p = arr.slice()
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {
      j = result[result.length - 1]
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }
      u = 0
      v = result.length - 1
      while (u < v) {
        c = ((u + v) / 2) | 0
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

export function createRenderer(options) {
  // options 是平台传过来的方法，不同的平台可以实现不同的操作逻辑
  return baseCreateRenderer(options)
}