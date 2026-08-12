import { useEffect, useMemo, useRef, useState } from 'react'
import { Panel, StatusBadge } from '../../../components/admin/AdminUI'
import { normalizePermissions } from '../utils/permissions'
import { adminApi } from '../../../services/adminApi'
import { buildBackendUrl } from '../../../config/urls'

const profileTabs = [
  ['profile', 'Profile Information', 'M20 21a8 8 0 0 0-16 0M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z'],
  ['access', 'Access & Role', 'M16 11a4 4 0 1 0-8 0M4 21a8 8 0 0 1 16 0M19 8v4M21 10h-4'],
  ['security', 'Security', 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
  ['activity', 'Activity Log', 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2'],
]

const permissionSummary = [
  ['Manage all users and roles', ['*', 'Admin Users.edit', 'Roles.edit']],
  ['Manage platform settings', ['*', 'Settings.edit']],
  ['Access reports and analytics', ['*', 'Reports.view', 'Dashboard.view']],
  ['Full system access', ['*']],
]

const defaultAvatar = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=240&q=80'

const formatValue = (value, fallback = 'Not added') => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback
  if (value === 0) return '0'
  return value || fallback
}

const formatDate = (value) => {
  if (!value) return 'Not added'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const formatDateTime = (value) => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

const getAvatarUrl = (profile) => {
  const path = profile?.metadata?.avatar_url || profile?.metadata?.profile_picture || profile?.avatar_url || profile?.image
  if (!path) return ''
  if (String(path).startsWith('http') || String(path).startsWith('data:')) return path
  return buildBackendUrl(path)
}

const buildForm = (profile) => ({
  adminId: profile?.id || '',
  avatarUrl: getAvatarUrl(profile),
  bio: profile?.metadata?.bio || '',
  email: profile?.email || '',
  name: profile?.name || '',
  phone: profile?.metadata?.phone || profile?.phone || '',
  roleId: profile?.role_id || '',
  roleName: profile?.role_name || '',
  status: profile?.status || 'Active',
})

function Icon({ path }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.1" viewBox="0 0 24 24">
      <path d={path} />
    </svg>
  )
}

function CameraIcon() {
  return <Icon path="M4 8h4l2-3h4l2 3h4v11H4ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
}

function EyeIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function Field({ label, children }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-black text-slate-500">{label}</span>
      {children}
    </label>
  )
}

function Input({ className = '', ...props }) {
  return (
    <input
      className={`mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#67B529] focus:ring-4 focus:ring-[#EEF9E8] disabled:bg-slate-100 disabled:text-slate-500 ${className}`}
      {...props}
    />
  )
}

function Select({ children, ...props }) {
  return (
    <select
      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#67B529] focus:ring-4 focus:ring-[#EEF9E8]"
      {...props}
    >
      {children}
    </select>
  )
}

function Textarea({ ...props }) {
  return (
    <textarea
      className="mt-2 min-h-24 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-[#67B529] focus:ring-4 focus:ring-[#EEF9E8]"
      {...props}
    />
  )
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-900">{formatValue(value)}</p>
    </div>
  )
}

function Card({ children, subtitle, title }) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  )
}

