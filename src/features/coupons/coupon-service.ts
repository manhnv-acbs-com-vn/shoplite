/**
 * Tra cứu và kiểm tra mã giảm giá theo danh sách mã - CHỈ dùng phía server
 * (import `@/data/coupons`). Client dùng `coupon-rules.ts`.
 */
import { coupons as defaultCoupons } from "@/data/coupons";
import { checkCouponEligibility, normalizeCouponCode } from "./coupon-rules";
import type { Coupon, CouponCheckResult } from "./types";

export {
  calculateDiscount,
  checkCouponEligibility,
  isCouponExpired,
  normalizeCouponCode,
} from "./coupon-rules";

export function findCoupon(code: string, coupons: Coupon[] = defaultCoupons): Coupon | undefined {
  const normalized = normalizeCouponCode(code);
  return coupons.find((coupon) => coupon.code === normalized);
}

/** Thứ tự kiểm tra: tồn tại → còn hạn → đủ tối thiểu. */
export function checkCoupon(
  code: string,
  subtotal: number,
  now: Date,
  coupons: Coupon[] = defaultCoupons,
): CouponCheckResult {
  const coupon = findCoupon(code, coupons);
  if (!coupon) return { ok: false, reason: "NOT_FOUND" };
  return checkCouponEligibility(coupon, subtotal, now);
}
