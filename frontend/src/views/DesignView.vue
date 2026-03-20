<template>
  <div class="design">
    <!-- Toolbar -->
    <div class="design-toolbar">
      <div class="toolbar-left">
        <router-link to="/" class="btn btn-ghost btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          All Trees
        </router-link>
        <h2 v-if="store.currentTree">{{ store.currentTree.name }}</h2>
      </div>
      <div class="toolbar-right">
        <button
          class="btn btn-ghost btn-sm"
          :disabled="undoStack.length === 0"
          @click="undo"
          title="Undo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Undo
        </button>
        <button
          class="btn btn-ghost btn-sm"
          :disabled="redoStack.length === 0"
          @click="redo"
          title="Redo"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
          Redo
        </button>
        <button class="btn btn-ghost btn-sm" @click="collapseAll" title="Collapse all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
        <button class="btn btn-ghost btn-sm" @click="expandAll" title="Expand all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
        </button>
      </div>
    </div>

    <div v-if="store.loading" class="loading">Loading…</div>

    <template v-else-if="store.currentTree">
      <!-- Root level + button -->
      <div class="tree-root">
        <div class="root-header">
          <span class="root-label">{{ store.currentTree.name }}</span>
          <button class="add-btn" @click="openAddModal(null)" title="Add root node">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <div v-if="rootChildren.length === 0" class="empty-level">
          <p>No nodes yet. Click + to add the first one.</p>
        </div>

        <div class="node-list">
          <DesignNode
            v-for="node in rootChildren"
            :key="node.id"
            :node="node"
            :expanded-set="expandedSet"
            :drag-source="dragSourceId"
            :drop-target="dropTargetId"
            @toggle="toggleExpand"
            @add="openAddModal"
            @edit="openEditModal"
            @delete="handleDelete"
            @drag-start="startDrag"
            @drag-over="handleDragOver"
            @drag-end="endDrag"
            @drop="handleDrop"
          />
        </div>
      </div>
    </template>

    <!-- Add Node Modal -->
    <div v-if="addModal.open" class="modal-overlay" @click.self="addModal.open = false">
      <div class="modal">
        <h2>Add to {{ addModal.parentLabel }}</h2>

        <div class="add-tabs">
          <button :class="['tab', { active: addModal.tab === 'single' }]" @click="addModal.tab = 'single'">Single Node</button>
          <button :class="['tab', { active: addModal.tab === 'template' }]" @click="addModal.tab = 'template'">From Template</button>
          <button :class="['tab', { active: addModal.tab === 'leaf' }]" @click="addModal.tab = 'leaf'">Leaf with Copy</button>
        </div>

        <!-- Single -->
        <div v-if="addModal.tab === 'single'">
          <div class="form-group">
            <label>Label</label>
            <input v-model="addModal.label" placeholder="Node label" @keyup.enter="doAdd" :ref="addInputRef" autofocus />
          </div>
        </div>

        <!-- Template -->
        <div v-if="addModal.tab === 'template'">
          <div v-if="templates.length === 0" class="empty-templates">
            <p>No templates yet. <router-link to="/settings">Create one in Settings</router-link>.</p>
          </div>
          <div v-else class="form-group">
            <label>Template</label>
            <select v-model="addModal.templateId">
              <option :value="null" disabled>Select a template…</option>
              <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }} ({{ t.children.length }} children)</option>
            </select>
          </div>
        </div>

        <!-- Leaf -->
        <div v-if="addModal.tab === 'leaf'">
          <div class="form-group">
            <label>Label</label>
            <input v-model="addModal.label" placeholder="Node label" />
          </div>
          <div class="form-group">
            <label>Copy</label>
            <textarea v-model="addModal.copy" rows="6" placeholder="Enter the listing copy…"></textarea>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn btn-ghost" @click="addModal.open = false">Cancel</button>
          <button class="btn btn-primary" @click="doAdd" :disabled="!canAdd">Add</button>
        </div>
      </div>
    </div>

    <!-- Edit Node Modal -->
    <div v-if="editModal.open" class="modal-overlay" @click.self="editModal.open = false">
      <div class="modal">
        <h2>Edit Node</h2>
        <div class="form-group">
          <label>Label</label>
          <input v-model="editModal.label" @keyup.enter="doEdit" autofocus />
        </div>
        <div class="form-group">
          <label>Copy (leave empty for branch nodes)</label>
          <textarea v-model="editModal.copy" rows="6" placeholder="Listing copy…"></textarea>
        </div>
        <div class="form-actions">
          <button class="btn btn-ghost" @click="editModal.open = false">Cancel</button>
          <button class="btn btn-primary" @click="doEdit" :disabled="!editModal.label.trim()">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useTreeStore } from '../stores/tree'
import { api } from '../api'
import DesignNode from '../components/DesignNode.vue'

