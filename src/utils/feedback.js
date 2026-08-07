import Swal from 'sweetalert2'

export const toastEventName = 'app-toast'

export const notify = (message, options = {}) => {
  if (!message || typeof window === 'undefined') return

  window.dispatchEvent(new CustomEvent(toastEventName, {
    detail: {
      message,
      title: options.title,
      tone: options.tone || 'success',
    },
  }))
}

const compactAlertClasses = {
  actions: 'admin-swal-actions',
  cancelButton: 'admin-swal-button admin-swal-cancel',
  confirmButton: 'admin-swal-button',
  htmlContainer: 'admin-swal-text',
  icon: 'admin-swal-icon',
  popup: 'admin-swal-popup',
  title: 'admin-swal-title',
}

export const askAppConfirmation = async ({ confirmButtonText = 'Yes, continue', text, title, tone = 'question' }) => {
  const result = await Swal.fire({
    cancelButtonColor: '#64748b',
    cancelButtonText: 'Cancel',
    confirmButtonColor: tone === 'danger' ? '#e11d48' : '#0054A6',
    confirmButtonText,
    customClass: compactAlertClasses,
    icon: tone === 'danger' ? 'warning' : tone,
    reverseButtons: true,
    showCancelButton: true,
    text,
    title,
  })

  return result.isConfirmed
}

export const askAppTextInput = async ({
  cancelButtonText = 'Cancel',
  confirmButtonText = 'Submit',
  inputLabel,
  inputPlaceholder,
  requiredMessage = 'This field is required.',
  text,
  title,
  tone = 'question',
}) => {
  const result = await Swal.fire({
    cancelButtonColor: '#64748b',
    cancelButtonText,
    confirmButtonColor: tone === 'danger' ? '#e11d48' : '#0054A6',
    confirmButtonText,
    customClass: {
      ...compactAlertClasses,
      input: 'admin-swal-textarea',
      inputLabel: 'admin-swal-input-label',
    },
    icon: tone === 'danger' ? 'warning' : tone,
    input: 'textarea',
    inputAttributes: {
      maxlength: 1000,
      rows: 3,
    },
    inputLabel,
    inputPlaceholder,
    inputValidator: (value) => {
      if (!value?.trim()) return requiredMessage
      return undefined
    },
    reverseButtons: true,
    showCancelButton: true,
    text,
    title,
  })

  return result.isConfirmed ? result.value.trim() : null
}

export const showAppError = (title, text) =>
  Swal.fire({
    confirmButtonColor: '#e11d48',
    customClass: compactAlertClasses,
    icon: 'error',
    text,
    title,
  })
