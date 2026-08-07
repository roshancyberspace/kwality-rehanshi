function ProcessingOverlay() {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm animate-modal-fade">
      <div className="grid min-w-52 place-items-center gap-4 rounded-xl border border-white/20 bg-white px-8 py-7 text-center shadow-2xl animate-modal-slide">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-black uppercase tracking-wide text-slate-800">Processing</p>
      </div>
    </div>
  )
}

export default ProcessingOverlay
