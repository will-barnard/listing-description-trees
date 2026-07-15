<template>
  <div
    class="design-node"
    :class="{
      'is-dragging': isDragging,
      'is-drop-target': isDropTarget,
      [`drop-${dropPositionForThis}`]: isDropTarget,
      'is-leaf': isLeaf
    }"
    draggable="true"
    @dragstart.stop="onDragStart"
    @dragover.prevent.stop="onDragOver"
    @dragleave.stop="onDragLeave"
    @drop.prevent.stop="onDrop"
    @dragend="onDragEnd"
  >
    <div class="node-row" ref="rowRef">
      <!-- Expand/collapse -->
      <button
        v-if="!isLeaf"
        class="expand-btn"
        @click="$emit('toggle', node.id)"
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2"
          :style="{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)' }"
        >
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>
      <span v-else class="leaf-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      </span>

      <span class="node-label" @dblclick="$emit('edit', node.id)">{{ node.label }}</span>

      <span v-if="isLeaf" class="badge">copy</span>

      <div class="node-actions">
        <button class="action-btn" @click="$emit('add', node.id)" title="Add child">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="action-btn" @click="$emit('edit', node.id)" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </button>
        <button class="action-btn action-danger" @click="$emit('delete', node.id)" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>

    <!-- Copy preview for leaves -->
    <div v-if="isLeaf && isExpanded && node.copy" class="copy-preview">
      {{ truncatedCopy }}
    </div>

    <!-- Children -->
    <div v-if="!isLeaf && isExpanded" class="node-children">
      <DesignNode
        v-for="child in children"
        :key="child.id"
        :node="child"
        :expanded-set="expandedSet"
        :drag-source="dragSource"
        :drop-target="dropTarget"
        :drop-position="dropPosition"
        @toggle="(id) => $emit('toggle', id)"
        @add="(id) => $emit('add', id)"
        @edit="(id) => $emit('edit', id)"
        @delete="(id) => $emit('delete', id)"
        @drag-start="(id) => $emit('drag-start', id)"
        @drag-over="(id, position) => $emit('drag-over', id, position)"
        @drag-end="() => $emit('drag-end')"
        @drop="(id, position) => $emit('drop', id, position)"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTreeStore } from '../stores/tree'

const props = defineProps({
  node: Object,
  expandedSet: Set,
  dragSource: Number,
  dropTarget: Number,
  dropPosition: String
})

const emit = defineEmits(['toggle', 'add', 'edit', 'delete', 'drag-start', 'drag-over', 'drag-end', 'drop'])

const store = useTreeStore()
const rowRef = ref(null)

const isExpanded = computed(() => props.expandedSet.has(props.node.id))
const isLeaf = computed(() => store.isLeaf(props.node.id))
const children = computed(() => store.getChildren(props.node.id))
const isDragging = computed(() => props.dragSource === props.node.id)
const isDropTarget = computed(() => props.dropTarget === props.node.id)
const dropPositionForThis = computed(() => (isDropTarget.value ? props.dropPosition : null))

const truncatedCopy = computed(() => {
  if (!props.node.copy) return ''
  return props.node.copy.length > 200
    ? props.node.copy.substring(0, 200) + '…'
    : props.node.copy
})

// Which third of the row the cursor is over decides the intent:
// top = insert as a sibling before this node, bottom = insert as a sibling
// after this node, middle = nest inside this node as a child. This is what
// lets you drag a node back out to the level it came from instead of only
// ever being able to drop it inside another node.
function positionFromEvent(e) {
  if (!rowRef.value) return 'inside'
  const rect = rowRef.value.getBoundingClientRect()
  const ratio = (e.clientY - rect.top) / rect.height
  if (ratio < 0.25) return 'before'
  if (ratio > 0.75) return 'after'
  return 'inside'
}

function onDragStart(e) {
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', String(props.node.id))
  emit('drag-start', props.node.id)
}

function onDragOver(e) {
  emit('drag-over', props.node.id, positionFromEvent(e))
}

function onDragLeave() {
  // handled by parent
}

function onDrop(e) {
  emit('drop', props.node.id, positionFromEvent(e))
}

function onDragEnd() {
  emit('drag-end')
}
</script>

<style scoped>
.design-node {
  border-left: 2px solid var(--border);
  margin-left: 8px;
  transition: border-color var(--transition);
}

.design-node.is-dragging {
  opacity: 0.4;
}

.design-node.is-leaf {
  border-left-color: var(--success);
}

/* Dropping inside a node nests the dragged node as its child */
.design-node.is-drop-target.drop-inside > .node-row {
  background: var(--accent-bg);
  border-radius: var(--radius);
}

/* Dropping on the top/bottom edge of a node inserts the dragged node as a
   sibling instead — this is what lets you drag a node back out of another
   node's children and reorder it at the same level. */
.design-node.is-drop-target.drop-before > .node-row {
  box-shadow: inset 0 2px 0 0 var(--accent);
}

.design-node.is-drop-target.drop-after > .node-row {
  box-shadow: inset 0 -2px 0 0 var(--accent);
}

.node-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: var(--radius);
  cursor: grab;
  transition: background var(--transition);
}

.node-row:hover {
  background: var(--bg-hover);
}

.expand-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--text-muted);
  flex-shrink: 0;
  transition: color var(--transition);
}

.expand-btn:hover {
  color: var(--text);
}

.expand-btn svg {
  transition: transform 150ms ease;
}

.leaf-icon {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--success);
  flex-shrink: 0;
}

.node-label {
  flex: 1;
  font-weight: 500;
  cursor: pointer;
}

.node-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--transition);
}

.node-row:hover .node-actions {
  opacity: 1;
}

.action-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--text-muted);
  transition: all var(--transition);
}

.action-btn:hover {
  color: var(--text);
  background: var(--bg-hover);
}

.action-danger:hover {
  color: var(--danger);
  background: var(--danger-bg);
}

.copy-preview {
  margin-left: 40px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
  border-left: 2px solid var(--success);
  margin-bottom: 4px;
}

.node-children {
  margin-left: 12px;
}
</style>
