import { DesignShelf } from "@/features/templates/components/design-shelf";
import type { RecentTemplate } from "./recent-templates";

/**
 * "New designs": the newest published ones, as a marketplace shelf (the same
 * shelf as on the product pages). Renders nothing while there are none.
 */
export function RecentTemplatesSection({
  templates,
}: {
  templates: RecentTemplate[];
}) {
  if (templates.length === 0) return null;
  return (
    <DesignShelf
      headingId="home-templates"
      title="New designs"
      intro="Made by our designers. Swap in your own photos, names and words, and it's yours."
      testId="home-designs"
      tileTestId="home-template"
      className="mt-10"
      items={templates.map((t) => ({
        id: t.id,
        href: t.href,
        name: t.name,
        subtitle: t.productName,
        image: t.image,
        ...(t.price ? { price: t.price } : {}),
      }))}
    />
  );
}
