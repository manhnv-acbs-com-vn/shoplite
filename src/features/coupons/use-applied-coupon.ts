"use client";

import { useState } from "react";
import { describeCouponFailure } from "./coupon-messages";
import { checkCouponEligibility } from "./coupon-rules";
import type { Coupon } from "./types";

export interface AppliedCouponState {
  /** Mã đang áp dụng (quy tắc công khai do server trả về), null nếu chưa có. */
  coupon: Coupon | null;
  /** Thông báo khi mã bị gỡ tự động (giỏ dưới mức tối thiểu, hết hạn lúc đặt hàng...). */
  notice: string | null;
  apply: (coupon: Coupon) => void;
  remove: (notice?: string) => void;
}

/**
 * State mã giảm giá ở trang thanh toán - chỉ sống trong phiên trang, không lưu localStorage.
 * Khi tạm tính đổi mà mã không còn đủ điều kiện, mã tự được gỡ (không tự áp dụng lại).
 */
export function useAppliedCoupon(subtotal: number): AppliedCouponState {
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [checkedSubtotal, setCheckedSubtotal] = useState(subtotal);

  // Điều chỉnh state ngay trong lúc render khi prop đổi (tránh effect gây render thừa).
  if (subtotal !== checkedSubtotal) {
    setCheckedSubtotal(subtotal);
    if (coupon) {
      const result = checkCouponEligibility(coupon, subtotal, new Date());
      if (!result.ok) {
        setCoupon(null);
        setNotice(describeCouponFailure(result, coupon.code));
      }
    }
  }

  return {
    coupon,
    notice,
    apply(next) {
      setCoupon(next);
      setNotice(null);
    },
    remove(message) {
      setCoupon(null);
      setNotice(message ?? null);
    },
  };
}
