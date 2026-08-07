import { useMemo } from "react";
import ServiceShowcaseSection from "./ServiceShowcaseSection";
import {
  selectSectionServices,
  serviceToCard,
} from "./serviceSectionUtils";

function MostBookedServices({
  content = {},
  services = [],
  onOpenServiceDetails,
  onShowServices,
}) {
  const items = useMemo(() => {
    return selectSectionServices({
      content,
      services,
    }).map(serviceToCard);
  }, [content, services]);

  if (items.length === 0) return null;

  const displayTitle =
    !content.title || content.title === "Services people book again and again"
      ? "Most booked services"
      : content.title;

  const displayDescription =
    !content.description ||
    content.description === "Trusted by thousands of patients for quality healthcare and expert medical consultation."
      ? "Trusted by thousands of customers for quality home services and expert professional care."
      : content.description;

  return (
    <section className="bg-white py-6">
      <div className="mx-auto max-w-7xl  ">
        <ServiceShowcaseSection
          eyebrow="Most Booked Services"
          title={displayTitle}
          description={displayDescription}
          items={items}
          onExplore={onShowServices}
          onItemSelect={onOpenServiceDetails}
          buttonText="View All"
        />
      </div>
    </section>
  );
}

export default MostBookedServices;