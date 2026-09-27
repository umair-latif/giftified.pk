import Link from "next/link";
import { AppHeader } from "@/components/ui/app-header";

const items = [
  {
    href: "/design/mug",
    name: "Custom Mug",
    note: "11oz ceramic · full wrap",
    ready: true,
  },
  {
    href: null,
    name: "T-Shirt",
    note: "180–200 GSM combed cotton",
    ready: false,
  },
  { href: null, name: "Hoodie", note: "320+ GSM heavy fleece", ready: false },
] as const;

export default function Home() {
  return (
    <>
      <AppHeader title="Giftified.pk" />
      <main className="mx-auto max-w-md px-4 py-6">
        <p className="text-sm text-zinc-600">
          Design it on your phone. Cash on Delivery across Pakistan.
        </p>
        <ul className="mt-6 space-y-3">
          {items.map((item) => (
            <li key={item.name}>
              {item.href ? (
                <Link
                  href={item.href}
                  className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-sm active:bg-zinc-50"
                >
                  <span className="font-medium text-zinc-900">{item.name}</span>
                  <span className="block text-xs text-zinc-500">
                    {item.note}
                  </span>
                </Link>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-zinc-400">
                  <span className="font-medium">{item.name}</span>
                  <span className="block text-xs">
                    {item.note} · coming soon
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
