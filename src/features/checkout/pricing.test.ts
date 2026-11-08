import { describe, expect, it } from "vitest";
import {
  amountUntilFreeShipping,
  calculateOrderTotals,
  calculateShippingFee,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_OPTIONS,
} from "./pricing";
import type { Coupon } from "@/features/coupons/types";

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

describe("calculateShippingFee", () => {
  it("tính phí tiêu chuẩn khi đơn dưới ngưỡng miễn phí", () => {
    expect(calculateShippingFee(FREE_SHIPPING_THRESHOLD - 1, "standard")).toBe(
      SHIPPING_OPTIONS.standard.fee,
    );
  });

  it("miễn phí giao hàng tiêu chuẩn khi đơn đạt ngưỡng", () => {
    expect(calculateShippingFee(FREE_SHIPPING_THRESHOLD, "standard")).toBe(0);
  });

  it("giao hàng nhanh luôn tính phí", () => {
    expect(calculateShippingFee(5_000_000, "express")).toBe(SHIPPING_OPTIONS.express.fee);
  });

  it("không tính phí cho giỏ hàng trống", () => {
    expect(calculateShippingFee(0, "express")).toBe(0);
  });
});

describe("calculateOrderTotals", () => {
  it("cộng tạm tính và phí giao hàng", () => {
    const totals = calculateOrderTotals(
      [
        { unitPrice: 150_000, quantity: 2 },
        { unitPrice: 50_000, quantity: 1 },
      ],
      "standard",
    );
    expect(totals).toEqual({
      subtotal: 350_000,
      discount: 0,
      shippingFee: 30_000,
      total: 380_000,
    });
  });

  it("đơn giao nhanh không mã: total = tạm tính + 60.000đ", () => {
    expect(calculateOrderTotals([{ unitPrice: 499_999, quantity: 1 }], "express")).toEqual({
      subtotal: 499_999,
      discount: 0,
      shippingFee: 60_000,
      total: 559_999,
    });
  });

  it("trừ tiền giảm của mã phần trăm, giới hạn ở mức tối đa", () => {
    expect(
      calculateOrderTotals([{ unitPrice: 1_000_000, quantity: 1 }], "standard", SHOPLITE10),
    ).toEqual({
      subtotal: 1_000_000,
      discount: 100_000,
      shippingFee: 0,
      total: 900_000,
    });
  });

  it("miễn phí giao hàng xét trên tạm tính trước giảm giá", () => {
    expect(
      calculateOrderTotals([{ unitPrice: 250_000, quantity: 2 }], "standard", GIAM50K),
    ).toEqual({
      subtotal: 500_000,
      discount: 50_000,
      shippingFee: 0,
      total: 450_000,
    });
  });
});

describe("amountUntilFreeShipping", () => {
  it("trả về số tiền còn thiếu, tối thiểu 0", () => {
    expect(amountUntilFreeShipping(300_000)).toBe(200_000);
    expect(amountUntilFreeShipping(800_000)).toBe(0);
  });
});
