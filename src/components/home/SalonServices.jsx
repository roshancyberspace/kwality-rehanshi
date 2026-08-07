import ServiceShowcaseSection from './ServiceShowcaseSection'
import { selectSectionServices, serviceToCard } from './serviceSectionUtils'

function SalonServices({ content, onOpenServiceDetails, onShowServices, services }) {
  const items = selectSectionServices({
    content,
    fallbackKeywords: ['salon', 'hair', 'beard', 'spa', 'facial'],
    limit: 4,
    services,
  }).map(serviceToCard)

  if (!items?.length) return null

  return (
    <ServiceShowcaseSection
      eyebrow="Salon services"
      items={items}
      onExplore={onShowServices}
      onItemSelect={onOpenServiceDetails}
      title={content?.title || 'Salon care at your doorstep'}
    />
  )
}

export default SalonServices
