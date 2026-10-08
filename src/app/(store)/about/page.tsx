import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "@/features/info/info-page";
import { PRINT_DPI } from "@/lib/units";

export const metadata: Metadata = {
  title: "About us",
  description:
    "DesignBanana lets you design custom mugs, t-shirts and hoodies online, printed by partners in Gujrat and Sialkot and paid for with Cash on Delivery.",
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About DesignBanana"
      intro="Your photo, your words — on a mug, tee or hoodie. Designed by you, paid for in cash on delivery."
    >
      <InfoSection title="Our story">
        <p>
          DesignBanana started from a simple frustration: ordering a
          personalised gift in Pakistan usually meant sending a photo to someone
          on WhatsApp and hoping the result looked like what you had in mind.
        </p>
        <p>
          We wanted personalised gifts in Pakistan to be simple: design
          something yourself in a few minutes, see how it will look, and pay
          only when it reaches your door.
        </p>
      </InfoSection>

      <InfoSection title="Made in Gujrat and Sialkot">
        <p>
          We don&rsquo;t keep a warehouse full of stock. Every item is printed
          to order by our partner workshops in the Gujrat and Sialkot industrial
          belt, which has long experience in printing and textiles.
        </p>
        <p>
          For each order we prepare a {PRINT_DPI} DPI print file from your
          design and a production sheet with the exact size and position of your
          print, so what you designed is what gets printed.
        </p>
        <p>
          Our partners only receive what they need to print: your design, the
          product details and your city. They don&rsquo;t get your phone number
          or address from us.
        </p>
      </InfoSection>

      <InfoSection title="How we work">
        <ul>
          <li>
            <strong>Cash on Delivery.</strong> No online payment; you pay the
            rider when the parcel arrives.
          </li>
          <li>
            <strong>We confirm every order.</strong> We call or message you to
            check your address and product before anything is printed.
          </li>
          <li>
            <strong>Quality checks while you design.</strong> The editor warns
            you if a photo is too small to print sharply.
          </li>
        </ul>
      </InfoSection>

      <p className="text-sm">
        Ready to make something?{" "}
        <Link href="/products" className="text-brand-700 underline">
          See our products
        </Link>{" "}
        or{" "}
        <Link href="/contact" className="text-brand-700 underline">
          get in touch
        </Link>
        .
      </p>
    </InfoPage>
  );
}
