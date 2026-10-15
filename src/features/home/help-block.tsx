import { WhatsappHelp } from "@/components/site/whatsapp-help";
import { Container } from "@/components/ui/page";
import { SITE } from "@/config/site";

/** "Questions?" on the home page: the WhatsApp number as text and the chat button. */
export function HelpBlock() {
  return (
    <section aria-labelledby="home-help" className="pt-10">
      <Container width="wide">
        <div className="card p-5">
          <h2 id="home-help" className="type-section text-deep">
            Questions? Ask us
          </h2>
          <p className="text-ink mt-1 text-sm">
            We&apos;re on WhatsApp {SITE.hours}.
          </p>
          <WhatsappHelp
            className="mt-4"
            message="Assalam o Alaikum! I have a question."
          />
        </div>
      </Container>
    </section>
  );
}
