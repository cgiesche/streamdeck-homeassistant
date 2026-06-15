export class LruCache {
  constructor(maxSize) {
    this._max = maxSize
    this._cache = new Map()
  }

  get(key) {
    if (!this._cache.has(key)) return null
    const value = this._cache.get(key)
    this._cache.delete(key)
    this._cache.set(key, value)
    return value
  }

  set(key, value) {
    if (this._cache.has(key)) {
      this._cache.delete(key)
    } else if (this._cache.size >= this._max) {
      this._cache.delete(this._cache.keys().next().value)
    }
    this._cache.set(key, value)
  }
}
