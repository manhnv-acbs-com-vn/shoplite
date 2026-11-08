import type { Coupon } from "@/features/coupons/types";

/**
 * Danh sách mã giảm giá (read-only). Chỉ dùng phía server - không import vào client component,
 * để không lộ toàn bộ mã trong bundle trình duyệt.
 */
export const coupons: Coupon[] = [
  {
    code: "SHOPLITE10",
    type: "percent",
    percent: 10,
    maxDiscount: 100_000,
    minSubtotal: 300_000,
  },
  { code: "GIAM50K", type: "fixed", amount: 50_000, minSubtotal: 500_000 },
  {
    code: "TET2026",
    type: "percent",
    percent: 15,
    maxDiscount: 200_000,
    expiresOn: "2026-02-28",
  },
];
