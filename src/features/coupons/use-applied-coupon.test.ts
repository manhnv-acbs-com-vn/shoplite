import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { calculateOrderTotals } from "@/features/checkout/pricing";
import type { Coupon } from "./types";
import { useAppliedCoupon } from "./use-applied-coupon";

const SHOPLITE10: Coupon = {
  code: "SHOPLITE10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};
const GIAM50K: Coupon = { code: "GIAM50K", type: "fixed", amount: 50_000, minSubtotal: 500_000 };

function setup(initialSubtotal: number) {
  return renderHook(({ subtotal }) => useAppliedCoupon(subtotal), {
    initialProps: { subtotal: initialSubtotal },
  });
}

describe("useAppliedCoupon", () => {
  it("giữ mã khi tạm tính giảm nhưng vẫn đủ tối thiểu, số tiền giảm được tính lại", () => {
    const { result, rerender } = setup(1_200_000);
    act(() => result.current.apply(SHOPLITE10));
    const line = (subtotal: number) => [{ unitPrice: subtotal, quantity: 1 }];
    expect(calculateOrderTotals(line(1_200_000), "standard", result.current.coupon!).discount).toBe(
      100_000,
    );

    rerender({ subtotal: 800_000 });
    expect(result.current.coupon).toEqual(SHOPLITE10);
    expect(calculateOrderTotals(line(800_000), "standard", result.current.coupon!).discount).toBe(
      80_000,
    );
  });

  it("tự gỡ mã khi tạm tính xuống dưới mức tối thiểu và báo số tiền cần mua thêm", () => {
    const { result, rerender } = setup(600_000);
    act(() => result.current.apply(GIAM50K));

    rerender({ subtotal: 450_000 });
    expect(result.current.coupon).toBeNull();
    expect(result.current.notice).toMatch(/Cần mua thêm 50\.000/);
    expect(result.current.notice).toContain("GIAM50K");
  });

  it("không tự áp dụng lại mã khi tạm tính đủ mức trở lại", () => {
    const { result, rerender } = setup(600_000);
    act(() => result.current.apply(GIAM50K));
    rerender({ subtotal: 450_000 });
    rerender({ subtotal: 700_000 });
    expect(result.current.coupon).toBeNull();
  });

  it("gỡ mã thủ công xóa cả thông báo", () => {
    const { result } = setup(600_000);
    act(() => result.current.apply(GIAM50K));
    act(() => result.current.remove());
    expect(result.current.coupon).toBeNull();
    expect(result.current.notice).toBeNull();
  });
});
