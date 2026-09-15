import { useEffect, useState } from 'react'
import Footer from '../../components/layout/Footer'
import Navbar from '../../components/layout/Navbar'
import { frontendApiClient } from '../../services/apiClient'

function VendorAccountDeletionPage({
  appSettings = {},
  cartCount,
  isLoggedIn,
  locationLabel,
  onBackHome,
  onGlobalSearch,
  onLocationChange,
  onLogin,
  onLogout,
  onOpenCart,
  onOpenProfile,
  onSearchSuggestionSelect,
  searchSuggestions,
  user,
}) {
  const branding = appSettings.branding || {}
  const appName = branding.app_name?.value || 'Rehanshi'

  const [accountType, setAccountType] = useState('') // Auto-detected from backend ('partner' or 'customer')
  const [step, setStep] = useState(1) // 1: Identifier, 2: OTP & Reason, 3: Confirmation, 4: Done
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationInput, setConfirmationInput] = useState('')
  const [reason, setReason] = useState('No longer using the platform')
  const [comments, setComments] = useState('')
  const [accountData, setAccountData] = useState(null)
  const [countdown, setCountdown] = useState(0)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')

  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleSendOtp = async (e) => {
    e?.preventDefault?.()
    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered mobile number or email address.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const response = await frontendApiClient.post('/account-deletion/send-otp', {
        identifier: identifier.trim(),
      })

      const detectedType = response.account?.account_type || 'partner'
      setAccountType(detectedType)
      setAccountData(response.account)
      setInfoMessage(response.message || 'A 6-digit verification code has been sent to your registered mobile number/email.')
      setOtp('')
      setCountdown(60)
      setStep(2)
    } catch (err) {
      setErrorMessage(err.message || 'No account found with this mobile number or email.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyAndProceed = (e) => {
    e?.preventDefault?.()
    if (!otp.trim() || otp.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit verification code.')
      return
    }
    setErrorMessage('')
    setInfoMessage('')
    setStep(3)
  }

  const handleConfirmDeletion = async (e) => {
    e?.preventDefault?.()
    if (confirmationInput.trim().toUpperCase() !== 'DELETE') {
      setErrorMessage('Please type "DELETE" in capital letters to confirm.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      await frontendApiClient.post('/account-deletion/confirm', {
        account_type: accountType,
        identifier: identifier.trim(),
        otp: otp.trim(),
        confirmation: confirmationInput.trim(),
        reason,
        comments: comments.trim(),
      })

      // Clear local storage sessions
      if (accountType === 'partner') {
        localStorage.removeItem('vendor_jwt')
        localStorage.removeItem('vendor_user')
      } else {
        localStorage.removeItem('customer_jwt')
        localStorage.removeItem('customer_user')
      }

      setStep(4)
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete deletion request. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-[#003F86]">
      <Navbar
        appSettings={appSettings}
        cartCount={cartCount}
        isLoggedIn={isLoggedIn}
        locationLabel={locationLabel}
        onBackHome={onBackHome}
        onGlobalSearch={onGlobalSearch}
        onLocationChange={onLocationChange}
        onLogin={onLogin}
        onLogout={onLogout}
        onOpenCart={onOpenCart}
        onOpenProfile={onOpenProfile}
        onSearchSuggestionSelect={onSearchSuggestionSelect}
        searchSuggestions={searchSuggestions}
        user={user}
      />

      <div className="mx-auto max-w-2xl px-3.5 py-5 sm:px-6 sm:py-8">
        {/* Header Breadcrumbs */}
        <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
          <button onClick={onBackHome} type="button" className="hover:text-blue-600 transition">
            Home
          </button>
          <span>/</span>
          <span className="text-slate-700">Account Deletion</span>
        </div>

        {/* Page Card */}
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs">
          {/* Header Banner */}
          <div className="border-b border-slate-100 bg-gradient-to-r from-red-600 to-rose-700 px-4 py-4 sm:px-6 sm:py-4.5 text-white">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-xs">
              ⚠️ Official Deletion Portal
            </div>
            <h1 className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight">
              Delete Your {appName} Account
            </h1>
            <p className="mt-1 text-xs text-rose-100 max-w-xl leading-relaxed">
              Submit an official request to permanently delete your Partner/Vendor or Customer account and all associated personal data.
            </p>
          </div>

          <div className="p-4 sm:p-6">
            {/* Step Indicators with connecting track line */}
            <div className="relative mb-6 pb-2">
              {/* Background Connecting Line */}
              <div className="absolute left-4 right-4 top-3 sm:top-3.5 -translate-y-1/2 h-0.5 bg-slate-200" aria-hidden="true">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${((Math.min(step, 4) - 1) / 3) * 100}%` }}
                />
              </div>

              {/* Steps Dots */}
              <div className="relative flex items-center justify-between">
                {[
                  { num: 1, title: 'Identity' },
                  { num: 2, title: 'Verify OTP' },
                  { num: 3, title: 'Confirm' },
                  { num: 4, title: 'Complete' },
                ].map((s) => {
                  const isDone = step > s.num
                  const isCurrent = step === s.num
                  return (
                    <div key={s.num} className="flex flex-col items-center">
                      <div
                        className={`grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-full text-[10px] sm:text-xs font-bold ring-4 ring-white transition z-10 ${
                          isCurrent
                            ? 'bg-rose-600 text-white shadow-sm shadow-rose-200 ring-rose-50'
                            : isDone
                            ? 'bg-emerald-600 text-white ring-emerald-50'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isDone ? '✓' : s.num}
                      </div>
                      <span
                        className={`mt-1 text-[10px] sm:text-[11px] font-bold ${
                          isCurrent ? 'text-rose-700' : isDone ? 'text-emerald-700' : 'text-slate-400'
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
                <span className="text-sm leading-none">⚠️</span>
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Info Message (Only on step 2) */}
            {infoMessage && step === 2 && (
              <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs font-medium text-blue-700">
                <span className="text-sm leading-none">ℹ️</span>
                <div>{infoMessage}</div>
              </div>
            )}

            {/* STEP 1: Identifier Entry */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label htmlFor="identifier" className="block text-xs font-bold text-slate-700">
                    Registered Mobile Number or Email
                  </label>
                  <input
                    id="identifier"
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter mobile number or email (e.g. 9876543210)"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    We will automatically identify whether this is a Partner/Vendor or Customer account and send an OTP.
                  </span>
                </div>

                {/* Critical Disclaimers */}
                <div className="rounded-lg border border-amber-200/80 bg-amber-50/70 p-3 text-[11px] text-amber-900 leading-relaxed space-y-1.5">
                  <p className="font-bold text-amber-950 flex items-center gap-1">
                    <span>⚠️</span> Please read the deletion consequences:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                    <li>Your profile, catalog services, KYC details, and saved addresses will be removed.</li>
                    <li>Active sessions and mobile app access will be logged out immediately.</li>
                    <li>This process is irreversible once confirmed.</li>
                  </ul>
                </div>

                <div className="flex justify-end gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition disabled:opacity-60"
                  >
                    {isLoading ? 'Verifying...' : 'Continue →'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: OTP Verification */}
            {step === 2 && (
              <form onSubmit={handleVerifyAndProceed} className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Account Found
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-slate-800">
                      {accountData?.name || 'Registered Account'} <span className="text-[11px] font-semibold text-rose-700">({accountType === 'partner' ? 'Vendor / Partner' : 'Customer'})</span>
                    </p>
                    <p className="text-[11px] text-slate-500">{identifier}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setOtp('')
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    Change
                  </button>
                </div>

                <div>
                  <label htmlFor="otp" className="block text-xs font-bold text-slate-700">
                    Enter 6-Digit Security Code (OTP)
                  </label>
                  <input
                    id="otp"
                    type="text"
                    maxLength="6"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit OTP"
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-center text-base font-black tracking-widest text-slate-800 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Valid for 10 minutes</span>
                    {countdown > 0 ? (
                      <span className="font-semibold text-slate-400">
                        Resend code in <span className="font-mono text-rose-600 font-bold">{String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isLoading}
                        className="font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="reason" className="block text-xs font-bold text-slate-700">
                    Reason for Deletion
                  </label>
                  <select
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  >
                    <option value="No longer using the platform">No longer using the platform</option>
                    <option value="Privacy / Data concerns">Privacy / Data concerns</option>
                    <option value="Created a duplicate account">Created a duplicate account</option>
                    <option value="Moving to a different city or location">Moving to a different city or location</option>
                    <option value="Closing business / shifting profession">Closing business / shifting profession</option>
                    <option value="Technical or service issues">Technical or service issues</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="comments" className="block text-xs font-bold text-slate-700">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    id="comments"
                    rows="2"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Feedback..."
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                <div className="flex justify-between gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-rose-700 transition"
                  >
                    Proceed to Confirmation →
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Final Confirmation */}
            {step === 3 && (
              <form onSubmit={handleConfirmDeletion} className="space-y-4">
                <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-center">
                  <span className="text-3xl">🚨</span>
                  <h3 className="mt-1 text-sm sm:text-base font-bold text-red-900">
                    Final Confirmation Required
                  </h3>
                  <p className="mt-1 text-xs text-red-700 leading-relaxed max-w-sm mx-auto">
                    You are about to permanently delete your <strong>{accountData?.name || identifier}</strong> ({accountType === 'partner' ? 'Vendor/Partner' : 'Customer'}) account.
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmKeyword" className="block text-xs font-bold text-slate-700 text-center">
                    Type <span className="font-mono font-black text-red-600">DELETE</span> to confirm permanent deletion:
                  </label>
                  <input
                    id="confirmKeyword"
                    type="text"
                    required
                    value={confirmationInput}
                    onChange={(e) => setConfirmationInput(e.target.value)}
                    placeholder="DELETE"
                    className="mt-1.5 w-full max-w-[220px] mx-auto block rounded-lg border border-slate-300 bg-white px-3 py-2 text-center font-mono text-sm font-black tracking-widest text-red-600 placeholder:text-slate-300 placeholder:font-normal uppercase outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20"
                  />
                </div>

                <div className="flex justify-between items-center gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || confirmationInput.trim().toUpperCase() !== 'DELETE'}
                    className="rounded-lg bg-red-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLoading ? 'Processing...' : 'Permanently Delete Account'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 4: Deletion Complete */}
            {step === 4 && (
              <div className="py-6 text-center space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-600">
                  ✓
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Account Deletion Request Completed
                </h2>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your account and associated data have been permanently scheduled for removal. Active sessions across all devices have been logged out.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="rounded-lg bg-[#003F86] px-6 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#0054A6] transition cursor-pointer"
                  >
                    Return to Home Page
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer
        appSettings={appSettings}
        onBackHome={onBackHome}
        onOpenCart={onOpenCart}
        onOpenProfile={onOpenProfile}
        pages={[]}
      />
    </main>
  )
}

export default VendorAccountDeletionPage
