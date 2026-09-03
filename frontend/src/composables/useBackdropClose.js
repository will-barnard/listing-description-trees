import { ref } from 'vue'

// Closes a modal only on a genuine click on the backdrop itself — i.e. both
// the mousedown AND the mouseup/click landed directly on the overlay
// element, not on a child. Using `@click.self` alone is buggy: if the user
// starts a text selection drag inside the modal (e.g. selecting text in a
// textarea) and releases the mouse outside the modal bounds, the browser's
// synthesized `click` event target becomes the common ancestor of the
// mousedown/mouseup targets — the overlay — which falsely matches
// `.self` and closes the modal, discarding unsaved edits.
export function useBackdropClose(closeFn) {
  const mouseDownOnBackdrop = ref(false)

  function onMouseDown(event) {
    mouseDownOnBackdrop.value = event.target === event.currentTarget
  }

  function onClick(event) {
    if (mouseDownOnBackdrop.value && event.target === event.currentTarget) {
      closeFn()
    }
    mouseDownOnBackdrop.value = false
  }

  return { onMouseDown, onClick }
}
