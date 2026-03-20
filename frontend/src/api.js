const API_BASE = '/api'

let _config = null

async function getConfig() {
  if (_config) return _config
  try {
    const res = await fetch(`${API_BASE}/config`)
    _config = await res.json()
  } catch {
    _config = { authDisabled: false, authLoginUrl: '/login' }
  }
  return _config
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })

  if (res.status === 401) {
    const config = await getConfig()
    if (!config.authDisabled) {
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `${config.authLoginUrl}?return_url=${returnUrl}`
    }
    throw new Error('Not authenticated')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed: ${res.status}`)
  }

  return res.json()
}

export const api = {
  // Auth
  getMe: () => request('/me'),

  // Trees
  getTrees: () => request('/trees'),
  getTree: (id) => request(`/trees/${id}`),
  createTree: (data) => request('/trees', { method: 'POST', body: JSON.stringify(data) }),
  updateTree: (id, data) => request(`/trees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTree: (id) => request(`/trees/${id}`, { method: 'DELETE' }),

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
