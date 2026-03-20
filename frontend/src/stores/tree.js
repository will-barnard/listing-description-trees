import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api'

export const useTreeStore = defineStore('tree', () => {
  const trees = ref([])
  const currentTree = ref(null)
  const allNodes = ref([])
  const loading = ref(false)

  async function fetchTrees() {
    loading.value = true
    try {
      trees.value = await api.getTrees()
    } finally {
      loading.value = false
    }
  }

  async function fetchTree(id) {
    loading.value = true
    try {
      const data = await api.getTree(id)
      currentTree.value = data
      allNodes.value = data.nodes || []
    } finally {
      loading.value = false
    }
  }

  function getChildren(parentId) {
    if (parentId === null || parentId === undefined) {
      return allNodes.value.filter(n => n.parent_id === null).sort((a, b) => a.sort_order - b.sort_order)
    }
    return allNodes.value.filter(n => n.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order)
  }

  function getNode(id) {
    return allNodes.value.find(n => n.id === id)
  }

  function getAncestors(nodeId) {
    const ancestors = []
    let current = allNodes.value.find(n => n.id === nodeId)
    while (current && current.parent_id !== null) {
      const parent = allNodes.value.find(n => n.id === current.parent_id)
      if (!parent) break
      ancestors.unshift(parent)
      current = parent
    }
    return ancestors
  }

  function isLeaf(nodeId) {
    return !allNodes.value.some(n => n.parent_id === nodeId)
  }

  async function addNode(data) {
    const node = await api.createNode(data)
    allNodes.value.push(node)
    return node
  }

  async function batchAddNodes(data) {
    const nodes = await api.batchCreateNodes(data)
    allNodes.value.push(...nodes)
    return nodes
  }

  async function updateNode(id, data) {
    const node = await api.updateNode(id, data)
    const idx = allNodes.value.findIndex(n => n.id === id)
    if (idx !== -1) allNodes.value[idx] = node
    return node
  }

  async function moveNode(id, newParentId) {
    const node = await api.moveNode(id, newParentId)
    const idx = allNodes.value.findIndex(n => n.id === id)
    if (idx !== -1) allNodes.value[idx] = node
    return node
  }

  async function deleteNode(id) {
    const result = await api.deleteNode(id)
    const deletedIds = new Set(result.deleted.map(n => n.id))
    allNodes.value = allNodes.value.filter(n => !deletedIds.has(n.id))
    return result.deleted
  }

  async function restoreNodes(nodes) {
    const restored = await api.restoreNodes(nodes)
    allNodes.value.push(...restored)
    return restored
  }

  return {
    trees, currentTree, allNodes, loading,
    fetchTrees, fetchTree,
    getChildren, getNode, getAncestors, isLeaf,
    addNode, batchAddNodes, updateNode, moveNode, deleteNode, restoreNodes
  }
})
