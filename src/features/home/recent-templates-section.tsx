import { Container } from "@/components/ui/page";
import { DesignTile } from "@/features/templates/components/design-tile";
import type { RecentTemplate } from "./recent-templates";

/**
 * "New designs": the newest published ones, as a marketplace shelf — a
 * banana-yellow band of its own with frameless tiles (a swipeable row on a
 * phone, a grid from `lg`). Renders nothing while there are none.
 */
export function RecentTemplatesSection({
  templates,
}: {
  templates: RecentTemplate[];
}) {
  if (templates.length === 0) return null;
  return (
    <section
      aria-labelledby="home-templates"
      className="bg-sunny border-ink mt-10 border-y-[3px] py-8"
      data-testid="home-designs"
    >
      <Container width="wide">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <h2 id="home-templates" className="text-ink text-2xl">
            New designs
          </h2>
          <span className="border-ink text-ink rounded-full border-2 bg-white px-2.5 py-0.5 text-xs font-semibold">
            100% customisable
          </span>
        </div>
        <p className="text-ink mt-1 text-sm">
          Ready to use. Swap in your own photos, names and words to make any
          design yours.
        </p>
        <ul className="-mx-4 mt-5 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pt-1 pb-2 lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
          {templates.map((t) => (
            <li
              key={t.id}
              className="w-[40%] shrink-0 snap-start sm:w-[28%] lg:w-auto"
            >
              <DesignTile
                variant="shelf"
                testId="home-template"
                href={t.href}
                name={t.name}
                subtitle={t.productName}
                image={t.image}
                {...(t.price ? { price: t.price } : {})}
              />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
