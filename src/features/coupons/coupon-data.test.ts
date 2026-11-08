import { describe, expect, it } from "vitest";
import { coupons } from "@/data/coupons";

const isNonNegativeInt = (value: number) => Number.isInteger(value) && value >= 0;
const isPositiveInt = (value: number) => Number.isInteger(value) && value > 0;

describe("dữ liệu mã giảm giá", () => {
  it("có đúng 3 mã ban đầu", () => {
    expect(coupons.map((coupon) => coupon.code).sort()).toEqual([
      "GIAM50K",
      "SHOPLITE10",
      "TET2026",
    ]);
  });

  it("mã là duy nhất", () => {
    const codes = coupons.map((coupon) => coupon.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it.each(coupons)("mã $code đúng định dạng và ràng buộc", (coupon) => {
    expect(coupon.code).toMatch(/^[A-Z0-9]{3,32}$/);
    if (coupon.type === "percent") {
      expect(Number.isInteger(coupon.percent)).toBe(true);
      expect(coupon.percent).toBeGreaterThanOrEqual(1);
      expect(coupon.percent).toBeLessThanOrEqual(100);
      expect(isPositiveInt(coupon.maxDiscount)).toBe(true);
    } else {
      expect(isPositiveInt(coupon.amount)).toBe(true);
    }
    if (coupon.minSubtotal !== undefined) {
      expect(isNonNegativeInt(coupon.minSubtotal)).toBe(true);
    }
    if (coupon.expiresOn !== undefined) {
      expect(coupon.expiresOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(coupon.expiresOn))).toBe(false);
    }
  });

  it("giá trị các mã khớp FR-019", () => {
    expect(coupons).toEqual(
      expect.arrayContaining([
        {
          code: "SHOPLITE10",
          type: "percent",
          percent: 10,
          maxDiscount: 100_000,
          minSubtotal: 300_000,
        },
        {
          code: "GIAM50K",
          type: "fixed",
          amount: 50_000,
          minSubtotal: 500_000,
        },
        {
          code: "TET2026",
          type: "percent",
          percent: 15,
          maxDiscount: 200_000,
          expiresOn: "2026-02-28",
        },
      ]),
    );
  });
});
