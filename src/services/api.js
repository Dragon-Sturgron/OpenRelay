export async function apiRequest(path, options = {}) {
  const password = sessionStorage.getItem('openrelay_admin_password') || ''
  const headers = {
    ...(options.body ? { 'content-type': 'application/json' } : {}),
    ...(options.headers || {}),
  }
  if (password) headers.authorization = `Bearer ${password}`

  const response = await fetch(path, { ...options, headers })
  const text = await response.text()
  let payload = {}
  try {
    payload = text ? JSON.parse(text) : {}
  } catch {
    payload = { raw: text }
  }

  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `HTTP ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }
  return payload
}

export async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const element = document.createElement('textarea')
  element.value = value
  element.style.position = 'fixed'
  element.style.opacity = '0'
  document.body.appendChild(element)
  element.select()
  document.execCommand('copy')
  element.remove()
}
