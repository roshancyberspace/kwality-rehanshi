import { adminNavSections } from '../config/adminNav'

export const roleActions = [
  ['view', 'View'],
  ['create', 'Create'],
  ['edit', 'Edit'],
  ['delete', 'Delete'],
  ['approve', 'Approve'],
  ['assign', 'Assign'],
  ['export', 'Export'],
]

export const permissionModules = adminNavSections.flatMap((section) =>
  section.items.map(([name]) => ({
    actions: roleActions.map(([action]) => action),
    key: name,
    section: section.title,
  })),
)

export const allPermissionKeys = permissionModules.flatMap((module) =>
  module.actions.map((action) => `${module.key}.${action}`),
)

export const normalizePermissions = (permissions = []) => {
  if (permissions === '*') return ['*']
  if (Array.isArray(permissions)) return permissions
  if (typeof permissions === 'string') {
    try {
      const parsed = JSON.parse(permissions)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return permissions.split(',').map((item) => item.trim()).filter(Boolean)
    }
  }

  return []
}

export const isSuperAdminProfile = (profile) => {
  if (!profile) return true
  const permissions = normalizePermissions(profile?.permissions)
  return permissions.includes('*') || String(profile?.role_name || '').toLowerCase() === 'super admin'
}

export const canAccessModule = (profile, moduleName, action = 'view') => {
  if (isSuperAdminProfile(profile)) return true
  const permissions = normalizePermissions(profile?.permissions)
  return permissions.includes(`${moduleName}.${action}`)
}

export const filterNavSectionsByPermissions = (sections, profile) => {
  if (isSuperAdminProfile(profile)) return sections

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter(([item]) => canAccessModule(profile, item)),
    }))
    .filter((section) => section.items.length)
}
