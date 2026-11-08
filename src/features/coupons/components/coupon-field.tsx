"use client";

import { useState } from "react";
import { TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_COUPON_CODE_LENGTH } from "@/features/checkout/checkout-schema";
import type { ApiErrorBody } from "@/lib/http";
import type { Coupon } from "../types";

interface CouponFieldProps {
  items: { productId: string; quantity: number }[];
  appliedCoupon: Coupon | null;
  onApplied: (coupon: Coupon) => void;
  onRemoved?: () => void;
  /** Thông báo khi mã bị gỡ tự động (hết hạn lúc đặt hàng, giỏ dưới mức tối thiểu...). */
  notice?: string | null;
}

const FIELD_ID = "coupon-code";
const ERROR_ID = "coupon-code-error";

export function CouponField({
  items,
  appliedCoupon,
  onApplied,
  onRemoved,
  notice,
}: CouponFieldProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleApply(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    if (code.trim() === "") {
      setError("Vui lòng nhập mã giảm giá");
      return;
    }
    setError(null);
    setChecking(true);
    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, items }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
        setError(body?.error.message ?? "Không thể kiểm tra mã giảm giá, vui lòng thử lại.");
        return;
      }
      const { coupon } = (await response.json()) as { coupon: Coupon };
      setCode("");
      onApplied(coupon);
    } catch {
      setError("Không kết nối được máy chủ, vui lòng thử lại.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <label htmlFor={FIELD_ID} className="text-sm font-medium text-slate-700">
        Mã giảm giá
      </label>
      <div className="flex gap-2">
        <input
          id={FIELD_ID}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          onKeyDown={(event) => {
            // Không gửi form thanh toán khi nhấn Enter trong ô mã giảm giá.
            if (event.key === "Enter") void handleApply(event);
          }}
          placeholder="Nhập mã, ví dụ SHOPLITE10"
          autoComplete="off"
          maxLength={MAX_COUPON_CODE_LENGTH}
          disabled={Boolean(appliedCoupon)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? ERROR_ID : undefined}
          className="h-11 min-w-0 flex-1 rounded-xl border-0 bg-white px-3 text-sm uppercase ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 placeholder:normal-case focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
        />
        {appliedCoupon ? (
          <Button type="button" variant="ghost" onClick={onRemoved}>
            Gỡ mã
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleApply()}
            disabled={checking}
          >
            Áp dụng
          </Button>
        )}
      </div>
      {error && (
        <p id={ERROR_ID} className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
          {notice}
        </p>
      )}
      {appliedCoupon && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-700">
          <TicketPercent className="size-4" />
          Đã áp dụng mã <strong>{appliedCoupon.code}</strong>
        </p>
      )}
    </section>
  );
}
