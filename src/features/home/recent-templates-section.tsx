import { Container } from "@/components/ui/page";
import { DesignTile } from "@/features/templates/components/design-tile";
import type { RecentTemplate } from "./recent-templates";

/** "New templates": the newest published ones. Renders nothing while there are none. */
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
          New templates
        </h2>
        <p className="text-ink mt-1 text-sm">
          Start from a ready-made design and make it yours.
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
