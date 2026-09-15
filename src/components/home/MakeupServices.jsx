import ServiceShowcaseSection from './ServiceShowcaseSection'
import { selectSectionServices, serviceToCard } from './serviceSectionUtils'

function MakeupServices({ content, onOpenServiceDetails, onShowServices, services }) {
  const items = selectSectionServices({
    categorySlugs: ['makeup', 'bridal', 'beauty', 'styling', 'womens-salon-spa'],
    content,
    excludeSlugs: ['ac-appliance', 'ac', 'cleaning', 'electrician', 'plumber', 'carpenter', 'painting'],
    fallbackKeywords: ['makeup', 'bridal', 'hairstyling', 'party makeup', 'saree draping', 'beauty', 'facial', 'styling'],
    limit: 8,
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