function ProfilesView({
  adminProfile,
  isSaving,
  onChangePassword,
  onSaveProfile,
  passwordMessage,
  roles = [],
  saveMessage,
}) {
  const [activeTab, setActiveTab] = useState('profile')
  const [form, setForm] = useState(() => buildForm(adminProfile))
  const [avatarPreview, setAvatarPreview] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' })
  const [passwordVisible, setPasswordVisible] = useState({ confirm: false, password: false })
  const [passwordError, setPasswordError] = useState('')
  const fileInputRef = useRef(null)

  useEffect(() => {
    const nextForm = buildForm(adminProfile)
    setForm(nextForm)
    setAvatarPreview(nextForm.avatarUrl)
  }, [adminProfile])

  const roleOptions = useMemo(() => {
    const seen = new Set()
    return roles
      .map((role) => ({ id: role.id, name: role.name || role.role_name || '' }))
      .filter((role) => {
        const key = `${role.id || ''}-${role.name}`
        if (!role.name || seen.has(key)) return false
        seen.add(key)
        return true
      })
  }, [roles])

  const permissions = useMemo(() => normalizePermissions(adminProfile?.permissions), [adminProfile])
  const isSuperAdmin = permissions.includes('*') || String(form.roleName || '').toLowerCase() === 'super admin'

  if (!adminProfile) {
    return (
      <Panel>
        <div className="p-5 text-sm font-bold text-slate-500">Your profile is loading.</div>
      </Panel>
    )
  }

  const visibleAvatar = avatarPreview || defaultAvatar
  const initials = (form.name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  const bioLength = form.bio.length
  const selectedRole = roleOptions.find((role) => String(role.id) === String(form.roleId))
  const lastLogin = adminProfile.metadata?.last_login_at || adminProfile.metadata?.last_login || adminProfile.updated_at

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleRoleChange = (roleId) => {
    const role = roleOptions.find((item) => String(item.id) === String(roleId))
    setForm((current) => ({
      ...current,
      roleId,
      roleName: role?.name || current.roleName,
    }))
  }

  const resetForm = () => {
    const nextForm = buildForm(adminProfile)
    setForm(nextForm)
    setAvatarPreview(nextForm.avatarUrl)
    setPasswordForm({ password: '', password_confirmation: '' })
    setPasswordError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleAvatarFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    setAvatarPreview(preview)
    setIsUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await adminApi.uploadMedia(formData)
      const uploadedUrl = res?.url || res?.path || ''
      if (uploadedUrl) {
        setAvatarPreview(uploadedUrl)
        updateField('avatarUrl', uploadedUrl)
      } else {
        throw new Error('Server did not return a file URL.')
      }
    } catch (err) {
      console.error('Avatar upload error:', err)
      alert(`Image upload failed: ${err.message || 'Error communicating with server'}`)
      setAvatarPreview(form.avatarUrl || defaultAvatar)
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const submitProfile = (event) => {
    event.preventDefault()
    const payload = {
      email: form.email.trim(),
      metadata: {
        ...(adminProfile.metadata || {}),
        avatar_url: form.avatarUrl.trim(),
        bio: form.bio.trim(),
        phone: form.phone.trim(),
      },
      name: form.name.trim(),
      role_id: form.roleId || null,
      role_name: form.roleName || selectedRole?.name || '',
      status: form.status,
    }
    onSaveProfile('/admin-users', adminProfile.id, payload)
  }

  const submitPassword = (event) => {
    event.preventDefault()
    setPasswordError('')

    if (!passwordForm.password && !passwordForm.password_confirmation) {
      setPasswordError('Enter a new password first.')
      return
    }

    if (passwordForm.password.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }

    if (passwordForm.password !== passwordForm.password_confirmation) {
      setPasswordError('New password and confirmation do not match.')
      return
    }

    onChangePassword(adminProfile.id, passwordForm)
    setPasswordForm({ password: '', password_confirmation: '' })
  }

  const renderProfileTab = () => (
    <>
      <Card subtitle="Update your personal information and profile details." title="Profile Information">
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="Full Name">
            <Input onChange={(event) => updateField('name', event.target.value)} required value={form.name} />
          </Field>
          <Field label="Email Address">
            <Input onChange={(event) => updateField('email', event.target.value)} required type="email" value={form.email} />
          </Field>
          <Field label="Phone Number">
            <Input onChange={(event) => updateField('phone', event.target.value)} placeholder="+91 98765 43210" value={form.phone} />
          </Field>
          <Field label="Avatar URL (Optional)">
            <Input onChange={(event) => {
              updateField('avatarUrl', event.target.value)
              setAvatarPreview(event.target.value)
            }} placeholder="https://..." value={form.avatarUrl} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Bio (Optional)">
              <Textarea
                maxLength={250}
                onChange={(event) => updateField('bio', event.target.value)}
                value={form.bio}
              />
            </Field>
            <p className="mt-1 text-right text-xs font-bold text-slate-500">{bioLength}/250</p>
          </div>
        </div>
      </Card>

     
    </>
  )

  const renderAccessTab = () => (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      {renderAccessCard()}
      {renderPermissionsCard()}
    </div>
  )

  const renderSecurityTab = () => (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {renderSecurityCard()}
      <Card subtitle="Review account identity before changing credentials." title="Security Summary">
        <div className="grid gap-3 p-5">
          <SummaryTile label="Email" value={form.email} />
          <SummaryTile label="Admin ID" value={form.adminId} />
          <SummaryTile label="Last Login" value={formatDateTime(lastLogin)} />
        </div>
      </Card>
    </div>
  )

  const renderActivityTab = () => (
    <Card subtitle="Recent account events for this admin profile." title="Activity Log">
      <div className="grid gap-3 p-5">
        {[
          ['Profile available', `${form.name} is loaded in the admin panel.`],
          ['Last profile update', formatDateTime(adminProfile.updated_at)],
          ['Account created', formatDateTime(adminProfile.created_at)],
          ['Last login', formatDateTime(lastLogin)],
        ].map(([title, detail]) => (
          <div className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3" key={title}>
            <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#67B529]" />
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900">{title}</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-500">{detail}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )

  function renderAccessCard() {
    return (
      <Card subtitle="Manage role and access permissions." title="Access & Role">
        <div className="grid gap-5 p-5">
          <Field label="Role">
            <Select onChange={(event) => handleRoleChange(event.target.value)} value={form.roleId || ''}>
              <option value="">Select role</option>
              {roleOptions.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Role ID">
            <Input disabled value={form.roleId || 'Not assigned'} />
          </Field>
          <Field label="Admin ID">
            <Input disabled value={form.adminId || 'Not assigned'} />
          </Field>
        </div>
      </Card>
    )
  }

  function renderPermissionsCard() {
    return (
      <Card subtitle="View a summary of key permissions for this role." title="Quick Permissions Summary">
        <div className="grid gap-3 p-5">
          {permissionSummary.map(([label, keys]) => {
            const enabled = isSuperAdmin || keys.some((key) => permissions.includes(key))
            return (
              <div className="flex items-center gap-3" key={label}>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${enabled ? 'bg-[#67B529] text-white' : 'bg-slate-200 text-slate-500'}`}>
                  <CheckIcon />
                </span>
                <span className="text-sm font-bold text-slate-700">{label}</span>
              </div>
            )
          })}
        </div>
      </Card>
    )
  }

  function renderSecurityCard() {
    return (
      <Card subtitle="Update your password to keep your account secure." title="Security">
     <div className="space-y-5 p-5">
  <Field label="New Password">
    <div className="relative">
      <Input
        className="pr-10"
        minLength={8}
        value={passwordForm.password}
        onChange={(event) =>
          setPasswordForm((current) => ({
            ...current,
            password: event.target.value,
          }))
        }
        type={passwordVisible.password ? "text" : "password"}
      />

      <button
        type="button"
        aria-label="Toggle new password visibility"
        onClick={() =>
          setPasswordVisible((current) => ({
            ...current,
            password: !current.password,
          }))
        }
        className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <EyeIcon />
      </button>
    </div>
  </Field>

  <Field label="Confirm New Password">
    <div className="relative">
      <Input
        className="pr-10"
        minLength={8}
        value={passwordForm.password_confirmation}
        onChange={(event) =>
          setPasswordForm((current) => ({
            ...current,
            password_confirmation: event.target.value,
          }))
        }
        type={passwordVisible.confirm ? "text" : "password"}
      />

      <button
        type="button"
        aria-label="Toggle confirm password visibility"
        onClick={() =>
          setPasswordVisible((current) => ({
            ...current,
            confirm: !current.confirm,
          }))
        }
        className="absolute right-3 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        <EyeIcon />
      </button>
    </div>
  </Field>

  {/* Message */}
  <p
    className={`text-sm leading-5 ${
      passwordError
        ? "font-semibold text-rose-600"
        : "text-slate-500"
    }`}
  >
    {passwordError ||
      passwordMessage ||
      "Password must be at least 8 characters."}
  </p>

  {/* Button */}
  <div className="flex justify-end">
    <button
      type="button"
      disabled={isSaving}
      onClick={submitPassword}
      className="h-10 rounded-lg bg-slate-950 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isSaving ? "Updating..." : "Update Password"}
    </button>
  </div>
</div>
      </Card>
    )
  }

  function renderStatusCard() {
    return (
      <Card subtitle="Manage your account status and preferences." title="Account Status">
        <div className="grid gap-4 p-5">
          <Field label="Status">
            <Select onChange={(event) => updateField('status', event.target.value)} value={form.status}>
              {['Active', 'Inactive', 'Pending', 'Blocked'].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </Field>
          <p className="text-sm font-bold text-slate-500">Inactive accounts cannot access the system.</p>
        </div>
      </Card>
    )
  }

  return (
    <form className="grid w-full gap-4" onSubmit={submitProfile}>
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(520px,0.9fr)] lg:items-center">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
              {visibleAvatar ? (
                <img alt={form.name} className="h-full w-full object-cover" src={visibleAvatar} />
              ) : (
                <span className="grid h-full w-full place-items-center bg-[#D9F3C8] text-2xl font-black text-[#67B529]">{initials}</span>
              )}
              <button
                aria-label="Upload avatar"
                className="absolute bottom-1 right-1 grid h-8 w-8 place-items-center rounded-lg border-2 border-white bg-slate-950 text-white shadow-sm transition hover:bg-[#67B529]"
                onClick={() => fileInputRef.current?.click()}
                title="Upload avatar"
                type="button"
              >
                <CameraIcon />
              </button>
              {isUploadingAvatar && (
                <div className="absolute inset-0 grid place-items-center rounded-full bg-black/60 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-xs">
                  Uploading...
                </div>
              )}
              <input accept="image/*" className="hidden" onChange={handleAvatarFileChange} ref={fileInputRef} type="file" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="break-words text-2xl font-black text-slate-900">{formatValue(form.name, 'Admin User')}</h2>
                <StatusBadge>{form.status}</StatusBadge>
              </div>
              <p className="mt-2 break-words text-sm font-bold text-slate-500">{formatValue(form.email)}</p>
              <p className="mt-2 text-sm font-semibold text-slate-500">Last login: {formatDateTime(lastLogin)}</p>
              <span className="mt-3 inline-flex h-7 items-center rounded-full bg-[#EEF9E8] px-3 text-xs font-black text-[#67B529] ring-1 ring-[#67B529]/20">
                {formatValue(form.roleName || selectedRole?.name, 'No role')}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile label="Role" value={form.roleName || selectedRole?.name} />
            <SummaryTile label="Account Status" value={form.status} />
            <SummaryTile label="Joined" value={formatDate(adminProfile.created_at)} />
            <SummaryTile label="Admin ID" value={form.adminId} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-3 pt-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
          <div className="flex min-w-0 gap-1 overflow-x-auto">
            {profileTabs.map(([id, label, path]) => (
              <button
                className={`flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-black transition ${
                  activeTab === id
                    ? 'border-[#67B529] text-[#67B529]'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
                }`}
                key={id}
                onClick={() => setActiveTab(id)}
                type="button"
              >
                <Icon path={path} />
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pb-3 lg:pb-0">
            <button
              className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-slate-900 hover:text-slate-900"
              onClick={resetForm}
              type="button"
            >
              Cancel
            </button>
            <button
              className="h-10 rounded-lg border border-[#67B529] bg-[#67B529] px-4 text-sm font-black text-white shadow-sm transition hover:border-[#5CA827] hover:bg-[#5CA827] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving || isUploadingAvatar || !form.name.trim() || !form.email.trim()}
              type="submit"
            >
              {isSaving ? 'Saving...' : isUploadingAvatar ? 'Uploading...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </section>

      {saveMessage && <p className="rounded-lg border border-[#67B529]/20 bg-[#EEF9E8] px-4 py-3 text-sm font-black text-[#67B529]">{saveMessage}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.75fr)]">
        <div className="grid gap-4">
          {activeTab === 'profile' && renderProfileTab()}
          {activeTab === 'access' && renderAccessTab()}
          {activeTab === 'security' && renderSecurityTab()}
          {activeTab === 'activity' && renderActivityTab()}
        </div>
        {activeTab === 'profile' && (
          <aside className="grid content-start gap-4">
            {renderSecurityCard()}
          
          </aside>
        )}
      </div>
    </form>
  )
}

export default ProfilesView
