import { describe, expect, it } from "vitest";
import {
  calculateDiscount,
  checkCoupon,
  checkCouponEligibility,
  findCoupon,
  isCouponExpired,
  normalizeCouponCode,
} from "./coupon-service";
import type { Coupon } from "./types";

const SHOPLITE10: Coupon = {
  code: "SHOPLITE10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};
const GIAM50K: Coupon = {
  code: "GIAM50K",
  type: "fixed",
  amount: 50_000,
  minSubtotal: 500_000,
};

const NOW = new Date("2026-11-08T10:00:00+07:00");

describe("normalizeCouponCode", () => {
  it("bỏ khoảng trắng đầu/cuối và viết hoa", () => {
    expect(normalizeCouponCode(" shoplite10 ")).toBe("SHOPLITE10");
  });
});

describe("findCoupon", () => {
  it("tìm thấy mã không phân biệt hoa thường", () => {
    expect(findCoupon("giam50k")?.code).toBe("GIAM50K");
  });

  it("trả về undefined khi mã không tồn tại", () => {
    expect(findCoupon("KHONGCO")).toBeUndefined();
  });
});

describe("isCouponExpired", () => {
  it("chưa hết hạn ở giây cuối cùng của ngày hết hạn (giờ Việt Nam)", () => {
    expect(isCouponExpired("2026-02-28", new Date("2026-02-28T23:59:59.999+07:00"))).toBe(false);
  });

  it("hết hạn từ 00:00 ngày hôm sau (giờ Việt Nam)", () => {
    expect(isCouponExpired("2026-02-28", new Date("2026-03-01T00:00:00+07:00"))).toBe(true);
  });

  it("không có ngày hết hạn thì không bao giờ hết hạn", () => {
    expect(isCouponExpired(undefined, new Date("2100-01-01T00:00:00+07:00"))).toBe(false);
  });
});

describe("calculateDiscount", () => {
  it.each([
    [300_000, 30_000],
    [999_999, 99_999],
    [1_000_000, 100_000],
    [1_000_001, 100_000],
    [2_000_000, 100_000],
  ])("SHOPLITE10 với tạm tính %i giảm %i", (subtotal, expected) => {
    expect(calculateDiscount(SHOPLITE10, subtotal)).toBe(expected);
  });

  it("GIAM50K giảm đúng 50.000đ", () => {
    expect(calculateDiscount(GIAM50K, 600_000)).toBe(50_000);
  });

  it("số tiền giảm cố định không vượt quá tạm tính", () => {
    expect(calculateDiscount(GIAM50K, 30_000)).toBe(30_000);
  });

  it("luôn trả về số nguyên đồng", () => {
    expect(Number.isInteger(calculateDiscount(SHOPLITE10, 333_333))).toBe(true);
    expect(calculateDiscount(SHOPLITE10, 333_333)).toBe(33_333);
  });
});

describe("checkCoupon", () => {
  it("trả về NOT_FOUND khi mã không tồn tại", () => {
    expect(checkCoupon("KHONGCO", 1_000_000, NOW)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("trả về EXPIRED kèm ngày hết hạn, kiểm tra hạn trước tối thiểu", () => {
    expect(checkCoupon("tet2026", 1_000_000, NOW)).toEqual({
      ok: false,
      reason: "EXPIRED",
      expiresOn: "2026-02-28",
    });
  });

  it.each([
    ["GIAM50K", 499_999],
    ["SHOPLITE10", 299_999],
  ])("%s với tạm tính %i thiếu đúng 1đ", (code, subtotal) => {
    expect(checkCoupon(code, subtotal, NOW)).toMatchObject({
      ok: false,
      reason: "MIN_SUBTOTAL_NOT_MET",
      shortfall: 1,
    });
  });

  it("trả về minSubtotal khi chưa đạt tối thiểu", () => {
    expect(checkCoupon("GIAM50K", 450_000, NOW)).toEqual({
      ok: false,
      reason: "MIN_SUBTOTAL_NOT_MET",
      minSubtotal: 500_000,
      shortfall: 50_000,
    });
  });

  it.each([
    ["SHOPLITE10", 300_000, 30_000],
    ["GIAM50K", 500_000, 50_000],
  ])("%s hợp lệ khi tạm tính đúng bằng tối thiểu %i", (code, subtotal, discount) => {
    const result = checkCoupon(code, subtotal, NOW);
    expect(result).toMatchObject({ ok: true, discount });
    expect(result.ok && result.coupon.code).toBe(code);
  });

  it("chuẩn hóa mã trước khi kiểm tra", () => {
    expect(checkCoupon(" shoplite10 ", 1_000_000, NOW)).toMatchObject({
      ok: true,
      discount: 100_000,
    });
  });

  it("TET2026 còn dùng được trong ngày 28/02/2026", () => {
    expect(checkCoupon("TET2026", 1_000_000, new Date("2026-02-28T23:59:59+07:00"))).toMatchObject({
      ok: true,
      discount: 150_000,
    });
  });
});

describe("checkCouponEligibility", () => {
  it("đánh giá quy tắc đã có trong tay mà không cần tra danh sách", () => {
    expect(checkCouponEligibility(SHOPLITE10, 800_000, NOW)).toEqual({
      ok: true,
      coupon: SHOPLITE10,
      discount: 80_000,
    });
  });

  it("báo chưa đạt tối thiểu khi tạm tính giảm", () => {
    expect(checkCouponEligibility(GIAM50K, 450_000, NOW)).toEqual({
      ok: false,
      reason: "MIN_SUBTOTAL_NOT_MET",
      minSubtotal: 500_000,
      shortfall: 50_000,
    });
  });
});
