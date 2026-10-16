import { createHmac, timingSafeEqual } from "node:crypto";
import { getProduct } from "@/config/products";
import { formatCm } from "@/lib/units";
import type { Order, OrderLine } from "@/types/order";
import type { Vendor } from "./config";

/**
 * Vendor hand-off content (pure, unit-tested). After the founder sets an
 * order to Processing (= confirmed with the customer), the admin gets one
 * email with a block per vendor; each block can send that vendor its lines
 * by email (via a confirm page) or WhatsApp (a wa.me link with the text).
 *
 * Vendors never get the customer's name, phone, address or city: DesignBanana
 * ships the parcels, so the printer only needs the order number and what to
 * print.
 */

export interface VendorPart {
  vendor: Vendor;
  /** The order's lines this vendor prints, with their index on the order. */
  lines: { index: number; line: OrderLine }[];
}

/** Splits an order by vendor; lines no vendor prints are listed separately. */
export function splitByVendor(
  order: Order,
  vendors: Vendor[],
): { parts: VendorPart[]; unassigned: number[] } {
  const parts: VendorPart[] = [];
  const unassigned: number[] = [];
  order.lines.forEach((line, index) => {
    const vendor = vendors.find((v) => v.productIds.includes(line.productId));
    if (!vendor) return unassigned.push(index);
    const part = parts.find((p) => p.vendor.id === vendor.id);
    if (part) part.lines.push({ index, line });
    else parts.push({ vendor, lines: [{ index, line }] });
  });
  return { parts, unassigned };
}

