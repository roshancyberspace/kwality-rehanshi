import { useEffect, useState } from 'react'
import { adminNavSections } from '../config/adminNav'
import { getBrandingDisplay, logoFallbackClass, logoImageClass } from '../../../utils/branding'
import { buildBackendUrl } from '../../../config/urls'
import GlobalSearchBar from './GlobalSearchBar'

const iconPaths = {
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  box: 'M21 8.5 12 13 3 8.5M12 22V13M3 8.5 12 4l9 4.5V18l-9 4-9-4Z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  card: 'M3 7h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM3 10h18',
  cash: 'M3 7h18v10H3ZM7 12h.01M17 12h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  chart: 'M4 19V5M4 19h16M8 16V9M12 16V6M16 16v-4',
  document: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 3.5 18.5 8H14V3.5ZM6 20V4h6v5h5v11H6Z',
  gear: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04-2.12 2.12-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V20.5h-3v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04-2.12-2.12.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.66-1.1H2.9v-3h.04A1.8 1.8 0 0 0 4.6 9a1.8 1.8 0 0 0-.36-1.98l-.04-.04 2.12-2.12.04.04A1.8 1.8 0 0 0 8.34 5.26 1.8 1.8 0 0 0 9.44 3.6V3.5h3v.1a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04 2.12 2.12-.04.04A1.8 1.8 0 0 0 19.4 9a1.8 1.8 0 0 0 1.66 1.1h.04v3h-.04A1.8 1.8 0 0 0 19.4 15Z',
  grid: 'M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h6v6h-6Z',
  handshake: 'M8 12 5.5 9.5a2.1 2.1 0 0 1 0-3l.7-.7a2.1 2.1 0 0 1 3 0L12 8.6l2.8-2.8a2.1 2.1 0 0 1 3 0l.7.7a2.1 2.1 0 0 1 0 3L16 12M8 12l4 4 4-4M8 12l-2 2M16 12l2 2',
  headset: 'M4 13v-1a8 8 0 0 1 16 0v1M4 13h3v5H4ZM17 13h3v5h-3ZM17 18c0 2-2 3-5 3',
  home: 'M3 11 12 4l9 7M5 10v10h5v-6h4v6h5V10',
  image: 'M4 5h16v14H4ZM7 16l4-4 3 3 2-2 3 3M8 9h.01',
  ledger: 'M6 3h12v18H6ZM9 7h6M9 11h6M9 15h4',
  lock: 'M7 10V8a5 5 0 0 1 10 0v2M6 10h12v11H6ZM12 15v2',
  pin: 'M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2ZM9 8h6M9 12h6M9 16h4',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z',
  tag: 'M20 13 13 20 4 11V4h7ZM7.5 7.5h.01',
  toolbox: 'M9 6V4h6v2M4 8h16v11H4ZM4 12h16M10 12v2h4v-2',
  trend: 'M4 17 10 11l4 4 6-8M15 7h5v5',
  user: 'M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z',
  wallet: 'M4 7h16v12H4ZM4 7l3-3h10l3 3M16 13h4',
  wrench: 'M14 7a5 5 0 0 0 6 6l-7 7a2 2 0 0 1-3-3l7-7a5 5 0 0 1-3-3ZM5 19l4-4',
}

function SidebarIcon({ name }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" viewBox="0 0 24 24">
      <path d={iconPaths[name] || iconPaths.grid} />
    </svg>
  )
}

const notificationFallbackAvatars = {
  Booking: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  Payment: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=160&q=80',
  Partner: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
  Support: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80',
}

const formatNotificationDate = (value) => {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  }).format(date)
}

const formatRelativeTime = (value) => {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) return `${seconds || 1} sec ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`

  return formatNotificationDate(value)
}

const getNotificationMeta = (notification) => {
  const metadata = notification.metadata || {}
  const relatedType = metadata.related_type || metadata.type || notification.channel || 'Activity'
  const relatedLabel = metadata.related_label || metadata.reference || notification.audience || 'Admin'

  return {
    actorName: metadata.actor_name || metadata.user_name || notification.audience || 'System',
    actorRole: metadata.actor_role || metadata.role || relatedType,
    avatarUrl: metadata.avatar_url || notificationFallbackAvatars[relatedType] || notificationFallbackAvatars.Support,
    relatedLabel,
    relatedType,
    timestamp: notification.sent_at || notification.created_at,
  }
}

