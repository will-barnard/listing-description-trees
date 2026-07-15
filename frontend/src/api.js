const API_BASE = '/api'

// Fired on any 401 so the auth store / router can react (clear user state,
// redirect to /login, show a "session expired" message when the token had
// simply expired rather than just being absent).
let onUnauthorized = null
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })

  if (res.status === 401) {
    const body = await res.json().catch(() => ({}))
    if (onUnauthorized) onUnauthorized(body.code)
    throw new Error(body.error || 'Not authenticated')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }

  if (res.status === 204) return null
  return res.json()
}

export const api = {
  // Auth
  getAuthStatus: () => request('/auth/status'),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/me'),

  // User management (admin only)
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUserRole: (id, role) => request(`/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // App settings (readable by anyone signed in, editable by admins only)
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Trees
  getTrees: () => request('/trees'),
  getTree: (id) => request(`/trees/${id}`),
  createTree: (data) => request('/trees', { method: 'POST', body: JSON.stringify(data) }),
  updateTree: (id, data) => request(`/trees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTree: (id) => request(`/trees/${id}`, { method: 'DELETE' }),
  importTree: (data) => request('/trees/import', { method: 'POST', body: JSON.stringify(data) }),

  // Nodes
  getChildren: (treeId, parentId) => {
    const params = new URLSearchParams({ tree_id: treeId })
    if (parentId != null) params.set('parent_id', parentId)
    return request(`/nodes/children?${params}`)
  },
  getNode: (id) => request(`/nodes/${id}`),
  createNode: (data) => request('/nodes', { method: 'POST', body: JSON.stringify(data) }),
  batchCreateNodes: (data) => request('/nodes/batch', { method: 'POST', body: JSON.stringify(data) }),
  updateNode: (id, data) => request(`/nodes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  moveNode: (id, newParentId) => request(`/nodes/${id}/move`, { method: 'PUT', body: JSON.stringify({ new_parent_id: newParentId }) }),
  deleteNode: (id) => request(`/nodes/${id}`, { method: 'DELETE' }),
  restoreNodes: (nodes) => request('/nodes/restore', { method: 'POST', body: JSON.stringify({ nodes }) }),

  // Templates
  getTemplates: () => request('/templates'),
  createTemplate: (data) => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id, data) => request(`/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' })
}
