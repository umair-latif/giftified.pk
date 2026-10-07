import { Container } from "@/components/ui/page";
import { DesignTile } from "@/features/templates/components/design-tile";
import type { RecentTemplate } from "./recent-templates";

/** "New designs": the newest published ones. Renders nothing while there are none. */
export function RecentTemplatesSection({
  templates,
}: {
  templates: RecentTemplate[];
}) {
  if (templates.length === 0) return null;
  return (
    <section aria-labelledby="home-templates" className="pt-10">
      <Container width="wide">
        <h2 id="home-templates" className="text-brand-900 text-2xl">
          New designs
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-700">
          <span className="bg-sunny border-ink text-ink rounded-full border-2 px-2.5 py-0.5 text-xs font-semibold">
            100% customisable
          </span>
          Swap in your own photos, names and words to make any design yours.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {templates.map((t) => (
            <li key={t.id}>
              <DesignTile
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
