export const adminNavItems = [
  ['Dashboard', 'chart'],
  ['Reports', 'trend'],
  ['Bookings', 'calendar'],
  ['Assign Professional', 'handshake'],
  ['Vendor Jobs', 'wrench'],
  ['Reviews', 'star'],
  ['Categories', 'grid'],
  ['Services', 'receipt'],
  ['Sub-Services', 'receipt'],
  ['Rate List', 'receipt'],
  ['Service Packages', 'box'],
  ['Package Detail Sections', 'ledger'],
  ['Brands', 'tag'],
  ['Customers', 'user'],
  ['Saved Addresses', 'home'],
  ['Partners', 'toolbox'],
  ['Documents', 'document'],
  ['Vendor Dashboard', 'user'],
  ['Payments', 'card'],
  ['Wallet Transactions', 'ledger'],
  ['Booking Ledger', 'ledger'],
  ['Vendor Wallet', 'wallet'],
  ['Customer Wallet', 'wallet'],
  ['Payouts', 'cash'],
  ['Offers & Coupons', 'tag'],
  ['App Content', 'image'],
  ['Mobile Banners', 'image'],
  ['Testimonials', 'star'],
  ['Notifications', 'bell'],
  ['Support Tickets', 'headset'],
  ['Locations', 'pin'],
  ['Pages', 'document'],
  ['Invoice Setting', 'receipt'],
  ['Admin Users', 'shield'],
  ['Roles', 'lock'],
  ['Settings', 'gear'],
  ['Login Logs', 'clock'],
]

export const adminNavSections = [
  {
    title: 'Overview',
    items: [
      ['Dashboard', 'chart'],
      ['Vendor Dashboard', 'user'],
      ['Reports', 'trend'],
    ],
  },
  {
    title: 'Bookings & Orders',
    items: [
      ['Bookings', 'calendar'],
      ['Assign Professional', 'handshake'],
      ['Vendor Jobs', 'wrench'],
      ['Reviews', 'star'],
    ],
  },
  {
    title: 'Service Catalog',
    items: [
      ['Categories', 'grid'],
      ['Services', 'receipt'],
      ['Sub-Services', 'receipt'],
      ['Rate List', 'receipt'],
      ['Service Packages', 'box'],
      ['Package Detail Sections', 'ledger'],
      ['Brands', 'tag'],
    ],
  },
  {
    title: 'User Management',
    items: [
      ['Customers', 'user'],
      ['Saved Addresses', 'home'],
      ['Partners', 'toolbox'],
      ['Documents', 'document'],
    ],
  },
  {
    title: 'Finance & Payments',
    items: [
      ['Payments', 'card'],
      ['Wallet Transactions', 'ledger'],
      ['Booking Ledger', 'ledger'],
      ['Vendor Wallet', 'wallet'],
      ['Customer Wallet', 'wallet'],
      ['Payouts', 'cash'],
    ],
  },
  {
    title: 'Marketing',
    items: [
      ['Offers & Coupons', 'tag'],
      ['App Content', 'image'],
      ['Mobile Banners', 'image'],
      ['Notifications', 'bell'],
    ],
  },
  {
    title: 'Support',
    items: [
      ['Support Tickets', 'headset'],
      ['Testimonials', 'star'],
    ],
  },
  {
    title: 'System Settings',
    items: [
      ['Locations', 'pin'],
      ['Pages', 'document'],
      ['Invoice Setting', 'receipt'],
      ['Admin Users', 'shield'],
      ['Roles', 'lock'],
      ['Settings', 'gear'],
      ['Login Logs', 'clock'],
    ],
  },
]

export const ADMIN_NAV_ORDER_EVENT = 'admin-sidebar-nav-order-updated'

export const parseSidebarNavOrder = (raw) => {
  if (!raw) return null
  if (typeof raw === 'object' && Array.isArray(raw.sections)) return raw
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed?.sections ? parsed : null
  } catch {
    return null
  }
}

export const serializeSidebarNavOrder = (sections) => ({
  sections: (sections || []).map((section) => ({
    items: section.items.map(([name]) => name),
    title: section.title,
  })),
})

export const applySidebarNavOrder = (sections, order) => {
  if (!order?.sections || !Array.isArray(order.sections) || order.sections.length === 0) {
    return sections
  }

  const used = new Set()
  const next = []

  order.sections.forEach((saved) => {
    const source = sections.find((section) => section.title === saved.title)
    if (!source) return

    const savedNames = Array.isArray(saved.items) ? saved.items : source.items.map(([name]) => name)
    const items = []
    savedNames.forEach((name) => {
      const found = source.items.find(([itemName]) => itemName === name)
      if (found && !used.has(found[0])) {
        items.push(found)
        used.add(found[0])
      }
    })
    source.items.forEach((item) => {
      if (!used.has(item[0])) {
        items.push(item)
        used.add(item[0])
      }
    })
    if (items.length) next.push({ title: source.title, items })
  })

  sections.forEach((section) => {
    if (next.some((item) => item.title === section.title)) return
    const items = section.items.filter(([name]) => !used.has(name))
    items.forEach(([name]) => used.add(name))
    if (items.length) next.push({ title: section.title, items })
  })

  return next
}

export const splitBookingDate = (dateTime) => {
  const [date, time, period] = dateTime.split(', ')
  return {
    date,
    time: [time, period].filter(Boolean).join(' '),
  }
}
