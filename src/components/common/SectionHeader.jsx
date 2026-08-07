function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <div className="mb-6 w-full">
      {/* Eyebrow */}
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#67B529]/15 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-[#67B529] mb-2 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[#67B529]"></span>
          {eyebrow}
        </span>
      )}

      {/* Main Title & Inline Action Button Row */}
      <div className="flex flex-row items-center justify-between gap-4 w-full">
        <h2 className="text-2xl font-black text-[#003F86] sm:text-3xl md:text-4xl tracking-tight leading-tight">
          {title}
        </h2>

        {action && (
          <div className="shrink-0 flex items-center">
            {action}
          </div>
        )}
      </div>

      {/* Description below heading */}
      {description && (
        <p className="mt-2.5 max-w-3xl text-sm md:text-base leading-6 text-slate-600 font-medium">
          {description}
        </p>
      )}
    </div>
  );
}

export default SectionHeader;