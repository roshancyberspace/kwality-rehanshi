import { askAppConfirmation, askAppTextInput, notify, showAppError } from '../../../utils/feedback'

export const askConfirmation = askAppConfirmation

export const askTextInput = askAppTextInput

export const showSuccessAlert = (title) => notify(title, { tone: 'success' })

export const showErrorAlert = showAppError
