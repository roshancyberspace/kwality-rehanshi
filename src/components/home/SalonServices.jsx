import ServiceShowcaseSection from './ServiceShowcaseSection'
import { selectSectionServices, serviceToCard } from './serviceSectionUtils'

function SalonServices({ content, onOpenServiceDetails, onShowServices, services }) {
  const items = selectSectionServices({
    categorySlugs: ['womens-salon-spa', 'mens-salon-massage', 'salon', 'spa', 'haircut', 'facial', 'waxing', 'threading', 'manicure', 'pedicure', 'd-tan', 'bleach', 'cleanup', 'massage'],
    content,
    excludeSlugs: ['ac-appliance', 'ac', 'cleaning', 'electrician', 'plumber', 'carpenter', 'painting'],
    fallbackKeywords: ['salon', 'haircut', 'facial', 'waxing', 'threading', 'd-tan', 'cleanup', 'manicure', 'pedicure', 'grooming', 'massage', 'spa', 'beard'],
    limit: 8,
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
