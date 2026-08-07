function ShimmerBlock({ className = '' }) {
  return <span className={`shimmer-block block rounded-md ${className}`} aria-hidden="true" />
}

function ServiceCardGridSkeleton({ count = 8 }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm" key={index}>
          <ShimmerBlock className="aspect-[4/3] w-full rounded-none" />
          <div className="p-4">
            <ShimmerBlock className="h-5 w-3/4" />
            <ShimmerBlock className="mt-3 h-4 w-full" />
            <ShimmerBlock className="mt-2 h-4 w-5/6" />
            <div className="mt-6 flex items-center justify-between gap-4">
              <ShimmerBlock className="h-4 w-24" />
              <ShimmerBlock className="h-9 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ServiceDetailSkeleton() {
  return (
    <>
      <section className="border-b border-blue-100 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-7 lg:px-8">
          <ShimmerBlock className="mb-6 h-4 w-36" />
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="w-full max-w-lg">
              <ShimmerBlock className="h-10 w-4/5" />
              <ShimmerBlock className="mt-5 h-5 w-64" />
            </div>
            <div className="w-full max-w-xl">
              <ShimmerBlock className="h-4 w-full" />
              <ShimmerBlock className="mt-3 h-4 w-4/5" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[310px_minmax(0,1fr)_320px] lg:px-8">
        <aside className="h-fit rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
          <ShimmerBlock className="h-4 w-32" />
          <div className="mt-8 grid grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="grid justify-items-center" key={index}>
                <ShimmerBlock className="h-15 w-15 rounded-lg" />
                <ShimmerBlock className="mt-3 h-4 w-16" />
              </div>
            ))}
          </div>
        </aside>

        <div className="grid gap-5">
          {Array.from({ length: 3 }).map((_, sectionIndex) => (
            <section className="overflow-hidden rounded-lg border border-blue-100 bg-white shadow-sm" key={sectionIndex}>
              <div className="border-b border-blue-100 px-5 py-4">
                <ShimmerBlock className="h-7 w-48" />
              </div>
              {Array.from({ length: 3 }).map((_, itemIndex) => (
                <article className="grid gap-4 border-b border-blue-100 px-5 py-5 last:border-b-0 md:grid-cols-[minmax(0,1fr)_128px]" key={itemIndex}>
                  <div>
                    <ShimmerBlock className="h-5 w-3/4" />
                    <ShimmerBlock className="mt-3 h-4 w-48" />
                    <ShimmerBlock className="mt-3 h-4 w-56" />
                    <ShimmerBlock className="mt-5 h-4 w-28" />
                  </div>
                  <div className="hidden md:block">
                    <ShimmerBlock className="h-28 w-full rounded-lg" />
                    <ShimmerBlock className="mx-auto -mt-4 h-10 w-24" />
                  </div>
                </article>
              ))}
            </section>
          ))}
        </div>

        <aside className="grid h-fit gap-5">
          <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
            <ShimmerBlock className="h-14 w-full" />
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-7 shadow-sm">
            <ShimmerBlock className="h-7 w-44" />
            <ShimmerBlock className="mt-6 h-4 w-full" />
            <ShimmerBlock className="mt-3 h-4 w-5/6" />
            <ShimmerBlock className="mt-3 h-4 w-3/4" />
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
            <ShimmerBlock className="h-6 w-20" />
            <ShimmerBlock className="mt-5 h-36 w-full rounded-lg" />
          </div>
        </aside>
      </section>
    </>
  )
}

function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[0.75fr_1fr]">
        <div>
          <ShimmerBlock className="h-5 w-32" />
          <ShimmerBlock className="mt-5 h-12 w-full max-w-lg" />
          <ShimmerBlock className="mt-4 h-4 w-full max-w-xl" />
          <ShimmerBlock className="mt-3 h-4 w-4/5 max-w-lg" />
          <div className="mt-8 grid grid-cols-3 gap-4">
            <ShimmerBlock className="h-20" />
            <ShimmerBlock className="h-20" />
            <ShimmerBlock className="h-20" />
          </div>
        </div>
        <ShimmerBlock className="min-h-[320px] rounded-lg" />
      </div>
      <div className="mt-10">
        <ShimmerBlock className="h-7 w-64" />
        <ServiceCardGridSkeleton count={4} />
      </div>
    </div>
  )
}

function AdminPageSkeleton() {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ShimmerBlock className="h-10 w-full sm:w-64" />
        <div className="flex gap-2">
          <ShimmerBlock className="h-10 w-24" />
          <ShimmerBlock className="h-10 w-32" />
        </div>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="grid grid-cols-5 gap-4">
            <ShimmerBlock className="h-4 w-full" />
            <ShimmerBlock className="h-4 w-full" />
            <ShimmerBlock className="h-4 w-full" />
            <ShimmerBlock className="h-4 w-full" />
            <ShimmerBlock className="h-4 w-full" />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 6 }).map((_, i) => (
            <div className="grid grid-cols-5 items-center gap-4 px-5 py-4" key={i}>
              <ShimmerBlock className="h-4 w-3/4" />
              <ShimmerBlock className="h-4 w-1/2" />
              <ShimmerBlock className="h-6 w-16 rounded-full" />
              <ShimmerBlock className="h-4 w-2/3" />
              <div className="flex justify-end gap-2">
                <ShimmerBlock className="h-8 w-8 rounded-lg" />
                <ShimmerBlock className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export { AdminPageSkeleton, HomeSkeleton, ServiceCardGridSkeleton, ServiceDetailSkeleton, ShimmerBlock }