const props = defineProps({ treeId: [String, Number] })
const store = useTreeStore()

const expandedSet = ref(new Set())
const undoStack = ref([])
const redoStack = ref([])
const templates = ref([])

const dragSourceId = ref(null)
const dropTargetId = ref(null)

const rootChildren = computed(() => store.getChildren(null))

// Add modal
const addModal = reactive({
  open: false,
  parentId: null,
  parentLabel: '',
  tab: 'single',
  label: '',
  copy: '',
  templateId: null
})

const addInputRef = ref(null)

// Edit modal
const editModal = reactive({
  open: false,
  nodeId: null,
  label: '',
  copy: ''
})

const canAdd = computed(() => {
  if (addModal.tab === 'single') return addModal.label.trim().length > 0
  if (addModal.tab === 'template') return addModal.templateId !== null
  if (addModal.tab === 'leaf') return addModal.label.trim().length > 0
  return false
})

onMounted(async () => {
  await store.fetchTree(parseInt(props.treeId))
  templates.value = await api.getTemplates()
})

watch(() => props.treeId, async (id) => {
  await store.fetchTree(parseInt(id))
  expandedSet.value = new Set()
  undoStack.value = []
  redoStack.value = []
})

function toggleExpand(nodeId) {
  if (expandedSet.value.has(nodeId)) {
    expandedSet.value.delete(nodeId)
  } else {
    expandedSet.value.add(nodeId)
  }
  expandedSet.value = new Set(expandedSet.value) // reactivity
}

function expandAll() {
  expandedSet.value = new Set(store.allNodes.map(n => n.id))
}

function collapseAll() {
  expandedSet.value = new Set()
}

function openAddModal(parentId) {
  addModal.open = true
  addModal.parentId = parentId
  addModal.parentLabel = parentId ? (store.getNode(parentId)?.label || 'node') : store.currentTree.name
  addModal.tab = 'single'
  addModal.label = ''
  addModal.copy = ''
  addModal.templateId = null
  nextTick(() => {
    if (addInputRef.value) {
      addInputRef.value.focus()
    }
  })
}

async function doAdd() {
  if (!canAdd.value) return
  const treeId = parseInt(props.treeId)

  try {
    if (addModal.tab === 'single') {
      const node = await store.addNode({
        tree_id: treeId,
        parent_id: addModal.parentId,
        label: addModal.label.trim()
      })
      pushUndo({ type: 'add', nodes: [node] })
    } else if (addModal.tab === 'template') {
      const tmpl = templates.value.find(t => t.id === addModal.templateId)
      if (!tmpl) return
      const nodes = await store.batchAddNodes({
        tree_id: treeId,
        parent_id: addModal.parentId,
        nodes: tmpl.children.map((label, i) => ({ label, sort_order: i }))
      })
      pushUndo({ type: 'add', nodes })
    } else if (addModal.tab === 'leaf') {
      const node = await store.addNode({
        tree_id: treeId,
        parent_id: addModal.parentId,
        label: addModal.label.trim(),
        copy: addModal.copy || null
      })
      pushUndo({ type: 'add', nodes: [node] })
    }

    if (addModal.parentId) expandedSet.value.add(addModal.parentId)
    expandedSet.value = new Set(expandedSet.value)
    addModal.open = false
  } catch (err) {
    alert('Error adding node: ' + err.message)
  }
}

function openEditModal(nodeId) {
  const node = store.getNode(nodeId)
  if (!node) return
  editModal.open = true
  editModal.nodeId = nodeId
  editModal.label = node.label
  editModal.copy = node.copy || ''
}

async function doEdit() {
  if (!editModal.label.trim()) return
  const prev = { ...store.getNode(editModal.nodeId) }
  try {
    await store.updateNode(editModal.nodeId, {
      label: editModal.label.trim(),
      copy: editModal.copy || null
    })
    pushUndo({ type: 'edit', nodeId: editModal.nodeId, prev: { label: prev.label, copy: prev.copy } })
    editModal.open = false
  } catch (err) {
    alert('Error updating node: ' + err.message)
  }
}

async function handleDelete(nodeId) {
  const node = store.getNode(nodeId)
  if (!node) return
  if (!confirm(`Delete "${node.label}" and all its children?`)) return

  try {
    const deleted = await store.deleteNode(nodeId)
    pushUndo({ type: 'delete', nodes: deleted })
  } catch (err) {
    alert('Error deleting node: ' + err.message)
  }
}

// Drag & drop
function startDrag(nodeId) {
  dragSourceId.value = nodeId
}

function handleDragOver(nodeId) {
  if (nodeId !== dragSourceId.value) {
    dropTargetId.value = nodeId
  }
}

