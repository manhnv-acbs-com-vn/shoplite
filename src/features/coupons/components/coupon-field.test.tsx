import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Coupon } from "../types";
import { CouponField } from "./coupon-field";

const SHOPLITE10: Coupon = {
  code: "SHOPLITE10",
  type: "percent",
  percent: 10,
  maxDiscount: 100_000,
  minSubtotal: 300_000,
};

const items = [{ productId: "p010", quantity: 2 }];

describe("<CouponField />", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("có ô nhập mã có nhãn và nút Áp dụng", () => {
    render(<CouponField items={items} appliedCoupon={null} onApplied={vi.fn()} />);
    expect(screen.getByLabelText("Mã giảm giá")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Áp dụng" })).toBeInTheDocument();
  });

  it("gửi mã và giỏ hàng lên server, báo mã hợp lệ cho component cha", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          coupon: SHOPLITE10,
          subtotal: 300_000,
          discount: 30_000,
        }),
        {
          status: 200,
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField items={items} appliedCoupon={null} onApplied={onApplied} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), " shoplite10 ");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/coupons/validate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ code: " shoplite10 ", items });
    expect(onApplied).toHaveBeenCalledWith(SHOPLITE10);
  });

  it("hiển thị mã đang được áp dụng", () => {
    render(<CouponField items={items} appliedCoupon={SHOPLITE10} onApplied={vi.fn()} />);
    expect(screen.getByText(/Đã áp dụng mã/)).toHaveTextContent("SHOPLITE10");
  });

  it("hiển thị lý do mã không hợp lệ ngay dưới ô nhập và không áp dụng mã", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: "COUPON_EXPIRED",
              message: "Mã giảm giá TET2026 đã hết hạn ngày 28/02/2026",
            },
          }),
          { status: 422 },
        ),
      ),
    );
    const onApplied = vi.fn();
    const user = userEvent.setup();
    render(<CouponField items={items} appliedCoupon={null} onApplied={onApplied} />);

    const input = screen.getByLabelText("Mã giảm giá");
    await user.type(input, "TET2026");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    const message = await screen.findByText("Mã giảm giá TET2026 đã hết hạn ngày 28/02/2026");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Mã giảm giá TET2026 đã hết hạn ngày 28/02/2026");
    expect(message).toBeVisible();
    expect(onApplied).not.toHaveBeenCalled();
  });

  it.each(["", "   "])("ô mã %j: nhắc nhập mã và không gọi server", async (code) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CouponField items={items} appliedCoupon={null} onApplied={vi.fn()} />);

    if (code) await user.type(screen.getByLabelText("Mã giảm giá"), code);
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(screen.getByText("Vui lòng nhập mã giảm giá")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("báo lỗi kết nối khi không gọi được server", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const user = userEvent.setup();
    render(<CouponField items={items} appliedCoupon={null} onApplied={vi.fn()} />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("Không kết nối được máy chủ, vui lòng thử lại.")).toBeVisible();
  });
});

describe("<CouponField /> - gỡ mã", () => {
  it("khi đã áp dụng: ô nhập bị vô hiệu và có nút Gỡ mã", async () => {
    const onRemoved = vi.fn();
    const user = userEvent.setup();
    render(
      <CouponField
        items={items}
        appliedCoupon={SHOPLITE10}
        onApplied={vi.fn()}
        onRemoved={onRemoved}
      />,
    );

    expect(screen.getByLabelText("Mã giảm giá")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Áp dụng" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));
    expect(onRemoved).toHaveBeenCalledOnce();
  });

  it("khi chưa áp dụng: ô nhập dùng được và không có nút Gỡ mã", () => {
    render(
      <CouponField items={items} appliedCoupon={null} onApplied={vi.fn()} onRemoved={vi.fn()} />,
    );
    expect(screen.getByLabelText("Mã giảm giá")).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Gỡ mã" })).not.toBeInTheDocument();
  });
});
