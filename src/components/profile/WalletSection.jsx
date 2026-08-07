function WalletSection({ transactions = [], wallet }) {
  const formatMoney = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`

  return (
    <section className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm lg:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#67B529]">KwalityCare Wallet</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">Wallet balance</h2>
        </div>
        <div className="rounded-lg bg-[#003F86] px-4 py-2.5 text-right text-white self-start sm:self-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">Available</p>
          <p className="text-lg font-bold leading-tight">{formatMoney(wallet?.balance)}</p>
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        {[
          ['Total credit', wallet?.total_credit ?? 0, true],
          ['Total debit', wallet?.total_debit ?? 0, true],
          ['Status', wallet?.status || 'Active', false],
        ].map(([label, value, isMoney]) => (
          <div className="rounded-lg border border-blue-100 bg-[#F6FBFF] px-3.5 py-3" key={label}>
            <p className="text-xs font-bold uppercase tracking-wider text-blue-700">{label}</p>
            <p className="mt-1.5 text-base font-bold text-slate-900">
              {isMoney ? formatMoney(value) : value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-blue-100">
        <div className="flex items-center justify-between bg-[#F6FBFF] px-3.5 py-2.5">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-800">Recent wallet activity</p>
          <button className="text-sm font-bold text-[#67B529] hover:text-[#4f9a1f] transition-colors" type="button">
            Add money
          </button>
        </div>
        <div className="divide-y divide-neutral-100">
          {transactions.length === 0 ? (
            <p className="px-3.5 py-4 text-sm text-neutral-500 text-center">No wallet activity yet.</p>
          ) : (
            transactions.map((transaction) => (
              <article
                className="grid gap-1 px-3.5 py-3 sm:grid-cols-[1fr_80px_120px] sm:items-center"
                key={transaction.id}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{transaction.title}</p>
                  <p className="mt-0.5 text-xs font-medium text-blue-700/80 truncate">
                    {transaction.id} | {transaction.date}
                  </p>
                </div>
                <span
                  className={`text-sm font-bold ${
                    transaction.type === 'Credit' ? 'text-[#67B529]' : 'text-rose-600'
                  }`}
                >
                  {transaction.type}
                </span>
                <span className="text-sm font-bold text-slate-900 sm:text-right">
                  {transaction.type === 'Credit' ? '+' : '-'} {formatMoney(transaction.amount)}
                </span>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  )
}

export default WalletSection