async function handleDrop(targetNodeId) {
  if (!dragSourceId.value || dragSourceId.value === targetNodeId) {
    endDrag()
    return
  }

  const sourceNode = store.getNode(dragSourceId.value)
  if (!sourceNode) { endDrag(); return }

  const prevParentId = sourceNode.parent_id

  try {
    await store.moveNode(dragSourceId.value, targetNodeId)
    pushUndo({ type: 'move', nodeId: dragSourceId.value, prevParentId })
    if (targetNodeId) expandedSet.value.add(targetNodeId)
    expandedSet.value = new Set(expandedSet.value)
  } catch (err) {
    alert('Error moving node: ' + err.message)
  }
  endDrag()
}

function endDrag() {
  dragSourceId.value = null
  dropTargetId.value = null
}

// Undo / Redo
function pushUndo(action) {
  undoStack.value.push(action)
  redoStack.value = []
}

async function undo() {
  const action = undoStack.value.pop()
  if (!action) return

  try {
    if (action.type === 'add') {
      const allDeleted = []
      for (const n of action.nodes) {
        const deleted = await store.deleteNode(n.id)
        allDeleted.push(...deleted)
      }
      redoStack.value.push({ type: 'delete-reverse', nodes: allDeleted })
    } else if (action.type === 'delete') {
      await store.restoreNodes(action.nodes)
      redoStack.value.push({ type: 'add-reverse', nodes: action.nodes })
    } else if (action.type === 'edit') {
      const current = { ...store.getNode(action.nodeId) }
      await store.updateNode(action.nodeId, action.prev)
      redoStack.value.push({ type: 'edit', nodeId: action.nodeId, prev: { label: current.label, copy: current.copy } })
    } else if (action.type === 'move') {
      const current = store.getNode(action.nodeId)
      await store.moveNode(action.nodeId, action.prevParentId)
      redoStack.value.push({ type: 'move', nodeId: action.nodeId, prevParentId: current?.parent_id })
    } else if (action.type === 'delete-reverse') {
      await store.restoreNodes(action.nodes)
      redoStack.value.push({ type: 'add', nodes: action.nodes })
    } else if (action.type === 'add-reverse') {
      for (const n of action.nodes) {
        await store.deleteNode(n.id)
      }
      redoStack.value.push({ type: 'delete', nodes: action.nodes })
    }
  } catch (err) {
    console.error('Undo failed:', err)
    // Refresh to resync
    await store.fetchTree(parseInt(props.treeId))
  }
}

async function redo() {
  const action = redoStack.value.pop()
  if (!action) return

  try {
    if (action.type === 'delete-reverse') {
      await store.restoreNodes(action.nodes)
      undoStack.value.push({ type: 'add', nodes: action.nodes })
    } else if (action.type === 'add-reverse') {
      for (const n of action.nodes) {
        await store.deleteNode(n.id)
      }
      undoStack.value.push({ type: 'delete', nodes: action.nodes })
    } else if (action.type === 'edit') {
      const current = { ...store.getNode(action.nodeId) }
      await store.updateNode(action.nodeId, action.prev)
      undoStack.value.push({ type: 'edit', nodeId: action.nodeId, prev: { label: current.label, copy: current.copy } })
    } else if (action.type === 'move') {
      const current = store.getNode(action.nodeId)
      await store.moveNode(action.nodeId, action.prevParentId)
      undoStack.value.push({ type: 'move', nodeId: action.nodeId, prevParentId: current?.parent_id })
    } else if (action.type === 'add') {
      await store.restoreNodes(action.nodes)
      undoStack.value.push({ type: 'delete', nodes: action.nodes })
    } else if (action.type === 'delete') {
      for (const n of action.nodes) {
        await store.deleteNode(n.id)
      }
      undoStack.value.push({ type: 'add', nodes: action.nodes })
    }
  } catch (err) {
    console.error('Redo failed:', err)
    await store.fetchTree(parseInt(props.treeId))
  }
}
</script>

<style scoped>
.design-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.toolbar-left h2 {
  font-size: 1.3rem;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tree-root {
  background: var(--bg-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.root-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.root-label {
  font-weight: 700;
  font-size: 1.1rem;
}

.add-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  transition: background var(--transition);
}

.add-btn:hover {
  background: var(--accent-hover);
}

.node-list {
  display: flex;
  flex-direction: column;
}

.empty-level {
  text-align: center;
  color: var(--text-muted);
  padding: 24px;
}

.add-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--bg);
  padding: 4px;
  border-radius: var(--radius);
}

.tab {
  flex: 1;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-muted);
  transition: all var(--transition);
  text-align: center;
}

.tab.active {
  background: var(--accent-bg);
  color: var(--accent);
  font-weight: 600;
}

.tab:hover:not(.active) {
  color: var(--text);
}

.empty-templates {
  text-align: center;
  color: var(--text-muted);
  padding: 20px;
}

.loading {
  text-align: center;
  color: var(--text-muted);
  padding: 60px;
}
</style>
