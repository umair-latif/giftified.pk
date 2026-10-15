import { describe, expect, it } from "vitest";
import { featuredOccasion } from "@/config/occasion-dates";

const on = (iso: string) => featuredOccasion(new Date(`${iso}T09:00:00Z`));
const ymd = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

describe("featured occasion", () => {
  it("falls back to Birthday when nothing dated is near", () => {
    expect(on("2026-10-16")).toEqual({
      slug: "birthday",
      date: null,
      orderBy: null,
    });
  });

  it("features a dated occasion within 60 days, with an order-by date", () => {
    const eid = on("2027-02-01");
    expect(eid.slug).toBe("eid");
    expect(ymd(eid.date)).toBe("2027-03-10");
    expect(ymd(eid.orderBy)).toBe("2027-02-28");
    const aug = on("2027-07-20");
    expect([aug.slug, ymd(aug.orderBy)]).toEqual(["14-august", "2027-08-04"]);
  });

  it("knows Mother's Day is the 2nd Sunday of May", () => {
    // 2027: May 1 is a Saturday → 2nd Sunday is May 9; Eid ul-Adha (17 May) comes after.
    const m = on("2027-04-15");
    expect([m.slug, ymd(m.date)]).toEqual(["mothers-day", "2027-05-09"]);
  });

  it("skips an occasion once its order-by date has passed", () => {
    // 14 Aug order-by is 4 Aug; on 5 Aug nothing dated is near.
    expect(on("2027-08-05").slug).toBe("birthday");
  });
});
