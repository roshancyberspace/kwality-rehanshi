import { ActionButton, Modal } from '../../../components/admin/AdminUI'
import FieldControl from './FieldControl'

function RecordModal({ actionLoadingId, activeTab, config, form, modalState, onChange, onClose, onSubmit }) {
  if (!modalState || !config) return null

  const closeSmoothly = () => {
    window.setTimeout(onClose, 180)
  }

  const isSaving = actionLoadingId === 'action'

  return (
    <Modal noPadding onClose={onClose} title={`${modalState.mode === 'edit' ? 'Edit' : 'Add'} ${activeTab}`}>
      <form className="flex flex-col max-h-[85vh]" onSubmit={onSubmit}>
        <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-5 md:grid-cols-2 custom-thin-scrollbar flex-1">
          {config.fields.filter((field) => {
            if (field.hidden) return false
            if (!field.showWhen) return true
            return String(form[field.showWhen.field] ?? '') === String(field.showWhen.value)
          }).map((field) => {
            const isEdit = modalState.mode === 'edit'
            const isPassword = field.type === 'password'
            const currentField = isEdit && isPassword ? {
              ...field,
              required: false,
              label: `${field.label} (optional)`,
            } : field

            return (
              <FieldControl
                field={currentField}
                key={field.name}
                onChange={onChange}
                value={form[field.name] ?? ''}
              />
            )
          })}
        </div>
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <ActionButton disabled={isSaving} onClick={closeSmoothly}>Cancel</ActionButton>
          <ActionButton isLoading={isSaving} tone="primary" type="submit">
            Save
          </ActionButton>
        </div>
      </form>
    </Modal>
  )
}

export default RecordModal
