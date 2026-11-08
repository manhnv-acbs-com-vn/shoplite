import { describe, expect, it } from "vitest";
import { OrderError } from "@/features/orders/order-errors";
import { formatCurrency } from "@/lib/format";
import { toCouponError } from "./coupon-messages";

describe("toCouponError", () => {
  it("mã không tồn tại: không lặp lại chuỗi khách nhập", () => {
    const error = toCouponError({ ok: false, reason: "NOT_FOUND" }, "<script>XYZ");
    expect(error).toBeInstanceOf(OrderError);
    expect(error.code).toBe("COUPON_NOT_FOUND");
    expect(error.message).toBe("Mã giảm giá không tồn tại");
    expect(error.message).not.toContain("XYZ");
  });

  it("mã hết hạn: kèm mã đã chuẩn hóa và ngày hết hạn dd/mm/yyyy", () => {
    const error = toCouponError(
      { ok: false, reason: "EXPIRED", expiresOn: "2026-02-28" },
      "tet2026",
    );
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.message).toBe("Mã giảm giá TET2026 đã hết hạn ngày 28/02/2026");
    expect(error.details).toEqual({ expiresOn: "2026-02-28" });
  });

  it("chưa đạt tối thiểu: nêu giá trị tối thiểu và số tiền cần mua thêm", () => {
    const error = toCouponError(
      {
        ok: false,
        reason: "MIN_SUBTOTAL_NOT_MET",
        minSubtotal: 500_000,
        shortfall: 1,
      },
      "GIAM50K",
    );
    expect(error.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
    expect(error.message).toBe(
      `Đơn hàng chưa đạt tối thiểu ${formatCurrency(500_000)} để dùng mã GIAM50K. Cần mua thêm ${formatCurrency(1)}`,
    );
    expect(error.details).toEqual({ minSubtotal: "500000", shortfall: "1" });
  });

  it("trả về HTTP 422 cho mọi lỗi mã giảm giá", () => {
    expect(toCouponError({ ok: false, reason: "NOT_FOUND" }, "X").httpStatus).toBe(422);
  });
});
