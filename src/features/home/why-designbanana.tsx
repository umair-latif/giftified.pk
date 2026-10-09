import { Container } from "@/components/ui/page";

/**
 * Promises shown on the home page. Edit here only — keep every line true.
 */
export const WHY_DESIGNBANANA: readonly string[] = [
  "Cash on delivery everywhere in Pakistan",
  "We call you to confirm before anything is printed",
  "Printed in 1–3 days, then delivered in 5–7 more",
  "Sharp, clear prints, made from your original photos",
  "Printing fault or damaged on arrival? Tell us within 48 hours and we'll put it right",
];

export function WhyDesignBanana() {
  return (
    <section aria-labelledby="home-why" className="pt-10">
      <Container width="wide">
        <div className="card bg-mint-100! p-5">
          <h2 id="home-why" className="text-brand-900 text-2xl">
            Why DesignBanana
          </h2>
          <ul className="mt-3 space-y-2">
            {WHY_DESIGNBANANA.map((claim) => (
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
