import type { PDFFont } from "pdf-lib";

/**
 * Text helpers for the proof. The PDF uses the standard Helvetica fonts
 * (WinAnsi encoding), so every string passes through `safeText` first.
 */

/**
 * Replaces characters Helvetica can't draw (e.g. Urdu, emoji) with "?",
 * instead of letting pdf-lib throw halfway through a proof.
 */
export function safeText(font: PDFFont, text: string): string {
  const supported = charSets.get(font) ?? new Set(font.getCharacterSet());
  charSets.set(font, supported);
  let out = "";
  for (const ch of text.normalize("NFC").replace(/[\r\t]/g, " ")) {
    const cp = ch.codePointAt(0)!;
    out += ch === "\n" || supported.has(cp) ? ch : "?";
  }
  return out;
}
const charSets = new WeakMap<PDFFont, Set<number>>();

/**
 * Vendor docs never carry customer phone numbers (CLAUDE.md rule 10).
 * Free-text fields (notes, placement) could contain one, so mask anything
 * that looks like a phone number: 9+ digits, optionally with +, spaces, dashes.
 */
const PHONE_LIKE = /\+?\d(?:[\s\-().]*\d){8,}/g;
export function redactPhones(text: string): string {
  return text.replace(PHONE_LIKE, "[number removed]");
}

/** Greedy word wrap to a width in points; honours explicit newlines. */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        line = next;
        continue;
      }
      if (line) lines.push(line);
      // A single word wider than the line: hard-break it.
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (
          cut > 1 &&
          font.widthOfTextAtSize(rest.slice(0, cut), size) > maxWidth
        )
          cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

/** "28 Sep 2026, 14:05 PKT" — the vendor is in Pakistan. */
export function formatPkDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")} ${get("month").slice(0, 3)} ${get("year")}, ${get("hour")}:${get("minute")} PKT`;
}

/** 216 → "216", 88.9 → "88.9", -3.25 → "-3.3" */
export function fmtMm(mm: number): string {
  const r = Math.round(mm * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}
