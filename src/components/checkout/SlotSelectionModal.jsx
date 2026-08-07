import React, { useState, useEffect, useMemo } from 'react'

const getApproxDuration = (items = []) => {
  if (!items || !items.length) return '45 mins'
  let totalMins = 0
  items.forEach((item) => {
    const durStr = String(item.duration || '').toLowerCase()
    const hrMatch = durStr.match(/(\d+)\s*hr/)
    const minMatch = durStr.match(/(\d+)\s*min/)
    let found = false
    if (hrMatch) {
      totalMins += parseInt(hrMatch[1], 10) * 60
      found = true
    }
    if (minMatch) {
      totalMins += parseInt(minMatch[1], 10)
      found = true
    }
    if (!found) {
      totalMins += 45 // default per item if duration not parsed
    }
  })
  if (totalMins >= 60) {
    const hrs = Math.floor(totalMins / 60)
    const mins = totalMins % 60
    if (mins === 0) return `${hrs} ${hrs > 1 ? 'hrs' : 'hr'}`
    return `${hrs} ${hrs > 1 ? 'hrs' : 'hr'} ${mins} mins`
  }
  return `${totalMins} mins`
}

const generateDateOptions = () => {
  const options = []
  const today = new Date()
  for (let i = 0; i < 5; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const fullDate = `${year}-${month}-${day}`
    const dayNumber = String(d.getDate()).padStart(2, '0')
    const shortMonth = d.toLocaleString('en-US', { month: 'short' })
    const weekday = i === 0 ? 'Today' : d.toLocaleString('en-US', { weekday: 'short' })
    const dateLabel = `${weekday}, ${dayNumber} ${shortMonth}`
    options.push({
      fullDate,
      weekday,
      dayNumber,
      shortMonth,
      dateLabel,
      isToday: i === 0,
    })
  }
  return options
}

const timeSlots = [
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM',
  '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM',
]

const TODAY_LAST_SLOT_HOUR = 21

const parseTimeLabelToMinutes = (timeStr) => {
  const [time, modifier] = timeStr.split(' ')
  let [hours, minutes] = time.split(':').map(Number)
  if (hours === 12) {
    hours = modifier === 'PM' ? 12 : 0
  } else if (modifier === 'PM') {
    hours += 12
  }
  return (hours * 60) + minutes
}

const getAvailableTimeSlots = (isToday) => {
  if (!isToday) return timeSlots

  const now = new Date()
  const nowMinutes = (now.getHours() * 60) + now.getMinutes()
  const lastSlotMinutes = TODAY_LAST_SLOT_HOUR * 60

  return timeSlots.filter((timeStr) => {
    const slotMinutes = parseTimeLabelToMinutes(timeStr)
    return slotMinutes > nowMinutes && slotMinutes <= lastSlotMinutes
  })
}

