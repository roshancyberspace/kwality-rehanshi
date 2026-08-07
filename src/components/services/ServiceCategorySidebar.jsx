import { formatDisplayName } from '../../utils/displayText'

function ServiceCategorySidebar({ activeId, categories, title, onSelect }) {
  return (
    <aside className="h-fit rounded-lg border border-blue-100 bg-white p-3 shadow-sm lg:sticky lg:top-28">
      <p className="px-2 pb-3 text-sm font-bold">{title}</p>
      <div className="grid gap-2">
        {categories.map((category) => (
          <button
            className={`flex items-center gap-3 rounded-md p-2 text-left text-sm font-semibold transition ${
              activeId === category.id ? 'bg-[#003F86] text-white' : 'hover:bg-blue-50'
            }`}
            key={category.id}
            onClick={() => onSelect(category.id)}
            type="button"
          >
            <img className="h-12 w-12 rounded-md object-cover" src={category.image} alt="" />
            <span>{formatDisplayName(category.name)}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}

export default ServiceCategorySidebar
