// Loads user-selected images inside Stream Deck's restricted webview and
// normalizes them to square PNG data URIs.

const ICON_SIZE = 144

function readBlobAsDataUri(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(reader.error?.name ?? 'FileReader failed'))
    reader.readAsDataURL(blob)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('could not decode image'))
    img.src = src
  })
}

function scaleToIconDataUri(img) {
  const canvas = document.createElement('canvas')
  canvas.width = ICON_SIZE
  canvas.height = ICON_SIZE
  const ctx = canvas.getContext('2d')
  const scale = Math.min(ICON_SIZE / img.width, ICON_SIZE / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, (ICON_SIZE - w) / 2, (ICON_SIZE - h) / 2, w, h)
  return canvas.toDataURL('image/png')
}

function xhrGetBlob(url) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    // file:// responses report status 0 on success, so check the payload.
    xhr.onload = () =>
      xhr.response && xhr.response.size > 0
        ? resolve(xhr.response)
        : reject(new Error(`XHR empty response (status ${xhr.status})`))
    xhr.onerror = () => reject(new Error(`XHR failed (status ${xhr.status})`))
    xhr.send()
  })
}

/**
 * Extracts a file:// URL from a file input's value. Stream Deck's webview
 * prefixes it with C:\fakepath\ but, unlike regular browsers, appends the
 * real absolute path, URL-encoded.
 * @returns {string|null}
 */
export function fileUrlFromInputValue(rawValue) {
  if (!rawValue) return null
  const path = decodeURIComponent(rawValue.replace(/^c:\\fakepath\\/i, ''))
  if (!path.includes('/') && !path.includes('\\')) return null
  return 'file:///' + path.replace(/\\/g, '/').replace(/^\/+/, '')
}

/**
 * Extracts a file:// URL from a drop event's DataTransfer. Files dragged
 * from the OS also arrive as a text/uri-list of file:// URLs.
 * @returns {string|null}
 */
export function fileUrlFromDataTransfer(dataTransfer) {
  const uriList = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain') || ''
  return (
    uriList
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#') && /^file:/i.test(line)) ?? null
  )
}

/**
 * Loads an image from a File and/or file:// URL and returns it as a
 * 144x144 PNG data URI. Tries several strategies because Stream Deck's
 * webview blocks direct File reads but allows XHR to file:// URLs.
 * @throws {Error} when no strategy succeeds
 */
export async function loadIconAsDataUri(file, fileUrl) {
  const attempts = []
  if (file) {
    attempts.push(() => readBlobAsDataUri(file))
    attempts.push(async () => URL.createObjectURL(file))
  }
  if (fileUrl) {
    // fetch() rejects file:// URLs in Chromium, hence XHR.
    attempts.push(async () => URL.createObjectURL(await xhrGetBlob(fileUrl)))
    // Last resort; may taint the canvas but proves the file is readable.
    attempts.push(async () => fileUrl)
  }

  const errors = []
  for (const attempt of attempts) {
    let src
    try {
      src = await attempt()
      const img = await loadImage(src)
      return scaleToIconDataUri(img)
    } catch (e) {
      errors.push(e.message)
    } finally {
      if (src && src.startsWith('blob:')) URL.revokeObjectURL(src)
    }
  }
  throw new Error(
    `Could not load image (${errors.join('; ')}) [source: ${fileUrl || file?.name || 'n/a'}]`
  )
}
