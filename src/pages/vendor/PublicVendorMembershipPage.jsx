import { useEffect, useMemo, useState } from 'react'
import { ShimmerBlock } from '../../components/common/Shimmer'
import { IdentityCard, MembershipCertificate } from '../../components/vendor/MembershipAssets'
import { buildBackendUrl } from '../../config/urls'
import { vendorApi } from '../../services/vendorApi'

const getPublicAssetUrl = (path) => {
  return buildBackendUrl(path)
}

function PublicVendorMembershipPage({ onBackHome, partnerId }) {
  const [partner, setPartner] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    vendorApi.publicProfile(partnerId)
      .then((response) => {
        if (!ignore) setPartner(response)
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [partnerId])

  const publicUrl = useMemo(() => window.location.href, [])
  const profilePicture = getPublicAssetUrl(partner?.profile_picture || '')

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 lg:px-8">
          <button className="flex items-center gap-3 text-left" onClick={onBackHome} type="button">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-950 text-xs font-black text-white">RH</span>
            <span>
              <span className="block text-lg font-black">Vendor Verification</span>
              <span className="text-xs font-bold text-slate-500">Public membership certificate</span>
            </span>
          </button>
          {partner?.membership?.published && <span className="rounded-full bg-[#EEF9E8] px-3 py-1 text-xs font-black text-[#67B529] ring-1 ring-[#67B529]/20">Verified Published</span>}
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 lg:px-8">
        {loading && (
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <ShimmerBlock className="h-8 w-64" />
              <ShimmerBlock className="mt-6 h-80 w-full" />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <ShimmerBlock className="h-20" />
                <ShimmerBlock className="h-20" />
                <ShimmerBlock className="h-20" />
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <ShimmerBlock className="mx-auto h-28 w-28 rounded-full" />
              <ShimmerBlock className="mx-auto mt-5 h-6 w-44" />
              <ShimmerBlock className="mt-6 h-48 w-full" />
            </div>
          </div>
        )}
        {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700">{error}</div>}
        {partner && (
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            <MembershipCertificate membership={partner.membership} partner={partner} publicUrl={publicUrl} />
            <IdentityCard membership={partner.membership} partner={partner} profilePicture={profilePicture} />
          </div>
        )}
      </section>
    </main>
  )
}

export default PublicVendorMembershipPage
