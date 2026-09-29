import { Container } from "@/components/ui/page";

/**
 * Promises shown on the home page. Edit here only — keep every line true.
 * TODO(founder): add "Delivery in N working days" once the courier times are known.
 */
export const WHY_GIFTIFIED: readonly string[] = [
  "Cash on delivery everywhere in Pakistan",
  "We call to confirm before printing",
  "300 DPI print quality",
  "Free reprint if it arrives damaged",
];

export function WhyGiftified() {
  return (
    <section aria-labelledby="home-why" className="pt-10">
      <Container width="wide">
        <div className="bg-brand-50 rounded-2xl p-5">
          <h2 id="home-why" className="text-brand-900 text-2xl">
            Why Giftified
          </h2>
          <ul className="mt-3 space-y-2">
            {WHY_GIFTIFIED.map((claim) => (
              <li key={claim} className="text-ink flex items-start gap-2">
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="text-brand-600 mt-0.5 shrink-0"
                >
                  <path d="M5 12l5 5L20 7" />
                </svg>
                {claim}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
