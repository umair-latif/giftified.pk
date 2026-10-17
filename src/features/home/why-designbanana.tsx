import { Container } from "@/components/ui/page";
import { DELIVERY_DAYS } from "@/lib/delivery";

/**
 * Promises shown on the home page. Edit here only — keep every line true.
 */
export const WHY_DESIGNBANANA: readonly string[] = [
  "Design it yourself in minutes, right from your phone, with no design skills needed",
  "See an instant preview of your design on the product, from every side",
  "Or start from a ready-made design and make it yours",
  "Sharp, clear prints, made from your original photos",
  "Cash on delivery everywhere in Pakistan",
  "We contact you to confirm before anything is printed",
  `At your door in ${DELIVERY_DAYS.min}–${DELIVERY_DAYS.max} days`,
  "Printing fault or damaged on arrival? Tell us within 48 hours and we’ll put it right",
];

export function WhyDesignBanana() {
  return (
    <section aria-labelledby="home-why" className="pt-10">
      <Container width="wide">
        <div className="on-dark border-ink bg-deep rounded-2xl border-[3px] p-5">
          <h2 id="home-why" className="type-section text-on-deep">
            Why DesignBanana
          </h2>
          <ul className="mt-3 space-y-2">
            {WHY_DESIGNBANANA.map((claim) => (
              <li key={claim} className="text-on-deep flex items-start gap-2">
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
                  className="text-on-deep-muted mt-0.5 shrink-0"
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
