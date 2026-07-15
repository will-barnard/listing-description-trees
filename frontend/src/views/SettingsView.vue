<template>
  <div class="settings">
    <div class="settings-header">
      <router-link to="/" class="btn btn-ghost btn-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </router-link>
      <h1>Settings</h1>
    </div>

    <!-- User Management (admin only) -->
    <section class="settings-section" v-if="auth.isAdmin">
      <div class="section-header">
        <h2>Users</h2>
        <button class="btn btn-primary btn-sm" @click="openCreateUser">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New User
        </button>
      </div>

      <p class="section-desc">Only admins can create accounts — there's no self-service sign-up.</p>

      <p v-if="userError" class="banner banner-danger">{{ userError }}</p>

      <div v-if="usersLoading" class="loading">Loading users…</div>

      <div v-else class="user-list">
        <div v-for="u in users" :key="u.id" class="user-row card">
          <div class="user-info">
            <span class="user-name">{{ u.username }}</span>
            <span class="user-email">{{ u.email }}</span>
          </div>
          <span class="badge" :class="{ 'badge-admin': u.role === 'admin' }">{{ u.role }}</span>
          <div class="user-actions">
            <button
              class="btn btn-ghost btn-sm"
              @click="toggleRole(u)"
              :disabled="u.id === auth.user.id"
              :title="u.id === auth.user.id ? 'Cannot change your own role' : ''"
            >
              {{ u.role === 'admin' ? 'Make user' : 'Make admin' }}
            </button>
            <button
              class="btn-icon btn-danger"
              @click="confirmDeleteUser(u)"
              :disabled="u.id === auth.user.id"
              title="Delete user"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Create User Modal -->
    <div v-if="userModal.open" class="modal-overlay" @click.self="userModal.open = false">
      <div class="modal">
        <h2>New User</h2>
        <p v-if="userModal.error" class="banner banner-danger">{{ userModal.error }}</p>
        <div class="form-group">
          <label>Email</label>
          <input v-model="userModal.email" type="email" placeholder="name@example.com" autofocus />
        </div>
        <div class="form-group">
          <label>Username</label>
          <input v-model="userModal.username" placeholder="e.g. jsmith" />
        </div>
        <div class="form-group">
          <label>Temporary Password</label>
          <input v-model="userModal.password" type="text" placeholder="At least 8 characters" />
          <p class="field-help">Share this with them directly — there's no email invite flow.</p>
        </div>
        <div class="form-group">
          <label>Role</label>
          <select v-model="userModal.role">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="userModal.open = false">Cancel</button>
          <button class="btn btn-primary" @click="saveUser" :disabled="!canSaveUser">Create</button>
        </div>
      </div>
    </div>

    <!-- Delete User Confirm -->
    <div v-if="deleteUserTarget" class="modal-overlay" @click.self="deleteUserTarget = null">
      <div class="modal">
        <h2>Delete "{{ deleteUserTarget.username }}"?</h2>
        <p style="color: var(--text-muted); margin-bottom: 16px;">This account will lose access immediately. This cannot be undone.</p>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="deleteUserTarget = null">Cancel</button>
          <button class="btn btn-primary" style="background: var(--danger);" @click="doDeleteUser">Delete</button>
        </div>
      </div>
    </div>

    <!-- Child Node Templates -->
    <section class="settings-section">
      <div class="section-header">
        <h2>Child Node Templates</h2>
        <button class="btn btn-primary btn-sm" @click="openCreate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Template
        </button>
      </div>

      <p class="section-desc">Templates let you quickly add a set of child nodes to any node in the tree designer.</p>

      <div v-if="loading" class="loading">Loading templates…</div>

      <div v-else-if="templates.length === 0" class="empty">
        <p>No templates yet. Create one to speed up your tree building.</p>
      </div>

      <div v-else class="template-list">
        <div v-for="tmpl in templates" :key="tmpl.id" class="template-card card">
          <div class="template-header">
            <h3>{{ tmpl.name }}</h3>
            <div class="template-actions">
              <button class="btn-icon" @click="openEdit(tmpl)" title="Edit">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              </button>
              <button class="btn-icon btn-danger" @click="confirmDelete(tmpl)" title="Delete">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          <div class="template-children">
            <span v-for="(child, i) in tmpl.children" :key="i" class="badge">{{ child }}</span>
          </div>
          <p class="template-meta">{{ tmpl.children.length }} children · by {{ tmpl.created_by }}</p>
        </div>
      </div>
    </section>

    <!-- Create/Edit Modal -->
    <div v-if="modal.open" class="modal-overlay" @click.self="modal.open = false">
      <div class="modal">
        <h2>{{ modal.editing ? 'Edit' : 'New' }} Template</h2>
        <div class="form-group">
          <label>Template Name</label>
          <input v-model="modal.name" placeholder="e.g. Basic Product" autofocus />
        </div>
        <div class="form-group">
          <label>Child Labels</label>
          <p class="field-help">Each child will become a node when the template is applied.</p>
          <div class="child-inputs">
            <div v-for="(child, i) in modal.children" :key="i" class="child-input-row">
              <input
                v-model="modal.children[i]"
                :placeholder="`Child ${i + 1}`"
                @keyup.enter="addChildInput"
              />
              <button class="btn-icon btn-danger" @click="removeChildInput(i)" v-if="modal.children.length > 1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" @click="addChildInput" style="margin-top: 8px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add another
          </button>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="modal.open = false">Cancel</button>
          <button class="btn btn-primary" @click="saveTemplate" :disabled="!canSave">
            {{ modal.editing ? 'Save' : 'Create' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <h2>Delete "{{ deleteTarget.name }}"?</h2>
        <p style="color: var(--text-muted); margin-bottom: 16px;">This template will be permanently deleted. Trees already built from it are not affected.</p>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-primary" style="background: var(--danger);" @click="doDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { api } from '../api'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()

const templates = ref([])
const loading = ref(true)
const deleteTarget = ref(null)

const modal = reactive({
  open: false,
  editing: false,
  editId: null,
  name: '',
  children: ['']
})

const canSave = computed(() =>
  modal.name.trim().length > 0 && modal.children.some(c => c.trim().length > 0)
)

// User management (admin only)
const users = ref([])
const usersLoading = ref(true)
const userError = ref('')
const deleteUserTarget = ref(null)

const userModal = reactive({
  open: false,
  email: '',
  username: '',
  password: '',
  role: 'user',
  error: ''
})

const canSaveUser = computed(() =>
  userModal.email.trim().length > 0 &&
  userModal.username.trim().length > 1 &&
  userModal.password.length >= 8
)

onMounted(async () => {
  await fetchTemplates()
  if (auth.isAdmin) await fetchUsers()
})

async function fetchUsers() {
  usersLoading.value = true
  userError.value = ''
  try {
    users.value = await api.getUsers()
  } catch (err) {
    userError.value = err.message
  } finally {
    usersLoading.value = false
  }
}

function openCreateUser() {
  userModal.open = true
  userModal.email = ''
  userModal.username = ''
  userModal.password = ''
  userModal.role = 'user'
  userModal.error = ''
}

async function saveUser() {
  if (!canSaveUser.value) return
  userModal.error = ''
  try {
    await api.createUser({
      email: userModal.email.trim(),
      username: userModal.username.trim(),
      password: userModal.password,
      role: userModal.role
    })
    userModal.open = false
    await fetchUsers()
  } catch (err) {
    userModal.error = err.message
  }
}

async function toggleRole(u) {
  const newRole = u.role === 'admin' ? 'user' : 'admin'
  try {
    await api.updateUserRole(u.id, newRole)
    await fetchUsers()
  } catch (err) {
    userError.value = err.message
  }
}

function confirmDeleteUser(u) {
  deleteUserTarget.value = u
}

async function doDeleteUser() {
  try {
    await api.deleteUser(deleteUserTarget.value.id)
    deleteUserTarget.value = null
    await fetchUsers()
  } catch (err) {
    userError.value = err.message
    deleteUserTarget.value = null
  }
}

async function fetchTemplates() {
  loading.value = true
  try {
    templates.value = await api.getTemplates()
  } finally {
    loading.value = false
  }
}

function openCreate() {
  modal.open = true
  modal.editing = false
  modal.editId = null
  modal.name = ''
  modal.children = ['']
}

function openEdit(tmpl) {
  modal.open = true
  modal.editing = true
  modal.editId = tmpl.id
  modal.name = tmpl.name
  modal.children = [...tmpl.children]
  if (modal.children.length === 0) modal.children = ['']
}

function addChildInput() {
  modal.children.push('')
}

function removeChildInput(i) {
  modal.children.splice(i, 1)
}

async function saveTemplate() {
  if (!canSave.value) return
  const children = modal.children.filter(c => c.trim().length > 0)
  try {
    if (modal.editing) {
      await api.updateTemplate(modal.editId, { name: modal.name, children })
    } else {
      await api.createTemplate({ name: modal.name, children })
    }
    modal.open = false
    await fetchTemplates()
  } catch (err) {
    alert('Error saving template: ' + err.message)
  }
}

function confirmDelete(tmpl) {
  deleteTarget.value = tmpl
}

async function doDelete() {
  try {
    await api.deleteTemplate(deleteTarget.value.id)
    deleteTarget.value = null
    await fetchTemplates()
  } catch (err) {
    alert('Error deleting template: ' + err.message)
  }
}
</script>

<style scoped>
.settings-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.settings-header h1 {
  font-size: 1.5rem;
}

.settings-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.section-header h2 {
  font-size: 1.15rem;
}

.section-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

.template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.template-card {
  transition: border-color var(--transition);
}

.template-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.template-header h3 {
  font-size: 1rem;
}

.template-actions {
  display: flex;
  gap: 4px;
}

.template-children {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.template-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.field-help {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.child-inputs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.child-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.child-input-row input {
  flex: 1;
}

.empty, .loading {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.user-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.user-email {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.badge-admin {
  background: rgba(74, 222, 128, 0.12);
  color: var(--success);
}

.user-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.banner {
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 0.85rem;
  margin-bottom: 16px;
}

.banner-danger {
  background: var(--danger-bg);
  color: var(--danger);
}
</style>
