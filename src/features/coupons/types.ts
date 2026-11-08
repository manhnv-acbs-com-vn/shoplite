interface CouponBase {
  /** Viết hoa, [A-Z0-9], 3-32 ký tự, duy nhất trong danh sách. */
  code: string;
  /** Tạm tính tối thiểu (VND) để dùng mã; không có = không yêu cầu. */
  minSubtotal?: number;
  /** "YYYY-MM-DD" - dùng được đến hết ngày này theo giờ Việt Nam; không có = không hết hạn. */
  expiresOn?: string;
}

export interface PercentCoupon extends CouponBase {
  type: "percent";
  /** Số nguyên 1-100. */
  percent: number;
  /** Mức giảm tối đa (VND). */
  maxDiscount: number;
}

export interface FixedCoupon extends CouponBase {
  type: "fixed";
  /** Số tiền giảm cố định (VND). */
  amount: number;
}

export type Coupon = PercentCoupon | FixedCoupon;

export type CouponCheckResult =
  | { ok: true; coupon: Coupon; discount: number }
  | { ok: false; reason: "NOT_FOUND" }
  | { ok: false; reason: "EXPIRED"; expiresOn: string }
  | {
      ok: false;
      reason: "MIN_SUBTOTAL_NOT_MET";
      minSubtotal: number;
      shortfall: number;
    };

export type CouponFailure = Extract<CouponCheckResult, { ok: false }>;
