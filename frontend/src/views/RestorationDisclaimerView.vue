<template>
  <div class="disclaimer">
    <div class="disclaimer-header">
      <router-link to="/" class="btn btn-ghost btn-sm">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        Back
      </router-link>
      <h1>Restoration Disclaimer</h1>
    </div>

    <p class="section-desc">
      Copy shown at the beginning of listings for instruments tagged <code>restoration</code> on
      Shopify — e.g. explaining that the listing is a deposit to reserve the instrument. This text
      lives here, separate from any single tree, and is prepended to a restoration listing's copy
      rather than stored on the tree itself.
    </p>

    <div v-if="loading" class="loading">Loading…</div>

    <template v-else>
      <p v-if="error" class="banner banner-danger">{{ error }}</p>
      <p v-if="saved" class="banner banner-success">Saved.</p>

      <div class="form-group">
        <textarea
          v-model="text"
          class="disclaimer-textarea"
          rows="18"
          placeholder="e.g. This listing is a deposit to reserve this instrument while it undergoes restoration. The balance is due before it ships…"
        ></textarea>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" @click="save" :disabled="saving || text === original">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '../api'

const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const error = ref('')

const text = ref('')
const original = ref('')

onMounted(async () => {
  try {
    const res = await api.getRestorationDisclaimer()
    text.value = res.restorationDisclaimer
    original.value = res.restorationDisclaimer
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
})

async function save() {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    const res = await api.updateRestorationDisclaimer({ restorationDisclaimer: text.value })
    text.value = res.restorationDisclaimer
    original.value = res.restorationDisclaimer
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.disclaimer-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.disclaimer-header h1 {
  font-size: 1.5rem;
}

.section-desc {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 24px;
  max-width: 720px;
}

.section-desc code {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 1px 5px;
  font-size: 0.85em;
}

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.banner {
  border-radius: var(--radius);
  padding: 8px 12px;
  font-size: 0.85rem;
  margin-bottom: 16px;
  max-width: 720px;
}

.banner-danger {
  background: var(--danger-bg);
  color: var(--danger);
}

.banner-success {
  background: rgba(74, 222, 128, 0.12);
  color: var(--success);
}

.disclaimer-textarea {
  width: 100%;
  max-width: 720px;
  min-height: 380px;
  font-size: 0.95rem;
  line-height: 1.5;
}

.form-actions {
  margin-top: 16px;
}
</style>
