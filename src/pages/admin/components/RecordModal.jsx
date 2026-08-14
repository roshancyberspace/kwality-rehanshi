import { useEffect, useMemo, useRef, useState } from 'react'
import { ActionButton, Modal } from '../../../components/admin/AdminUI'
import FieldControl from './FieldControl'

const CUSTOM_SELECT_VALUE = '__custom__'

function isEmptyValue(value) {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function matchesShowWhen(showWhen, form) {
  if (!showWhen) return true
  const current = String(form[showWhen.field] ?? '')
  if (Array.isArray(showWhen.values)) {
    return showWhen.values.map(String).includes(current)
  }
  return current === String(showWhen.value)
}

function RecordModal({ actionLoadingId, activeTab, config, form, modalState, onChange, onClose, onSubmit }) {
  const formSteps = config?.formSteps || []
  const isMultiStep = formSteps.length > 0
  const [stepIndex, setStepIndex] = useState(0)
  const [stepError, setStepError] = useState('')
  const [saveArmed, setSaveArmed] = useState(!isMultiStep)
  const saveArmTimeoutRef = useRef(null)

  useEffect(() => {
    setStepIndex(0)
    setStepError('')
    setSaveArmed(!formSteps.length)
  }, [modalState?.mode, modalState?.record?.id, activeTab, formSteps.length])

  // Prevent Next→Save button swap / double-click from instantly submitting on last step
  useEffect(() => {
    if (!isMultiStep) {
      setSaveArmed(true)
      return undefined
    }

    const isLast = stepIndex >= formSteps.length - 1
    window.clearTimeout(saveArmTimeoutRef.current)

    if (!isLast) {
      setSaveArmed(false)
      return undefined
    }

    setSaveArmed(false)
    saveArmTimeoutRef.current = window.setTimeout(() => setSaveArmed(true), 400)
    return () => window.clearTimeout(saveArmTimeoutRef.current)
  }, [formSteps.length, isMultiStep, stepIndex])

  const currentStep = formSteps[stepIndex] || null

  const visibleFields = useMemo(() => {
    if (!config) return []
    return config.fields.filter((field) => {
      if (field.hidden) return false
      if (field.hideOnCreate && modalState?.mode !== 'edit') return false
      if (field.hideOnEdit && modalState?.mode === 'edit') return false
      if (field.showWhen && !matchesShowWhen(field.showWhen, form)) {
        return false
      }
      if (isMultiStep && field.formStep && field.formStep !== currentStep?.id) {
        return false
      }
      return true
    }).map((field) => {
      if (modalState?.mode === 'edit' && field.readOnlyOnEdit) {
        field = { ...field, readOnly: true }
      }
      if (field.readOnlyUnless) {
        field = {
          ...field,
          readOnly: String(form[field.readOnlyUnless.field] ?? '') !== String(field.readOnlyUnless.value),
        }
      }
      if (!field.filterBy) return field
      const parentValue = form[field.filterBy.field]
      if (!parentValue) {
        return { ...field, options: [], hint: field.emptyParentHint || field.hint || 'Select the parent field first' }
      }

      const currentValue = form[field.name]
      const excludeMap = field.filterBy.whereNotIn || {}
      const filtered = (field.options || []).filter((option) => {
        const optionParent = option[field.filterBy.recordKey]
        if (String(optionParent ?? '') !== String(parentValue)) return false
        return Object.entries(excludeMap).every(([key, values]) => {
          const raw = String(option[key] ?? '').toLowerCase()
          return !values.some((value) => String(value).toLowerCase() === raw)
        })
      })

      if (currentValue && !filtered.some((option) => String(option.value) === String(currentValue))) {
        const selected = (field.options || []).find((option) => String(option.value) === String(currentValue))
        if (selected) filtered.unshift(selected)
      }

      return { ...field, options: filtered }
    })
  }, [config, currentStep?.id, form, isMultiStep, modalState?.mode])

  if (!modalState || !config) return null

  const closeSmoothly = () => {
    window.setTimeout(onClose, 180)
  }

  const isSaving = actionLoadingId === 'action'
  const isLastStep = !isMultiStep || stepIndex >= formSteps.length - 1

  const validateFields = (fields) => {
    const missing = fields.find((field) => {
      if (!field.required) return false
      const value = form[field.name]
      if (value === CUSTOM_SELECT_VALUE && !field.customSentinel) return true
      return isEmptyValue(value)
    })
    if (missing) {
      setStepError(`Please fill "${missing.label}" to continue.`)
      return false
    }
    setStepError('')
    return true
  }

  const validateCurrentStep = () => validateFields(visibleFields)

  const goNext = (event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    if (!validateCurrentStep()) return
    setStepIndex((current) => Math.min(current + 1, formSteps.length - 1))
  }

  const goBack = (event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    setStepError('')
    setStepIndex((current) => Math.max(current - 1, 0))
  }

  const requestSave = (event) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()

    if (isMultiStep && !isLastStep) {
      goNext(event)
      return
    }

    // Ignore accidental submit right after landing on the last step
    if (isMultiStep && !saveArmed) return

    const allVisibleConfigFields = (config.fields || []).filter((field) => {
      if (field.hidden) return false
      if (field.hideOnCreate && modalState?.mode !== 'edit') return false
      if (field.hideOnEdit && modalState?.mode === 'edit') return false
      if (field.showWhen && !matchesShowWhen(field.showWhen, form)) {
        return false
      }
      return true
    })
    if (!validateFields(allVisibleConfigFields)) {
      const firstMissing = allVisibleConfigFields.find((field) => field.required && isEmptyValue(form[field.name]))
      if (firstMissing?.formStep && isMultiStep) {
        const targetIndex = formSteps.findIndex((step) => step.id === firstMissing.formStep)
        if (targetIndex >= 0) setStepIndex(targetIndex)
      }
      return
    }
    onSubmit(event)
  }

  return (
    <Modal noPadding onClose={onClose} title={`${modalState.mode === 'edit' ? 'Edit' : 'Add'} ${activeTab}`}>
      <form className="flex flex-col max-h-[85vh]" onSubmit={requestSave}>
        {isMultiStep ? (
          <div className="border-b border-slate-200 bg-slate-50/90 px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {formSteps.map((step, index) => {
                const isActive = index === stepIndex
                const isDone = index < stepIndex
                return (
                  <button
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black transition ${
                      isActive
                        ? 'bg-[#67B529] text-white shadow-sm'
                        : isDone
                          ? 'bg-[#EEF9E8] text-[#67B529] ring-1 ring-[#67B529]/25'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200'
                    }`}
                    key={step.id}
                    onClick={() => {
                      if (index < stepIndex) {
                        setStepError('')
                        setStepIndex(index)
                      } else if (index > stepIndex && validateCurrentStep()) {
                        setStepIndex(index)
                      }
                    }}
                    type="button"
                  >
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] ${isActive ? 'bg-white/20' : isDone ? 'bg-[#67B529] text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {isDone ? '✓' : index + 1}
                    </span>
                    {step.title}
                  </button>
                )
              })}
            </div>
            {currentStep?.description ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">{currentStep.description}</p>
            ) : null}
          </div>
        ) : null}

        <div className="grid max-h-[72vh] gap-4 overflow-y-auto p-5 md:grid-cols-2 custom-thin-scrollbar flex-1">
          {visibleFields.map((field) => {
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

        {stepError ? (
          <div className="border-t border-amber-100 bg-amber-50 px-5 py-2 text-xs font-bold text-amber-800">
            {stepError}
          </div>
        ) : null}

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-5 py-3.5">
          <div className="text-xs font-bold text-slate-400">
            {isMultiStep ? `Step ${stepIndex + 1} of ${formSteps.length}` : null}
          </div>
          <div className="flex gap-2">
            <ActionButton disabled={isSaving} onClick={closeSmoothly} type="button">Cancel</ActionButton>
            {isMultiStep && stepIndex > 0 ? (
              <ActionButton disabled={isSaving} onClick={goBack} type="button">Back</ActionButton>
            ) : null}
            {/* Keep both buttons mounted so Next→Save swap cannot auto-submit the same click */}
            {isMultiStep && !isLastStep ? (
              <ActionButton disabled={isSaving} onClick={goNext} tone="primary" type="button">
                Next
              </ActionButton>
            ) : null}
            {(!isMultiStep || isLastStep) ? (
              <ActionButton
                disabled={isSaving || (isMultiStep && !saveArmed)}
                isLoading={isSaving}
                onClick={requestSave}
                tone="primary"
                type="button"
              >
                Save
              </ActionButton>
            ) : null}
          </div>
        </div>
      </form>
    </Modal>
  )
}

export default RecordModal
