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

export function listUsers(token) {
  return request('/users', { token })
}

export function createUser(token, user) {
  return request('/users', { method: 'POST', token, body: user })
}

export function updateUser(token, uid, updates) {
  return request('/users/' + uid, { method: 'PUT', token, body: updates })
}

export function deleteUser(token, uid) {
  return request('/users/' + uid, { method: 'DELETE', token })
}
