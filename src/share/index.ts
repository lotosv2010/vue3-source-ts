export const isObject = (val) => typeof val == 'object' && val !== null
export const isSymbol = (val) => typeof val == 'symbol'
export const isArray = Array.isArray
export const isInteger = (val) => '' + parseInt(val, 10) === val
export const hasOwnProperty = Object.prototype.hasOwnProperty
export const hasOwn = (val, key) => hasOwnProperty.call(val, key)
export const hasChange = (value, oldValue) => value !== oldValue
export const isString = (val) => typeof val == 'string'
export const isFunction = (val) => typeof val == 'function'
export * from './shapeFlags'