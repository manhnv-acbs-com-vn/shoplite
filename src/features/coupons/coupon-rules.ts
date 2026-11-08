/**
 * Quy tắc thuần của mã giảm giá - KHÔNG phụ thuộc danh sách mã, nên an toàn để dùng ở client
 * (tính lại giảm giá khi giỏ hàng thay đổi) lẫn server.
 */
import type { Coupon, CouponCheckResult } from "./types";

/** " shoplite10 " -> "SHOPLITE10" */
export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/** Mã dùng được đến hết ngày `expiresOn` theo giờ Việt Nam (UTC+7). */
export function isCouponExpired(expiresOn: string | undefined, now: Date): boolean {
  if (!expiresOn) return false;
  const endOfDay = Date.parse(`${expiresOn}T23:59:59.999+07:00`);
  return now.getTime() > endOfDay;
}

/** Số tiền giảm (VND, số nguyên), không bao giờ vượt quá tạm tính. */
export function calculateDiscount(coupon: Coupon, subtotal: number): number {
  if (subtotal <= 0) return 0;
  const raw =
    coupon.type === "percent"
      ? Math.min(Math.floor((subtotal * coupon.percent) / 100), coupon.maxDiscount)
      : coupon.amount;
  return Math.min(raw, subtotal);
}

/** Kiểm tra hạn và giá trị tối thiểu cho một mã đã biết quy tắc. */
export function checkCouponEligibility(
  coupon: Coupon,
  subtotal: number,
  now: Date,
): CouponCheckResult {
  if (coupon.expiresOn && isCouponExpired(coupon.expiresOn, now)) {
    return { ok: false, reason: "EXPIRED", expiresOn: coupon.expiresOn };
  }
  if (coupon.minSubtotal !== undefined && subtotal < coupon.minSubtotal) {
    return {
      ok: false,
      reason: "MIN_SUBTOTAL_NOT_MET",
      minSubtotal: coupon.minSubtotal,
      shortfall: coupon.minSubtotal - subtotal,
    };
  }
  return { ok: true, coupon, discount: calculateDiscount(coupon, subtotal) };
}
