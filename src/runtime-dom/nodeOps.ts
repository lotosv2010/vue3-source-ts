export const nodeOps = {
  createElement(type) {
    return document.createElement(type)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  insert(child, parent, anchor = null) {
    if(anchor) {
      parent.insertBefore(child, anchor)
    } else {
      parent.appendChild(child)
    }
  },
  remove(child) {
    const parent = child.parentNode
    parent && parent.removeChild(child)
  }
}