import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection, Todo } from "@/features/info/info-page";
import { PRINT_DPI } from "@/lib/units";

export const metadata: Metadata = {
  title: "About us",
  description:
    "Giftified.pk lets you design custom mugs, t-shirts and hoodies on your phone, printed by partners in Gujrat and Sialkot and paid for with Cash on Delivery.",
};

export default function AboutPage() {
  return (
    <InfoPage
      title="About Giftified.pk"
      intro="Your photo, your words — on a mug, tee or hoodie. Designed on your phone, paid for in cash on delivery."
    >
      <InfoSection title="Our story">
        <p>
          <Todo>
            TODO(founder): the short story &ndash; who started Giftified.pk,
            when, and why (2&ndash;4 sentences)
          </Todo>
        </p>
        <p>
          We wanted personalised gifts in Pakistan to be simple: design
          something on your phone in a few minutes, see how it will look, and
          pay only when it reaches your door.
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

      <InfoSection title="What we care about">
        <p>
          <Todo>
            TODO(founder): brand values from the brand sheet (they are not in
            docs/brand.md yet) &ndash; list them here with one line each
          </Todo>
        </p>
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
