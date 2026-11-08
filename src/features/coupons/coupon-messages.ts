import { OrderError } from "@/features/orders/order-errors";
import { formatCurrency } from "@/lib/format";
import { normalizeCouponCode } from "./coupon-rules";
import type { CouponFailure } from "./types";

/** "2026-02-28" -> "28/02/2026" */
function formatDateOnly(isoDate: string): string {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

const ERROR_CODE_BY_REASON = {
  NOT_FOUND: "COUPON_NOT_FOUND",
  EXPIRED: "COUPON_EXPIRED",
  MIN_SUBTOTAL_NOT_MET: "COUPON_MIN_SUBTOTAL_NOT_MET",
} as const;

/**
 * Thông báo tiếng Việt cho mã không hợp lệ - dùng chung client (tự gỡ mã) và server (lỗi API).
 * Không lặp lại nguyên văn chuỗi khách nhập khi mã không tồn tại.
 */
export function describeCouponFailure(failure: CouponFailure, code: string): string {
  const normalized = normalizeCouponCode(code);
  switch (failure.reason) {
    case "NOT_FOUND":
      return "Mã giảm giá không tồn tại";
    case "EXPIRED":
      return `Mã giảm giá ${normalized} đã hết hạn ngày ${formatDateOnly(failure.expiresOn)}`;
    case "MIN_SUBTOTAL_NOT_MET":
      return `Đơn hàng chưa đạt tối thiểu ${formatCurrency(failure.minSubtotal)} để dùng mã ${normalized}. Cần mua thêm ${formatCurrency(failure.shortfall)}`;
  }
}

function failureDetails(failure: CouponFailure): Record<string, string> | undefined {
  switch (failure.reason) {
    case "NOT_FOUND":
      return undefined;
    case "EXPIRED":
      return { expiresOn: failure.expiresOn };
    case "MIN_SUBTOTAL_NOT_MET":
      return { minSubtotal: String(failure.minSubtotal), shortfall: String(failure.shortfall) };
  }
}

/** Chuyển kết quả mã không hợp lệ thành OrderError (HTTP 422). */
export function toCouponError(failure: CouponFailure, code: string): OrderError {
  return new OrderError(
    ERROR_CODE_BY_REASON[failure.reason],
    describeCouponFailure(failure, code),
    failureDetails(failure),
  );
}
