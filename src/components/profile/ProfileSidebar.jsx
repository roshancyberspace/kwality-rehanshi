import { buildBackendUrl } from '../../config/urls'

const getInitials = (name = '') => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')

  return initials || 'GU'
}

function DetailRow({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-wider text-blue-700/80">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-[#003F86]">{value || 'Not added'}</p>
    </div>
  )
}

function AvatarButton({ initials, isUploading, onChangeProfilePicture, user }) {
  const profileImage = buildBackendUrl(user?.metadata?.profile_picture || user?.metadata?.avatar_url || user?.avatar_url || user?.image || '')

  return (
    <button
      aria-label="Update profile picture"
      className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white text-xl font-black text-[#003F86] ring-1 ring-white/40 lg:h-14 lg:w-14 lg:text-base"
      disabled={isUploading}
      onClick={onChangeProfilePicture}
      title="Update profile picture"
      type="button"
    >
      {profileImage ? (
        <img alt="" className="h-full w-full object-cover" src={profileImage} />
      ) : (
        <span className="grid h-full w-full place-items-center">{initials}</span>
      )}
      <span className="absolute bottom-0 right-0 grid h-6 w-6 place-items-center rounded-full bg-[#003F86] text-white ring-2 ring-white lg:h-5 lg:w-5">
        <svg aria-hidden="true" className="h-3.5 w-3.5 lg:h-3 lg:w-3" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 24 24">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </span>
    </button>
  )
}

function ProfileSidebar({ isProfilePictureUploading, locationLabel, onChangeProfilePicture, onEditProfile, onLogout, onRaiseTicket, onOpenCart, onMenuSelect, stats, user }) {
  const initials = getInitials(user.name)

  return (
    <aside className="h-fit lg:sticky lg:top-28">
      {/* Desktop card */}
      <div className="hidden overflow-hidden rounded-xl border border-blue-100 bg-white shadow-sm lg:block">
        <div className="bg-[#003F86] px-4 py-4 text-white">
          <div className="flex items-center gap-3">
            <AvatarButton initials={initials} isUploading={isProfilePictureUploading} onChangeProfilePicture={onChangeProfilePicture} user={user} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-base font-bold leading-tight">{user.name}</h2>
                <span className="shrink-0 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white/90">
                  {user.status || 'Active'}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-white/75">{user.phone || 'Phone not added'}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3.5 p-4">
          <DetailRow label="Email" value={user.email} />

          {locationLabel ? (
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700/80">Location</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-slate-700">{locationLabel}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-3 gap-2 rounded-lg border border-blue-50 bg-[#F6FBFF] p-2.5">
            {[
              ['Orders', stats.orders],
              ['Addresses', stats.addresses],
              ['Reviews', stats.reviews],
            ].map(([label, value]) => (
              <div className="min-w-0 text-center" key={label}>
                <p className="text-base font-bold text-[#003F86]">{value ?? 0}</p>
                <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-blue-700/70">{label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 pt-0.5">
            <button
              className="w-full rounded-lg bg-[#003F86] px-3 py-2.5 text-sm font-bold text-white hover:bg-[#0054A6] transition"
              onClick={onEditProfile}
              type="button"
            >
              Edit profile
            </button>
            {onLogout ? (
              <button
                className="w-full rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition"
                onClick={onLogout}
                type="button"
              >
                Logout
              </button>
            ) : null}
            {onRaiseTicket ? (
              <button
                className="w-full py-1.5 text-center text-sm font-semibold text-[#003F86] underline underline-offset-2 hover:text-[#0054A6] transition"
                onClick={onRaiseTicket}
                type="button"
              >
                Raise a Ticket
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="bg-white lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 pb-5">
          <div className="flex items-center gap-3">
            <div className="scale-75 origin-left">
              <AvatarButton initials={initials} isUploading={isProfilePictureUploading} onChangeProfilePicture={onChangeProfilePicture} user={user} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">{user.name || 'User'}</h2>
              <p className="mt-0.5 text-sm sm:text-base font-medium text-slate-500">{user.phone || user.email || '+91 0000000000'}</p>
            </div>
          </div>
          <button className="p-2 shrink-0" onClick={onEditProfile} type="button">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>

        <div className="h-3 w-full bg-slate-50 border-t border-b border-slate-100/60" />

        {/* Menu Items */}
        <div className="py-2">
          {[
            { icon: <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>, label: 'My bookings', tab: 'bookings' },
           { icon: <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>, label: 'My rating', tab: 'ratings' },
            { icon: <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Manage addresses', tab: 'addresses' },
            { icon: <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M18.364 5.636l-1.414 1.414A9 9 0 103.05 13.05l1.414-1.414a7 7 0 119.9-9.9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l2.5 1.5" /></svg>, label: 'Raise a Ticket', tab: 'raise_ticket' },
            { icon: <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, label: 'Settings', tab: 'settings' },
          ].map((item, index) => (
            <button className="flex w-full items-center justify-between px-4 sm:px-6 py-4 hover:bg-slate-50 transition" key={index} onClick={() => onMenuSelect?.(item.tab)} type="button">
              <div className="flex items-center gap-5 text-slate-700">
                <span className="grid h-5 w-5 place-items-center text-slate-800 shrink-0">{item.icon}</span>
                <span className="text-[15px] sm:text-base font-normal">{item.label}</span>
              </div>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
          ))}
        </div>

        {/* Promo Card */}
     <div className="px-4 sm:px-6 py-3">
  <div className="rounded-xl bg-[#F5F2FE] p-5 relative overflow-hidden shadow-sm">
    <div className="relative z-10 w-[72%]">
      <h3 className="text-[15px] sm:text-base font-semibold text-slate-900">
        Book your service
      </h3>

      <p className="mt-1 text-xs sm:text-sm text-slate-700 leading-snug">
        Schedule your service in just a few taps and get professional assistance at your doorstep.
      </p>

      <button
        className="mt-3.5 rounded-lg bg-[#6744FF] px-4 py-2.5 text-[13px] sm:text-sm font-semibold text-white hover:bg-[#5835E5] transition"
        type="button"
      >
        Book Now
      </button>
    </div>

    <div className="absolute -right-3 -bottom-3 w-28 h-28">
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 40H80V85C80 87.76 77.76 90 75 90H25C22.24 90 20 87.76 20 85V40Z"
          fill="#FFA5C6"
        />
        <path
          d="M15 30C15 27.24 17.24 25 20 25H80C82.76 25 85 27.24 85 30V40H15V30Z"
          fill="#FFA5C6"
        />
        <path d="M45 25V90H55V25H45Z" fill="#FF477E" />
        <path
          d="M47 25C47 15 35 15 35 20C35 25 45 25 47 25Z"
          stroke="#FF477E"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M53 25C53 15 65 15 65 20C65 25 55 25 53 25Z"
          stroke="#FF477E"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="15" r="2" fill="#FFD166" />
        <circle cx="75" cy="20" r="1.5" fill="#FFD166" />
        <circle cx="85" cy="45" r="1.5" fill="#FFD166" />
      </svg>
    </div>
  </div>
</div>

        {/* Logout + Raise ticket */}
        {onLogout ? (
          <div className="px-4 sm:px-6 py-4 pb-8">
            <button className="w-full rounded-xl border border-slate-200 py-3 text-[15px] sm:text-base font-bold text-[#D33619] hover:bg-slate-50 transition shadow-sm" onClick={onLogout} type="button">
              Logout
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  )
}

export default ProfileSidebar