function AdminLayout({
  activeTab,
  adminProfile,
  appSettings = {},
  children,
  notificationState,
  navSections = adminNavSections,
  notifications = [],
  notificationUnreadCount = 0,
  onBackHome,
  onLogout,
  onNotificationClick,
  onOpenProfileSettings,
  onTabChange,
  globalSearch,
  onGlobalSearchChange,
  onSelectSearchRecord,
  pageSubtitle = '',
}) {
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true))
  const activeSectionTitle = navSections.find((section) => section.title !== 'Overview' && section.items.some(([item]) => item === activeTab))?.title || ''
  const [expandedSection, setExpandedSection] = useState(activeSectionTitle)
  const { isLogoCircular, logoText, logoUrl } = getBrandingDisplay(appSettings)
  const firstName = adminProfile?.name?.split(' ')[0] || 'Admin'
  const designation = adminProfile?.role_name || 'Administrator'
  const avatarUrl = buildBackendUrl(adminProfile?.metadata?.avatar_url || adminProfile?.metadata?.profile_picture || adminProfile?.avatar_url || adminProfile?.image || '') || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80'
  const navItems = navSections.flatMap((section) => section.items)
  const handleTabChange = (tab) => {
    onTabChange(tab)
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false)
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setExpandedSection(activeSectionTitle)
  }, [activeSectionTitle])

  return (
    <main className="min-h-screen bg-[#F6FBFF] text-slate-800">
      <div className={`grid min-h-screen ${sidebarOpen ? 'lg:grid-cols-[248px_minmax(0,1fr)]' : 'lg:grid-cols-[64px_minmax(0,1fr)]'}`}>
        {sidebarOpen && (
          <button
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
        )}
        <aside
          className="admin-sidebar-drawer fixed inset-y-0 left-0 z-40 h-screen w-72 overflow-hidden border-r border-[#67B529]/20 bg-white shadow-2xl shadow-slate-900/20 lg:sticky lg:top-0 lg:z-auto lg:w-auto lg:shadow-none"
          data-open={sidebarOpen}
        >
          <div className={`flex h-16 items-center border-b border-[#67B529]/20 lg:h-[88px] ${sidebarOpen ? 'justify-between gap-2 px-3 lg:px-2' : 'justify-center'}`}>
            {sidebarOpen && (
              <button className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-[#EEF9E8]" onClick={onBackHome} type="button">
                
                  <img className="h-14 sm:h-16 w-auto max-w-[200px] object-contain" src="/logo2.png" alt="Rehanshi" />
                
              </button>
            )}
            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-600 transition hover:bg-[#EEF9E8] hover:text-[#67B529]"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              type="button"
            >
              <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d={sidebarOpen ? 'M6 6l12 12M18 6 6 18' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
          <nav className="max-h-[calc(100vh-64px)] overflow-y-auto px-2 py-3 [scrollbar-width:none] lg:max-h-[calc(100vh-88px)] [&::-webkit-scrollbar]:hidden">
            {sidebarOpen ? (
              <div className="grid gap-2">
                {navSections.map((section) => {
                  const isOverview = section.title === 'Overview'
                  const isExpanded = isOverview || expandedSection === section.title
                  const activeItem = section.items.find(([item]) => item === activeTab)
                  const firstIcon = section.items[0]?.[1] || 'grid'

                  return (
                    <section className="grid gap-1" key={section.title}>
                      {isOverview ? (
                        section.items.map(([item, icon]) => (
                          <button
                            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black transition ${
                              activeTab === item ? 'bg-[#67B529] text-white shadow-sm' : 'text-slate-700 hover:bg-[#EEF9E8] hover:text-[#003F86]'
                            }`}
                            key={item}
                            onClick={() => handleTabChange(item)}
                            type="button"
                          >
                            <SidebarIcon name={icon} />
                            <span className="min-w-0 flex-1 truncate">{item}</span>
                          </button>
                        ))
                      ) : (
                        <>
                          <button
                            aria-expanded={isExpanded}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs font-black transition ${
                              activeItem ? 'bg-[#EEF9E8] text-[#003F86] ring-1 ring-[#67B529]/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                            onClick={() => setExpandedSection((current) => (current === section.title ? '' : section.title))}
                            type="button"
                          >
                            <SidebarIcon name={activeItem?.[1] || firstIcon} />
                            <span className="min-w-0 flex-1 truncate">{section.title}</span>
                            <svg aria-hidden="true" className={`h-4 w-4 shrink-0 transition ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </button>
                          {isExpanded && (
                            <div className="ml-4 grid gap-1 border-l border-slate-200 pl-2">
                              {section.items.map(([item, icon]) => (
                                <button
                                  className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-black transition ${
                                    activeTab === item ? 'bg-[#67B529] text-white shadow-sm' : 'text-slate-600 hover:bg-[#EEF9E8] hover:text-[#003F86]'
                                  }`}
                                  key={item}
                                  onClick={() => handleTabChange(item)}
                                  type="button"
                                >
                                  <SidebarIcon name={icon} />
                                  <span className="min-w-0 flex-1 truncate">{item}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  )
                })}
              </div>
            ) : (
              <div className="grid justify-items-center gap-3">
                {navItems.map(([item, icon]) => (
                  <button
                    className={`grid h-10 w-10 place-items-center rounded-lg transition ${
                      activeTab === item ? 'bg-[#67B529] text-white shadow-md shadow-[#67B529]/20' : 'text-slate-500 hover:bg-[#EEF9E8] hover:text-[#67B529]'
                    }`}
                    key={item}
                    onClick={() => handleTabChange(item)}
                    title={item}
                    type="button"
                  >
                    <SidebarIcon name={icon} />
                  </button>
                ))}
              </div>
            )}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-[#67B529]/20 bg-white/95 backdrop-blur">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-x-2 gap-y-2.5 px-3.5 py-2.5 lg:flex lg:min-h-[88px] lg:items-center lg:justify-between lg:px-4 lg:py-0">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                  aria-label="Open mobile sidebar"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-[#67B529]/40 hover:bg-[#EEF9E8] hover:text-[#67B529] lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                  title="Open sidebar"
                  type="button"
                >
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <div className="min-w-0">
                  <p className="hidden truncate text-xs font-black uppercase tracking-wide text-[#67B529] lg:block">Home Service Marketplace</p>
                  <h1 className="truncate text-lg sm:text-2xl font-black text-slate-800">{activeTab}</h1>
                  {pageSubtitle ? (
                    <p className="mt-0.5 hidden truncate text-sm font-semibold text-slate-500 lg:block">{pageSubtitle}</p>
                  ) : null}
                </div>
              </div>
              <div className="contents lg:flex lg:flex-nowrap lg:items-center lg:gap-2">
                <GlobalSearchBar
                  globalSearch={globalSearch}
                  onGlobalSearchChange={onGlobalSearchChange}
                  onSelectRecord={onSelectSearchRecord}
                />
                <div className="group relative col-start-2 row-start-1 lg:order-none">
                  <button
                    className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-[#67B529] hover:bg-[#67B529] hover:text-white hover:shadow-[#67B529]/25"
                    onClick={onNotificationClick}
                    title="Notifications"
                    type="button"
                  >
                    <SidebarIcon name="bell" />
                    {notificationUnreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white">
                        {notificationUnreadCount > 9 ? '9+' : notificationUnreadCount}
                      </span>
                    )}
                    {notificationState === 'granted' && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#67B529]" />}
                  </button>
                  <div className="invisible absolute right-0 top-12 z-40 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
                    <div className="mb-2 flex items-center justify-between gap-3 px-1">
                      <p className="text-sm font-black text-slate-800">Notifications</p>
                      <span className="text-xs font-bold text-slate-500">{notificationUnreadCount} unread</span>
                    </div>
                    <div className="grid max-h-80 gap-2 overflow-y-auto">
                      {notifications.map((notification) => {
                        const meta = getNotificationMeta(notification)

                        return (
                          <article className="rounded-lg bg-slate-50 p-3" key={notification.id}>
                            <div className="flex items-start gap-3">
                              <img alt={meta.actorName} className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white" src={meta.avatarUrl} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-black text-slate-900">{meta.actorName}</p>
                                    <p className="truncate text-[11px] font-bold text-slate-500">{meta.actorRole}</p>
                                  </div>
                                  <div className="shrink-0 text-right">
                                    <p className="text-[11px] font-black text-[#67B529]">{formatRelativeTime(meta.timestamp)}</p>
                                    <p className="text-[10px] font-bold text-slate-400">{formatNotificationDate(meta.timestamp)}</p>
                                  </div>
                                </div>
                                <div className="mt-2 flex items-start justify-between gap-3">
                                  <p className="text-sm font-black text-slate-900">{notification.title}</p>
                                  {!notification.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-rose-500" />}
                                </div>
                                <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-500">{notification.message}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <span className="rounded-md bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">{meta.relatedType}</span>
                                  <span className="rounded-md bg-[#EEF9E8] px-2 py-1 text-[10px] font-black text-[#67B529] ring-1 ring-[#67B529]/20">{meta.relatedLabel}</span>
                                  <span className="rounded-md bg-white px-2 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-200">{notification.channel}</span>
                                </div>
                              </div>
                            </div>
                          </article>
                        )
                      })}
                      {!notifications.length && <p className="px-1 py-3 text-sm font-semibold text-slate-500">No notifications yet.</p>}
                    </div>
                  </div>
                </div>
                <button className="group col-start-3 row-start-1 flex h-10 items-center gap-2 rounded-xl px-1 text-left transition duration-200 hover:bg-slate-100 hover:text-[#003F86] lg:order-none" onClick={onOpenProfileSettings} type="button">
                  <img alt={firstName} className="h-10 w-10 rounded-full object-cover transition duration-200 group-hover:ring-2 group-hover:ring-blue-300" src={avatarUrl} />
                  <span className="hidden leading-tight lg:block">
                    <span className="block text-sm font-black text-slate-800 transition group-hover:text-[#003F86]">{firstName}</span>
                    <span className="block text-xs font-bold text-slate-500 transition group-hover:text-[#67B529]">{designation}</span>
                  </span>
                </button>
                {onLogout && (
                  <button className="col-start-4 row-start-1 lg:order-none grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 lg:w-auto lg:px-3 lg:py-2 text-sm font-black" onClick={onLogout} title="Logout" type="button">
                    <svg aria-hidden="true" className="h-5 w-5 shrink-0 lg:hidden" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    <span className="hidden lg:inline">Logout</span>
                  </button>
                )}
              </div>
            </div>
          </header>
          <div className="grid gap-4 px-3 py-4 sm:px-4 lg:p-4">{children}</div>
        </section>
      </div>
    </main>
  )
}

export default AdminLayout

