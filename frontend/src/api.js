async function request(path, { method = 'GET', token, body } = {}) {
  const headers = {}
  if (token) headers.Authorization = 'Bearer ' + token
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const response = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || String(response.status))
  }
  return data
}

export function login(username, password) {
  return request('/login', { method: 'POST', body: { username, password } })
}

export function listUsers(token, search, field) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (search && field) params.set('field', field)
  const query = params.toString()
  return request('/users' + (query ? '?' + query : ''), { token })
}

export function getUser(token, uid) {
  return request('/users/' + encodeURIComponent(uid), { token })
}

export function getLastLogin(token, uid) {
  return request('/users/' + encodeURIComponent(uid) + '/last-login', { token })
}

export function getProfile(token, uid) {
  return request('/users/' + encodeURIComponent(uid) + '/profile', { token })
}

export function updateProfile(token, uid, profile) {
  return request('/users/' + encodeURIComponent(uid) + '/profile', { method: 'PUT', token, body: profile })
}

export function createUser(token, user) {
  return request('/users', { method: 'POST', token, body: user })
}

export function updateUser(token, uid, updates) {
  return request('/users/' + encodeURIComponent(uid), { method: 'PUT', token, body: updates })
}

export function deleteUser(token, uid) {
  return request('/users/' + encodeURIComponent(uid), { method: 'DELETE', token })
}

export async function getAvatarUrl(token, uid) {
  const response = await fetch('/users/' + encodeURIComponent(uid) + '/avatar', {
    headers: { Authorization: 'Bearer ' + token },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(String(response.status))
  return URL.createObjectURL(await response.blob())
}

export async function getQrUrl(token, uid) {
  const response = await fetch('/users/' + encodeURIComponent(uid) + '/qr', {
    headers: { Authorization: 'Bearer ' + token },
  })
  if (!response.ok) throw new Error(String(response.status))
  return {
    url: URL.createObjectURL(await response.blob()),
    target: response.headers.get('X-QR-Target'),
  }
}

export function getTunnel(token) {
  return request('/tunnel', { token })
}

export function startTunnel(token) {
  return request('/tunnel/start', { method: 'POST', token })
}

export function stopTunnel(token) {
  return request('/tunnel/stop', { method: 'POST', token })
}

export async function uploadAvatar(token, uid, file) {
  const response = await fetch('/users/' + encodeURIComponent(uid) + '/avatar', {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': file.type },
    body: file,
  })
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || String(response.status))
  }
  return data
}

export function decodeToken(token) {
  const payload = token.split('.')[1]
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
}

export function isSameUser(uid, user) {
  if (!uid || !user?.uid) return false
  return uid.toLowerCase() === user.uid.toLowerCase()
}

export function nameFromDn(dn) {
  const match = /^(?:uid|cn)=([^,]+)/.exec(dn)
  return match ? match[1] : dn
}
export function getLogs(token, filters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value)
  }
  const query = params.toString()
  return request('/Print_Log' + (query ? '?' + query : ''), { token })
}

export function sendChat(token, message) {
  return request('/chat', { method: 'POST', token, body: { message } })
}