function SlotSelectionModal({
  isOpen,
  onClose,
  displayCart = [],
  groupedCart: propGroupedCart,
  selectedSlots = {},
  onSaveSlots,
  confirmText = 'Confirm',
}) {
  const [step, setStep] = useState('list') // 'list' or 'picker'
  const [activeCategory, setActiveCategory] = useState(null)
  const [tempSlots, setTempSlots] = useState({})
  const [pickerDate, setPickerDate] = useState(null)
  const [pickerTime, setPickerTime] = useState('')

  // Derive item mapping where EVERY individual product added to the cart gets a separate slot
  const groupedItems = useMemo(() => {
    const groups = {}
    displayCart.forEach((item, index) => {
      const productKey = item.name || item.title || `Product ${index + 1}`
      groups[productKey] = [item]
    })
    return groups
  }, [displayCart])

  const categories = Object.keys(groupedItems)

  // Sync state when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempSlots(selectedSlots || {})
      setStep('list')
      setActiveCategory(null)
    }
  }, [isOpen, selectedSlots])

  const dateOptions = useMemo(() => generateDateOptions(), [])

  useEffect(() => {
    if (!pickerDate) return
    const availableSlots = getAvailableTimeSlots(pickerDate.isToday)
    if (pickerTime && !availableSlots.includes(pickerTime)) {
      setPickerTime('')
    }
  }, [pickerDate, pickerTime])

  if (!isOpen) return null

  const handleSelectCategory = (category) => {
    setActiveCategory(category)
    const existing = tempSlots[category]
    if (existing && existing.date) {
      const matchedDate = dateOptions.find((d) => d.fullDate === existing.date) || dateOptions[0]
      setPickerDate(matchedDate)
      setPickerTime(existing.time || '')
    } else {
      setPickerDate(dateOptions[0]) // Default to Today
      setPickerTime('')
    }
    setStep('picker')
  }

  const handleConfirmPicker = () => {
    if (!pickerDate || !pickerTime || !activeCategory) return
    const isNextDay = !pickerDate.isToday
    const newSlot = {
      date: pickerDate.fullDate,
      dateLabel: pickerDate.dateLabel,
      time: pickerTime,
      isNextDay,
      fullSlot: `${pickerDate.fullDate}, ${pickerTime}`,
    }
    setTempSlots((prev) => ({
      ...prev,
      [activeCategory]: newSlot,
    }))
    setStep('list')
    setActiveCategory(null)
  }

  const allSelected = categories.length > 0 && categories.every((cat) => tempSlots[cat] && tempSlots[cat].time && tempSlots[cat].date)

  const handleFinalConfirm = () => {
    if (!allSelected) return
    const cleanSlots = {}
    categories.forEach((cat) => {
      cleanSlots[cat] = tempSlots[cat]
    })
    onSaveSlots?.(cleanSlots)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/65 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-2xs animate-[fadeIn_0.2s_ease-out]"
      onClick={() => {
        if (step === 'picker') setStep('list')
        else onClose()
      }}
    >
      <div
        className="w-full sm:max-w-lg lg:max-w-md rounded-t-3xl sm:rounded-2xl bg-white p-5 sm:p-6 lg:p-4 shadow-2xl max-h-[92vh] lg:max-h-[min(88vh,640px)] flex flex-col animate-[slideUp_0.25s_ease-out] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ============================================================== */}
        {/* STEP 1: PACKAGE OVERVIEW (LIST) */}
        {/* ============================================================== */}
        {step === 'list' && (
          <>
            <div className="flex items-center justify-between pb-4 lg:pb-3 border-b border-neutral-200 shrink-0">
              <h3 className="text-lg sm:text-xl lg:text-base font-extrabold text-slate-900 tracking-tight">Select slots</h3>
              <button
                onClick={onClose}
                className="grid h-9 w-9 lg:h-8 lg:w-8 place-items-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-slate-600 text-sm font-bold transition duration-200 active:scale-95"
                type="button"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 lg:mt-3 overflow-y-auto flex-1 pr-1 space-y-4 lg:space-y-2.5 max-h-[60vh]">
              {categories.map((category) => {
                const items = groupedItems[category] || []
                const duration = getApproxDuration(items)
                const itemObj = items[0] || {}
                const categoryLabel = itemObj.serviceName || itemObj.groupName || itemObj.category
                const slot = tempSlots[category]
                const isSelected = Boolean(slot && slot.time && slot.date)

                return (
                  <div
                    key={category}
                    className="border border-neutral-200/90 rounded-2xl lg:rounded-xl p-4 sm:p-5 lg:p-3 flex items-center justify-between gap-3 lg:gap-2.5 bg-white shadow-2xs hover:border-[#6338E0]/40 hover:shadow-xs transition duration-200"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-slate-900 text-base sm:text-lg lg:text-sm tracking-tight truncate">
                          {category}
                        </h4>
                        {itemObj.quantity > 1 && (
                          <span className="text-[11px] lg:text-[10px] font-extrabold text-[#6338E0] bg-[#F3EAFF] border border-[#D5C5FD] px-2 py-0.5 rounded-md shadow-2xs">
                            Qty: {itemObj.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm lg:text-[11px] text-neutral-500 mt-1 lg:mt-0.5 font-semibold flex items-center gap-1.5 flex-wrap">
                        <span>⏱️ Approx. {duration}</span>
                        {categoryLabel && categoryLabel !== category && (
                          <span className="text-neutral-400 font-medium">• {categoryLabel}</span>
                        )}
                      </p>
                    </div>

                    {!isSelected ? (
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(category)}
                        className="px-4.5 py-2 sm:px-6 sm:py-2.5 lg:px-3.5 lg:py-1.5 rounded-xl lg:rounded-lg border border-neutral-200/90 bg-white hover:bg-neutral-50 active:scale-95 font-extrabold text-xs sm:text-sm lg:text-[11px] shadow-2xs transition duration-200 shrink-0 uppercase tracking-wide text-[#6338E0] hover:border-[#6338E0]/50"
                      >
                        Select
                      </button>
                    ) : (
                      <div className="flex items-center gap-2.5 sm:gap-3 lg:gap-2 shrink-0 text-right">
                        <div className="flex flex-col items-end">
                          <span className="inline-flex items-center gap-1 text-xs sm:text-sm lg:text-[11px] font-extrabold text-[#6338E0] bg-[#F4EFFF] border border-[#D5C5FD] px-2.5 py-1 sm:px-3 sm:py-1.5 lg:px-2 lg:py-1 rounded-xl lg:rounded-lg shadow-2xs">
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 lg:w-3 lg:h-3 stroke-[2.5] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {slot.dateLabel.split(',')[0]}, {slot.date.split('-')[2]} • {slot.time}
                          </span>
                          {slot.isNextDay && (
                            <span className="text-[10px] sm:text-xs lg:text-[10px] font-bold text-[#B87000] mt-1 lg:mt-0.5 inline-flex items-center gap-1">
                              <span>💳</span> Online Payment Only
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(category)}
                          className="group flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 lg:h-8 lg:w-8 rounded-xl lg:rounded-lg bg-[#F3EAFF] hover:bg-[#E8D9FF] text-[#6338E0] border border-[#D5C5FD] transition active:scale-95 shadow-2xs shrink-0"
                          title="Edit Slot"
                          aria-label="Edit Slot"
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 lg:w-3.5 lg:h-3.5 stroke-[2.3] transform group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 lg:mt-3 pt-4 lg:pt-3 border-t border-neutral-200 shrink-0">
              {!allSelected && (
                <p className="text-center text-xs lg:text-[11px] text-neutral-500 font-semibold mb-3 lg:mb-2">
                  Please select slots for all products above to proceed
                </p>
              )}
              <button
                type="button"
                disabled={!allSelected}
                onClick={handleFinalConfirm}
                className={`w-full rounded-2xl lg:rounded-xl py-3.5 sm:py-4 lg:py-2.5 text-base lg:text-[13px] font-extrabold shadow-md transition duration-200 flex items-center justify-center ${
                  allSelected
                    ? 'bg-[#6338E0] hover:bg-[#5229C0] active:scale-[0.99] text-white shadow-[#6338E0]/25 cursor-pointer'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </>
        )}

        {/* ============================================================== */}
        {/* STEP 2: DATE & TIME PICKER FOR SELECTED SERVICE */}
        {/* ============================================================== */}
        {step === 'picker' && (
          <>
            <div className="flex items-center justify-between pb-4 lg:pb-3 border-b border-neutral-200 shrink-0 gap-2">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-2 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setStep('list')}
                  className="grid h-9 w-9 lg:h-8 lg:w-8 place-items-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-slate-700 transition active:scale-95 shrink-0"
                  aria-label="Go back to service list"
                >
                  <svg className="w-5 h-5 lg:w-4 lg:h-4 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
                <h3 className="text-base sm:text-xl lg:text-sm font-extrabold text-slate-900 truncate">
                  {activeCategory}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="grid h-9 w-9 lg:h-8 lg:w-8 place-items-center rounded-full bg-neutral-100 hover:bg-neutral-200 text-slate-600 text-sm font-bold transition active:scale-95 shrink-0"
                type="button"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 lg:mt-3 overflow-y-auto flex-1 pr-1 max-h-[72vh] lg:max-h-none min-h-0">
              <h4 className="text-sm sm:text-base lg:text-[13px] font-extrabold text-slate-900 mb-3 lg:mb-2">
                When should the professional arrive?
              </h4>

              {/* Schedule for later Option */}
              <div className="border border-[#6338E0]/20 bg-white rounded-2xl lg:rounded-xl p-4 sm:p-5 lg:p-3 shadow-xs mb-6 lg:mb-3">
                <div className="flex items-start justify-between gap-3 pb-3 lg:pb-2">
                  <div>
                    <p className="text-sm sm:text-base lg:text-[13px] font-extrabold text-slate-900">Schedule for later</p>
                    <p className="text-xs sm:text-sm lg:text-[11px] text-neutral-500 font-medium mt-0.5">Select your preferred day & time</p>
                  </div>
                  <div className="h-5 w-5 lg:h-4 lg:w-4 rounded-full border-[6px] lg:border-[5px] border-[#6338E0] bg-white shrink-0 mt-0.5 shadow-2xs" />
                </div>

                {/* Date chips row */}
                <div className="flex items-center gap-2 sm:gap-3 lg:gap-2 overflow-x-auto pb-2 pt-2 lg:pt-1 scrollbar-none">
                  {dateOptions.map((opt) => {
                    const isSelected = pickerDate && pickerDate.fullDate === opt.fullDate
                    return (
                      <button
                        type="button"
                        key={opt.fullDate}
                        onClick={() => setPickerDate(opt)}
                        className={`min-w-[68px] sm:min-w-[78px] lg:min-w-[62px] flex flex-col items-center justify-center rounded-2xl lg:rounded-xl py-2.5 sm:py-3 lg:py-2 px-2 border-2 transition-all duration-200 shrink-0 active:scale-95 ${
                          isSelected
                            ? 'border-[#6338E0] bg-[#F4EFFF] text-[#6338E0] shadow-sm font-extrabold'
                            : 'border-neutral-200 bg-white text-slate-700 hover:border-[#6338E0]/40 font-bold'
                        }`}
                      >
                        <span className="text-[11px] sm:text-xs lg:text-[10px] font-extrabold uppercase tracking-wider opacity-90 mb-1 lg:mb-0.5">
                          {opt.weekday}
                        </span>
                        <span className="text-lg sm:text-xl lg:text-base font-black">
                          {opt.dayNumber}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {/* CONDITIONAL NOTICE FOR ANY DAY OTHER THAN TODAY */}
                {pickerDate && !pickerDate.isToday && (
                  <div className="mt-3.5 lg:mt-2.5 rounded-xl lg:rounded-lg bg-[#FFF8E6] border border-[#FFE4A0] p-3 lg:p-2 text-xs sm:text-sm lg:text-[11px] font-extrabold text-[#B87000] flex items-center gap-3 lg:gap-2 shadow-2xs animate-[fadeIn_0.2s_ease-out]">
                    <span className="grid h-6 w-6 lg:h-5 lg:w-5 shrink-0 place-items-center rounded-full bg-[#FFE4A0] text-[#8A5300] text-xs lg:text-[10px] font-black">
                      !
                    </span>
                    <span>Online Payment only for selected day</span>
                  </div>
                )}
              </div>

              {/* Time Slots Grid */}
              <div className="mb-2">
                <h4 className="text-sm sm:text-base lg:text-[13px] font-extrabold text-slate-900 mb-3 lg:mb-2">
                  Select start time of service
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-2.5 lg:gap-1.5 max-h-[34vh] lg:max-h-[28vh] overflow-y-auto pr-1 pb-2">
                  {(() => {
                    const availableTimeSlots = getAvailableTimeSlots(Boolean(pickerDate?.isToday))

                    if (availableTimeSlots.length === 0) {
                      return <p className="col-span-3 sm:col-span-4 text-sm lg:text-xs font-semibold text-neutral-500 py-4 lg:py-3 text-center bg-neutral-50 rounded-xl">No slots left for today. Please select tomorrow.</p>
                    }

                    return availableTimeSlots.map((time) => {
                      const isSelected = pickerTime === time
                      return (
                      <button
                        type="button"
                        key={time}
                        onClick={() => setPickerTime(time)}
                        className={`rounded-xl lg:rounded-lg py-2.5 lg:py-2 px-1.5 sm:px-2 text-xs sm:text-sm lg:text-[11px] font-extrabold border text-center transition-all duration-200 active:scale-95 ${
                          isSelected
                            ? 'border-[#6338E0] bg-[#F4EFFF] text-[#6338E0] shadow-sm ring-1 ring-[#6338E0]'
                            : 'border-neutral-200 bg-white text-slate-800 hover:border-[#6338E0]/40 hover:bg-[#F9F6FF]'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  })
                })()}
              </div>
              </div>
            </div>

            <div className="mt-4 lg:mt-3 pt-4 lg:pt-3 border-t border-neutral-200 shrink-0">
              <button
                type="button"
                disabled={!pickerDate || !pickerTime}
                onClick={handleConfirmPicker}
                className={`w-full rounded-2xl lg:rounded-xl py-3.5 sm:py-4 lg:py-2.5 text-base lg:text-[13px] font-extrabold shadow-md transition duration-200 flex items-center justify-center ${
                  pickerDate && pickerTime
                    ? 'bg-[#6338E0] hover:bg-[#5229C0] active:scale-[0.99] text-white shadow-[#6338E0]/25 cursor-pointer'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                }`}
              >
                Confirm
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SlotSelectionModal
