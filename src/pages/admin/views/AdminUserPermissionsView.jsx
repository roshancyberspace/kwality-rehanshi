import { ActionButton, Panel, StatusBadge } from '../../../components/admin/AdminUI'
import { normalizePermissions, permissionModules, roleActions } from '../utils/permissions'

const groupModulesBySection = () =>
  permissionModules.reduce((sections, module) => {
    sections[module.section] = [...(sections[module.section] || []), module]
    return sections
  }, {})

function AdminUserPermissionsView({ adminUser, onBack }) {
  const permissions = normalizePermissions(adminUser?.permissions)
  const isSuperAdmin = permissions.includes('*')
  const groupedModules = groupModulesBySection()
  const selectedCount = isSuperAdmin
    ? permissionModules.length * roleActions.length
    : permissions.length

  const hasPermission = (permission) => isSuperAdmin || permissions.includes(permission)

  return (
    <Panel
      action={<ActionButton onClick={onBack}>Back to Admin Users</ActionButton>}
      subtitle="Readonly permission access for this admin user, grouped section wise."
      title="Admin User Permissions"
    >
      <div className="grid gap-5 p-5">
        <section className="grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase text-blue-500">Permission profile</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-800">{adminUser?.name || 'Admin user'}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">{adminUser?.email || 'No email'} · {adminUser?.role_name || 'No role'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <StatusBadge>{adminUser?.status || 'Active'}</StatusBadge>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
              {isSuperAdmin ? 'All permissions' : `${selectedCount} permissions`}
            </span>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
            <input className="h-5 w-5 rounded border-slate-300 text-[#67B529]" checked={isSuperAdmin} readOnly type="checkbox" />
            Super admin access
          </label>
        </section>

        <div className="grid gap-5">
          {Object.entries(groupedModules).map(([section, modules]) => (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" key={section}>
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h3 className="text-base font-semibold text-slate-800">{section}</h3>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[820px]">
                  <div className="grid grid-cols-[minmax(190px,1.25fr)_repeat(7,minmax(82px,1fr))] border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                    <div className="px-3 py-3">Module</div>
                    {roleActions.map(([, label]) => (
                      <div className="px-3 py-3 text-center" key={label}>{label}</div>
                    ))}
                  </div>
                  {modules.map((module) => (
                    <div className="grid grid-cols-[minmax(190px,1.25fr)_repeat(7,minmax(82px,1fr))] border-b border-slate-100 last:border-b-0" key={module.key}>
                      <div className="px-3 py-3">
                        <p className="text-sm font-semibold text-slate-700">{module.key}</p>
                      </div>
                      {roleActions.map(([action, label]) => {
                        const permission = `${module.key}.${action}`

                        return (
                          <label className="grid place-items-center px-3 py-3" key={permission} title={`${module.key} ${label}`}>
                            <input
                              className="h-5 w-5 rounded border-slate-300 text-[#67B529] disabled:opacity-60"
                              checked={hasPermission(permission)}
                              disabled
                              readOnly
                              type="checkbox"
                            />
                          </label>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </Panel>
  )
}

export default AdminUserPermissionsView
