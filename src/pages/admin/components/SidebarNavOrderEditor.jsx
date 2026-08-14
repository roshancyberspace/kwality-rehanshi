function MoveButton({ disabled, label, onClick }) {
  return (
    <button
      className="grid h-7 w-7 place-items-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30"
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {label === 'Up' ? '↑' : '↓'}
    </button>
  )
}

function SidebarNavOrderEditor({ onChange, value }) {
  const sections = Array.isArray(value) ? value : []

  const moveSection = (index, direction) => {
    const next = sections.map((section) => ({ ...section, items: [...section.items] }))
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const moveItem = (sectionIndex, itemIndex, direction) => {
    const next = sections.map((section) => ({ ...section, items: [...section.items] }))
    const items = next[sectionIndex].items
    const target = itemIndex + direction
    if (target < 0 || target >= items.length) return
    ;[items[itemIndex], items[target]] = [items[target], items[itemIndex]]
    onChange(next)
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-slate-600">
        Use the arrows to rearrange sidebar groups and the links inside them. New menus added later stay at the end until you move them.
      </p>
      {sections.map((section, sectionIndex) => (
        <div className="rounded-xl border border-slate-200 bg-white p-3" key={section.title}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-black text-[#003F86]">{section.title}</p>
            <div className="flex gap-1">
              <MoveButton disabled={sectionIndex === 0} label="Up" onClick={() => moveSection(sectionIndex, -1)} />
              <MoveButton disabled={sectionIndex === sections.length - 1} label="Down" onClick={() => moveSection(sectionIndex, 1)} />
            </div>
          </div>
          <div className="grid gap-1">
            {section.items.map(([name], itemIndex) => (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5" key={name}>
                <span className="text-sm font-semibold text-slate-700">{name}</span>
                <div className="flex gap-1">
                  <MoveButton disabled={itemIndex === 0} label="Up" onClick={() => moveItem(sectionIndex, itemIndex, -1)} />
                  <MoveButton disabled={itemIndex === section.items.length - 1} label="Down" onClick={() => moveItem(sectionIndex, itemIndex, 1)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default SidebarNavOrderEditor
