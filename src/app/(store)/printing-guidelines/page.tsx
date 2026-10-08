import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/features/info/info-page";

export const metadata: Metadata = {
  title: "Printing guidelines",
  description:
    "What DesignBanana will and won't print: our prohibited content policy for custom designs.",
};

/** Prohibited content policy (founder's text, 29 Sep 2026). Linked from the footer, terms and checkout. */
export default function PrintingGuidelinesPage() {
  return (
    <InfoPage
      title="Printing guidelines"
      intro="Custom prints and prohibited content policy."
    >

      <InfoSection id="policy" title="Our policy">
        <p>
          As a print-on-demand service operating under the laws of the Islamic
          Republic of Pakistan, we maintain a zero-tolerance policy for illegal,
          harmful, or infringing content. We reserve the absolute right to
          cancel or refuse to print any order that violates our community
          standards or national laws, and to refund any payment already made for
          it.
        </p>
      </InfoSection>

      <InfoSection
        id="refused"
        title="We strictly refuse to print content that contains"
      >
        <ul>
          <li>
            <strong>Religious &amp; faith-based violations:</strong> any
            material that mocks, desecrates, alters, or shows disrespect toward
            the figures, deities, sacred texts, beliefs, or holy symbols of any
            religion or faith. We also do not place sensitive religious symbols
            or sacred text on apparel or items worn or placed on the lower body
            (e.g. socks, shoes, leggings, floor mats), out of respect for
            religious sanctity.
          </li>
          <li>
            <strong>State &amp; political defamation:</strong> graphics, text,
            or slogans that defame, mock, or incite hostility against state
            institutions, the Judiciary, or the Pakistan Armed Forces.
          </li>
          <li>
            <strong>Hate speech &amp; sectarianism:</strong> slogans, imagery,
            or slurs targeting specific religious sects, faiths, ethnicities,
            genders, or minority groups.
          </li>
          <li>
            <strong>Obscenity &amp; profanity:</strong> explicit nudity,
            pornographic content, sexually suggestive art, or strong profanity
            in any language.
          </li>
          <li>
            <strong>Intellectual property infringement:</strong> unauthorised
            use of brand logos (e.g. Nike, Gucci), sports team crests (including
            PSL teams), copyrighted anime or film characters, or celebrity
            likenesses without explicit written permission.
          </li>
          <li>
            <strong>Harassment &amp; cyberstalking:</strong> photos or private
            information of real people uploaded without their consent, for the
            purpose of public shaming or defamation.
          </li>
        </ul>
      </InfoSection>

      <InfoSection id="review" title="How we check designs">
        <p>
          Every design is checked by our team before it is printed. If a design
          breaks these rules we cancel the order and tell you why. Designs
          refused for breaking the law may be kept, together with the order
          details, as explained in our{" "}
          <Link href="/privacy#compliance">Privacy notice</Link>.
        </p>
        <p>
          When you place an order you confirm that your design complies with
          Pakistani law, including the Prevention of Electronic Crimes Act
          (PECA), and that you have the right to print everything in it. See
          also our <Link href="/terms">Terms</Link>.
        </p>
      </InfoSection>

      <p className="text-xs text-zinc-600">Last updated: September 2026</p>
    </InfoPage>
  );
}
