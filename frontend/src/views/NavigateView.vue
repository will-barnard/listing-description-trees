<template>
  <div class="navigate">
    <div class="nav-toolbar">
      <router-link to="/" class="btn btn-ghost btn-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        All Trees
      </router-link>
      <h2 v-if="store.currentTree">{{ store.currentTree.name }}</h2>
    </div>

    <div v-if="store.loading" class="loading">Loading…</div>

    <template v-else-if="store.currentTree">
      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <button class="crumb" @click="navigateTo(null)">
          {{ store.currentTree.name }}
        </button>
        <template v-for="ancestor in ancestors" :key="ancestor.id">
          <span class="crumb-sep">›</span>
          <button class="crumb" @click="navigateTo(ancestor.id)">
            {{ ancestor.label }}
          </button>
        </template>
        <template v-if="currentNode">
          <span class="crumb-sep">›</span>
          <span class="crumb crumb-active">{{ currentNode.label }}</span>
        </template>
      </nav>

      <!-- Leaf: show copy -->
      <div v-if="currentNode && isLeaf" class="copy-display card">
        <h3>{{ currentNode.label }}</h3>
        <div class="copy-text" v-html="renderCopy(currentNode.copy)"></div>
        <button class="btn btn-ghost btn-sm copy-btn" @click="copyToClipboard(currentNode.copy)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          {{ copied ? 'Copied!' : 'Copy text' }}
        </button>
      </div>

      <!-- Children list -->
      <div v-else class="children-list">
        <div v-if="children.length === 0" class="empty">
          <p>No items at this level yet.</p>
        </div>
        <button
          v-for="child in children"
          :key="child.id"
          class="child-item card"
          @click="navigateTo(child.id)"
        >
          <span class="child-label">{{ child.label }}</span>
          <span v-if="store.isLeaf(child.id)" class="badge">copy</span>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="child-arrow"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <!-- Back button -->
      <button
        v-if="currentNodeId !== null"
        class="btn btn-ghost back-btn"
        @click="goBack"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </button>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTreeStore } from '../stores/tree'

const props = defineProps({ treeId: [String, Number] })
const store = useTreeStore()

const currentNodeId = ref(null)
const copied = ref(false)

const currentNode = computed(() =>
  currentNodeId.value ? store.getNode(currentNodeId.value) : null
)

const ancestors = computed(() =>
  currentNodeId.value ? store.getAncestors(currentNodeId.value) : []
)

const children = computed(() => store.getChildren(currentNodeId.value))

const isLeaf = computed(() =>
  currentNodeId.value ? store.isLeaf(currentNodeId.value) : false
)

onMounted(() => store.fetchTree(parseInt(props.treeId)))

watch(() => props.treeId, (id) => {
  currentNodeId.value = null
  store.fetchTree(parseInt(id))
})

function navigateTo(nodeId) {
  currentNodeId.value = nodeId
  copied.value = false
}

function goBack() {
  if (currentNode.value && currentNode.value.parent_id !== null) {
    currentNodeId.value = currentNode.value.parent_id
  } else {
    currentNodeId.value = null
  }
  copied.value = false
}

function renderCopy(text) {
  if (!text) return '<em style="color:var(--text-muted)">No copy assigned.</em>'
  return text.split('\n').filter(p => p.trim()).map(p => {
    const escaped = p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<p>${escaped}</p>`
  }).join('')
}

async function copyToClipboard(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.left = '-9999px'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  }
}
</script>

<style scoped>
.nav-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.nav-toolbar h2 {
  font-size: 1.3rem;
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 24px;
  font-size: 0.9rem;
}

.crumb {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius);
  transition: background var(--transition);
}

.crumb:hover {
  background: var(--accent-bg);
}

.crumb-active {
  color: var(--text);
  cursor: default;
}

.crumb-active:hover {
  background: none;
}

.crumb-sep {
  color: var(--text-muted);
}

.children-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.child-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: border-color var(--transition), background var(--transition);
  text-align: left;
}

.child-item:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
}

.child-label {
  font-weight: 500;
}

.child-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

.copy-display {
  max-width: 720px;
}

.copy-display h3 {
  margin-bottom: 16px;
  font-size: 1.2rem;
}

.copy-text :deep(p) {
  margin-bottom: 12px;
  line-height: 1.7;
  color: var(--text);
}

.copy-btn {
  margin-top: 12px;
}

.back-btn {
  margin-top: 20px;
}

.empty {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.loading {
  text-align: center;
  color: var(--text-muted);
  padding: 60px;
}
</style>