/** "Custom Mug · Gloss White · 1 pc · print 22.8 × 9.5 cm" (+ size). */
export function lineSummary(line: OrderLine): string {
  const product = getProduct(line.productId);
  const colour =
    product?.baseColors.find((c) => c.id === line.colourId)?.name ??
    line.colourId;
  const print = product
    ? `print ${formatCm(product.printArea.widthMm)} × ${formatCm(product.printArea.heightMm)} cm`
    : null;
  return [
    product?.name ?? line.productId,
    colour,
    line.size ? `size ${line.size}` : null,
    `${line.quantity} ${line.quantity === 1 ? "pc" : "pcs"}`,
    print,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const vendorSubject = (order: Order, part: VendorPart) =>
  `DesignBanana order #${order.id}: ${part.lines
    .map(
      ({ line }) =>
        `${line.quantity} × ${getProduct(line.productId)?.name ?? line.productId}`,
    )
    .join(", ")}`;

/** The message for the vendor (email body and WhatsApp text). */
export function vendorMessage(
  order: Order,
  part: VendorPart,
  { filesAttached = false } = {},
): string {
  const items = part.lines.map(({ index, line }, i) => {
    const files = [
      line.printPngUrl
        ? `  Print file (PNG, 300 DPI): ${line.printPngUrl}`
        : "  Print file: not ready yet",
      line.proofPdfUrl ? `  Proof (PDF): ${line.proofPdfUrl}` : null,
    ].filter(Boolean);
    return [
      `${i + 1}. ${lineSummary(line)} (line ${index + 1})`,
      ...files,
    ].join("\n");
  });
  return [
    `Assalam o Alaikum ${part.vendor.name},`,
    "",
    `New DesignBanana order #${order.id} to print:`,
    "",
    ...items,
    "",
    filesAttached
      ? "The print files are attached (the links above are a backup, valid for 90 days)."
      : "Download the files from the links above (valid for 90 days).",
    "Please print exactly as in the proof and reply to confirm you received it. We collect the finished items as usual.",
    "",
    "Shukriya,",
    "DesignBanana",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

/** wa.me link: opens WhatsApp with the text, to the vendor if their number is known. */
export function whatsappUrl(text: string, digits?: string): string {
  return `https://wa.me/${digits ?? ""}?text=${encodeURIComponent(text)}`;
}

/** The admin's "Send to vendor" email. */
export function handoffEmail(
  order: Order,
  parts: VendorPart[],
  unassigned: number[],
  opts: {
    sendUrl: (vendorId: string) => string;
    /** Lines whose print file isn't ready (yet). */
    missingFiles: number[];
  },
): { subject: string; text: string; html: string } {
  const subject = `Send to vendor: order #${order.id}`;
  const warn = [
    opts.missingFiles.length
      ? `Print files are missing for line(s) ${opts.missingFiles.map((i) => i + 1).join(", ")}. Check the order notes, or run "pnpm order:files ${order.id}", before sending.`
      : null,
    unassigned.length
      ? `No vendor found for line(s) ${unassigned.map((i) => i + 1).join(", ")} (is the product published in WooCommerce?): send those yourself.`
      : null,
  ].filter((w): w is string => !!w);

  const blocks = parts.map((p) => {
    const msg = vendorMessage(order, p);
    return {
      name: p.vendor.name,
      lines: p.lines.map(({ line }) => lineSummary(line)),
      email: opts.sendUrl(p.vendor.id),
      whatsapp: whatsappUrl(msg, p.vendor.whatsapp),
      hasNumber: !!p.vendor.whatsapp,
      emailTo: p.vendor.email,
    };
  });

  const text = [
    `Order #${order.id} is confirmed (Processing). Send the print files to the vendor${parts.length > 1 ? "s" : ""}:`,
    `Customer: ${order.customer.fullName}, ${order.customer.city} (not shared with vendors).`,
    ...warn.map((w) => `! ${w}`),
    "",
    ...blocks.flatMap((b) => [
      `== ${b.name} ==`,
      ...b.lines.map((l) => `- ${l}`),
      b.emailTo
        ? `Email to ${b.emailTo}: ${b.email}`
        : `Email (no address saved — type one on the page): ${b.email}`,
      `WhatsApp${b.hasNumber ? "" : " (pick the contact)"}: ${b.whatsapp}`,
      "",
    ]),
  ].join("\n");

  const esc = (s: string) =>
    s.replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
    );
  const button = (href: string, label: string, bg: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:4px 8px 4px 0;padding:10px 16px;border-radius:10px;background:${bg};color:#fff;font-weight:600;text-decoration:none">${esc(label)}</a>`;
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#111">
<p>Order <strong>#${order.id}</strong> is confirmed (Processing). Send the print files to the vendor${parts.length > 1 ? "s" : ""}:</p>
<p style="color:#555">Customer: ${esc(order.customer.fullName)}, ${esc(order.customer.city)} (not shared with vendors).</p>
${warn.map((w) => `<p style="padding:8px 12px;border-radius:8px;background:#fff4d6">⚠️ ${esc(w)}</p>`).join("\n")}
${blocks
  .map(
    (
      b,
    ) => `<div style="margin:16px 0;padding:12px 16px;border:2px solid #111;border-radius:12px">
<h3 style="margin:0 0 6px">${esc(b.name)}</h3>
<ul style="margin:0 0 8px;padding-left:18px">${b.lines.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
${button(b.email, b.emailTo ? `Email to ${b.name}` : "Email (type the address)", "#0f766e")}
${b.emailTo ? "" : `<p style="color:#555;font-size:13px">No address saved for this vendor: the page asks for one. To save it, add <code>vendor_email</code> to the product's custom fields in WP admin.</p>`}
${button(b.whatsapp, b.hasNumber ? `WhatsApp to ${b.name}` : "WhatsApp (pick the contact)", "#16a34a")}
</div>`,
  )
  .join("\n")}
<p style="color:#555;font-size:13px">The email button opens a page where you check and press Send. WhatsApp sends links to the files (WhatsApp links can't attach files).</p>
</div>`;
  return { subject, text, html };
}

// ---- Send-page links: signed, so they can't be changed to another order/vendor.

export interface SendClaims {
  /** Order ID. */
  o: number;
  /** Vendor ID. */
  v: string;
  /** Expiry, seconds since epoch. */
  e: number;
}

export const SEND_LINK_TTL_S = 30 * 24 * 3600;

const sig = (payload: string, secret: string) =>
  createHmac("sha256", secret)
    .update(`vendor-send:${payload}`)
    .digest("base64url");

export function signSendToken(claims: SendClaims, secret: string): string {
  if (!secret) throw new Error("Vendor send secret is empty");
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${payload}.${sig(payload, secret)}`;
}

export function verifySendToken(
  token: string,
  secret: string,
  nowS = Date.now() / 1000,
): SendClaims | null {
  if (!secret) return null;
  const [payload, s, extra] = token.split(".");
  if (!payload || !s || extra !== undefined) return null;
  const expected = Buffer.from(sig(payload, secret));
  const given = Buffer.from(s);
  if (expected.length !== given.length || !timingSafeEqual(expected, given))
    return null;
  try {
    const c = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SendClaims>;
    if (
      typeof c.o !== "number" ||
      typeof c.v !== "string" ||
      typeof c.e !== "number"
    )
      return null;
    return c.e < nowS ? null : { o: c.o, v: c.v, e: c.e };
  } catch {
    return null;
  }
}
