<template>
  <div class="home">
    <div class="home-header">
      <h1>Your Trees</h1>
      <button class="btn btn-primary" @click="showCreate = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Tree
      </button>
    </div>

    <div v-if="store.loading" class="loading">Loading trees…</div>

    <div v-else-if="store.trees.length === 0" class="empty">
      <p>No trees yet. Create your first one to get started.</p>
    </div>

    <div v-else class="tree-grid">
      <div v-for="tree in store.trees" :key="tree.id" class="tree-card card">
        <div class="tree-card-header">
          <h3>{{ tree.name }}</h3>
          <button class="btn-icon btn-danger" @click.stop="confirmDelete(tree)" title="Delete tree">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
        <p v-if="tree.description" class="tree-desc">{{ tree.description }}</p>
        <p class="tree-meta">by {{ tree.created_by }} · {{ formatDate(tree.updated_at) }}</p>
        <div class="tree-actions">
          <router-link :to="`/navigate/${tree.id}`" class="btn btn-ghost btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Browse
          </router-link>
          <router-link :to="`/design/${tree.id}`" class="btn btn-ghost btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            Design
          </router-link>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
      <div class="modal">
        <h2>New Tree</h2>
        <div class="form-group">
          <label>Name</label>
          <input v-model="newTree.name" placeholder="e.g. Product Descriptions" @keyup.enter="createTree" autofocus />
        </div>
        <div class="form-group">
          <label>Description (optional)</label>
          <textarea v-model="newTree.description" rows="2" placeholder="What is this tree for?"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="showCreate = false">Cancel</button>
          <button class="btn btn-primary" @click="createTree" :disabled="!newTree.name.trim()">Create</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal">
        <h2>Delete "{{ deleteTarget.name }}"?</h2>
        <p style="color: var(--text-muted); margin-bottom: 16px;">This will permanently delete the tree and all its nodes. This cannot be undone.</p>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="deleteTarget = null">Cancel</button>
          <button class="btn btn-primary" style="background: var(--danger);" @click="doDelete">Delete</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useTreeStore } from '../stores/tree'
import { api } from '../api'

const store = useTreeStore()
const showCreate = ref(false)
const newTree = ref({ name: '', description: '' })
const deleteTarget = ref(null)

onMounted(() => store.fetchTrees())

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function createTree() {
  if (!newTree.value.name.trim()) return
  await api.createTree(newTree.value)
  newTree.value = { name: '', description: '' }
  showCreate.value = false
  store.fetchTrees()
}

function confirmDelete(tree) {
  deleteTarget.value = tree
}

async function doDelete() {
  await api.deleteTree(deleteTarget.value.id)
  deleteTarget.value = null
  store.fetchTrees()
}
</script>

<style scoped>
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}

.home-header h1 {
  font-size: 1.5rem;
}

.tree-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.tree-card {
  transition: border-color var(--transition);
}

.tree-card:hover {
  border-color: var(--accent);
}

.tree-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.tree-card-header h3 {
  font-size: 1.1rem;
}

.tree-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.tree-meta {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.tree-actions {
  display: flex;
  gap: 8px;
}

.empty {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 20px;
}

.loading {
  text-align: center;
  color: var(--text-muted);
  padding: 60px 20px;
}
</style>
