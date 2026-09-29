import Link from "next/link";
import { Container } from "@/components/ui/page";
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
            <li key={t.id} data-testid="home-template">
              <Link
                href={t.href}
                className="hover:bg-mint-100 active:bg-mint-100 focus-visible:ring-brand-600/20 block rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <span className="bg-mint-100 block aspect-square overflow-hidden rounded-xl">
                  {t.thumbnailUrl && (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived storage link, not a static asset
                    <img
                      src={t.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )}
                </span>
                <span className="font-display text-brand-900 mt-2 block text-sm leading-tight">
                  {t.name}
                </span>
                <span className="text-ink block text-xs">{t.productName}</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
