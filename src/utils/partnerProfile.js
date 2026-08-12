import { buildBackendUrl } from '../config/urls'

const isProfilePhotoLabel = (label = '') => {
  const value = String(label || '').trim().toLowerCase()
  return value === 'profile photo' || value.includes('profile photo') || value === 'profile'
}

export const resolvePartnerProfilePicturePath = (partner) => {
  if (!partner) return ''

  const fromMeta = partner.profile_picture
    || partner.metadata?.profile_picture
    || partner.metadata?.avatar_url
    || partner.avatar_url
    || ''

  if (fromMeta) return String(fromMeta)

  const documents = Array.isArray(partner.documents) ? partner.documents : []
  const profileDoc = documents.find((document) => document?.path && isProfilePhotoLabel(document.label || document.name))

  return profileDoc?.path || ''
}

export const resolvePartnerProfilePictureUrl = (partner) => {
  return buildBackendUrl(resolvePartnerProfilePicturePath(partner))
}
