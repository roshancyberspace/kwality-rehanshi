import { useMemo, useState } from 'react'
import { ActionButton, ActionIconButton, DataTable, Panel, StatusBadge } from '../../../components/admin/AdminUI'
import { slugify } from '../../../utils/slugs'
import { allPermissionKeys, permissionModules, roleActions } from '../utils/permissions'

const emptyRole = {
  name: '',
  permissions: [],
  slug: '',
  status: 'Active',
}

const permissionLabel = (value) => {
  if (value === '*') return 'All permissions'
  const [module, action] = value.split('.')
  return `${module}: ${action}`
}

function RolesPermissionsView({
  globalSearch,
  isSaving,
  onBackToList,
  onDelete,
  onSave,
  roles,
  viewMode,
}) {
  const [editingRole, setEditingRole] = useState(null)
  const [search, setSearch] = useState('')

  const form = editingRole || emptyRole
  const isForm = viewMode === 'create' || viewMode === 'edit'

  const filteredRoles = useMemo(() => {
    const query = [search, globalSearch].filter(Boolean).join(' ').toLowerCase()
    if (!query) return roles

    return roles.filter((role) =>
      [role.name, role.slug, role.status, ...(role.permissions || []).map(permissionLabel)]
        .join(' ')
        .toLowerCase()
        .includes(query),
    )
  }, [globalSearch, roles, search])

  const startCreate = () => {
    setEditingRole(emptyRole)
    onBackToList('create')
  }

  const startEdit = (role) => {
    setEditingRole({
      id: role.id,
      name: role.name || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      slug: role.slug || slugify(role.name || ''),
      status: role.status || 'Active',
    })
    onBackToList('edit')
  }

  const updateField = (field, value) => {
    setEditingRole((current) => {
      const next = { ...(current || emptyRole), [field]: value }
      if (field === 'name') {
        next.slug = slugify(value)
      }
      return next
    })
  }

  const togglePermission = (permission) => {
    setEditingRole((current) => {
      const role = current || emptyRole
      const currentPermissions = role.permissions || []
      const nextPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter((item) => item !== permission)
        : [...currentPermissions.filter((item) => item !== '*'), permission]

      return { ...role, permissions: nextPermissions }
    })
  }

  const setAllPermissions = (checked) => {
    setEditingRole((current) => ({
      ...(current || emptyRole),
      permissions: checked ? ['*'] : [],
    }))
  }

  const submitRole = async (event) => {
    event.preventDefault()
    await onSave({
      ...form,
      permissions: form.permissions?.includes('*') ? ['*'] : form.permissions,
    })
  }

  if (isForm) {
    const isSuperRole = form.permissions?.includes('*')

    return (
      <Panel
        action={<ActionButton onClick={() => { setEditingRole(null); onBackToList('list') }}>Back to roles</ActionButton>}
        subtitle="Create dynamic roles and assign exactly which admin modules and actions they can use."
        title={viewMode === 'edit' ? 'Edit Role Permissions' : 'Create Role'}
      >
        <form className="grid gap-5 p-5" onSubmit={submitRole}>
          <div className="grid gap-4 lg:grid-cols-4">
            <label className="block lg:col-span-2">
              <span className="text-sm font-bold text-slate-700">Role name</span>
              <input className="mt-1.5 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#67B529]" required value={form.name} onChange={(event) => updateField('name', event.target.value)} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Slug</span>
              <input className="mt-1.5 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold outline-none" readOnly value={form.slug} />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Status</span>
              <select className="mt-1.5 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-[#67B529]" value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
                <option>Blocked</option>
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-3 text-sm font-black text-slate-800">
              <input className="h-5 w-5 rounded border-slate-300 text-[#67B529] focus:ring-[#EEF9E8]0" checked={isSuperRole} onChange={(event) => setAllPermissions(event.target.checked)} type="checkbox" />
              Super admin access
            </label>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[minmax(180px,1.2fr)_repeat(7,minmax(86px,1fr))] bg-slate-100 text-xs font-black uppercase text-slate-500">
              <div className="border-b border-slate-200 px-3 py-3">Module</div>
              {roleActions.map(([, label]) => <div className="border-b border-slate-200 px-3 py-3 text-center" key={label}>{label}</div>)}
            </div>
            <div className="max-h-[54vh] overflow-auto bg-white">
              {permissionModules.map((module) => (
                <div className="grid grid-cols-[minmax(180px,1.2fr)_repeat(7,minmax(86px,1fr))] border-b border-slate-100" key={module.key}>
                  <div className="px-3 py-3">
                    <p className="text-sm font-black text-slate-900">{module.key}</p>
                    <p className="text-xs font-bold text-slate-400">{module.section}</p>
                  </div>
                  {roleActions.map(([action, label]) => {
                    const permission = `${module.key}.${action}`
                    return (
                      <label className="grid place-items-center px-3 py-3" key={permission} title={`${module.key} ${label}`}>
                        <input
                          className="h-5 w-5 rounded border-slate-300 text-[#67B529] focus:ring-[#EEF9E8]0 disabled:opacity-40"
                          checked={isSuperRole || form.permissions?.includes(permission)}
                          disabled={isSuperRole}
                          onChange={() => togglePermission(permission)}
                          type="checkbox"
                        />
                      </label>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <ActionButton onClick={() => { setEditingRole(null); onBackToList('list') }}>Cancel</ActionButton>
            <button className="rounded-lg border border-[#67B529] bg-[#67B529] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:border-[#5CA827] hover:bg-[#5CA827] disabled:opacity-60" disabled={isSaving} type="submit">
              {isSaving ? 'Saving...' : 'Save Role'}
            </button>
          </div>
        </form>
      </Panel>
    )
  }

  return (
    <Panel
      action={<ActionButton onClick={startCreate} tone="primary">Add New</ActionButton>}
    >
      <div className="flex flex-col gap-2 border-b border-slate-100 px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
        <input className="h-9 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs font-bold outline-none focus:border-[#67B529] lg:max-w-xs" onChange={(event) => setSearch(event.target.value)} placeholder="Search roles" value={search} />
      </div>
      <DataTable
        columns={[
          { key: 'name', label: 'Role' },
          { key: 'slug', label: 'Slug' },
          { key: 'permissions', label: 'Permissions', render: (role) => role.permissions?.includes('*') ? 'All permissions' : `${role.permissions?.length || 0} permissions` },
          { key: 'status', label: 'Status', render: (role) => <StatusBadge>{role.status}</StatusBadge> },
          {
            key: 'actions',
            label: 'Actions',
            render: (role) => (
              <div className="flex min-w-28 items-center justify-center gap-2">
                <ActionIconButton label="Edit" onClick={() => startEdit(role)}>
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </ActionIconButton>
                <ActionIconButton label="Delete" onClick={() => onDelete(role)} tone="danger">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6 18 20H6L5 6" />
                    <path d="M10 11v5M14 11v5" />
                  </svg>
                </ActionIconButton>
              </div>
            ),
          },
        ]}
        dense
        paginated
        rows={filteredRoles}
      />
      <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
        {allPermissionKeys.length} permission keys available across {permissionModules.length} modules.
      </div>
    </Panel>
  )
}

export default RolesPermissionsView
