function patchClass(el, value) {
  if(value == null) {
    value = ""
  }
  el.className = value
}

function patchStyle(el, prev, next) {
  const style = el.style
  if(!next) {
    el.removeAttribute('style') //不需要样式
  } else {
    // 新增样式
    for (const key in next) {
      style[key] = next[key]
    }
    // 删除样式
    if(prev) {
      for (const key in prev) {
        if(!next[key]) {
          style[key] = ''
        }
      }
    }
  }
}

function patchAttr(el, key, value) {
  if(!value) {
    el.removeAttribute(key)
  } else {
    el.setAttribute(key, value)
  }
}

export function patchProp(el, key, prevValue, nextValue) {
  switch (key) {
    case 'class':
      patchClass(el, nextValue)
      break;
    case 'style':
      patchStyle(el, prevValue, nextValue)
      break
    default:
      patchAttr(el, key, nextValue)
      break;
  }
}