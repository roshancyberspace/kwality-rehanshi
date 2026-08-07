import ServiceShowcaseSection from './ServiceShowcaseSection'
import { selectSectionServices, serviceToCard } from './serviceSectionUtils'

function MakeupServices({ content, onOpenServiceDetails, onShowServices, services }) {
  const items = selectSectionServices({
    content,
    fallbackKeywords: ['makeup', 'bridal', 'beauty', 'facial', 'spa'],
    limit: 4,
    services,
  }).map(serviceToCard)

  if (!items?.length) return null

  return (
    <ServiceShowcaseSection
      eyebrow="Makeup services"
      items={items}
      onExplore={onShowServices}
      onItemSelect={onOpenServiceDetails}
      title={content?.title || 'Makeup and styling for every occasion'}
    />
  )
}

export default MakeupServices
