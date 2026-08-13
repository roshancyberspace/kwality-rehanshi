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
  ['Notifications', 'bell'],
  ['Support Tickets', 'headset'],
  ['Locations', 'pin'],
  ['Pages', 'document'],
  ['Invoice Setting', 'receipt'],
  ['Admin Users', 'shield'],
  ['Roles', 'lock'],
  ['Settings', 'gear'],
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
    title: 'Marketing & Support',
    items: [
      ['Offers & Coupons', 'tag'],
      ['App Content', 'image'],
      ['Mobile Banners', 'image'],
      ['Notifications', 'bell'],
      ['Support Tickets', 'headset'],
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
    ],
  },
]

export const topServices = [
  ['AC Repair', 284, 'Rs. 1.8L'],
  ['Women Salon at Home', 231, 'Rs. 1.4L'],
  ['Deep Home Cleaning', 166, 'Rs. 2.9L'],
  ['Electrician Visit', 142, 'Rs. 42K'],
]

export const bookingStatusSummary = [
  ['Pending', 18],
  ['Professional Assigned', 13],
  ['On The Way', 25],
  ['Completed', 23],
  ['Cancelled', 17],
  ['Refunded', 13],
]

export const splitBookingDate = (dateTime) => {
  const [date, time, period] = dateTime.split(', ')
  return {
    date,
    time: [time, period].filter(Boolean).join(' '),
  }
}
