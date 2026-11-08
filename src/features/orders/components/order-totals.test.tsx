import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Order } from "@/features/orders/types";
import { OrderTotals } from "./order-totals";

const baseOrder: Order = {
  id: "SL-20261108-ABC123",
  status: "pending",
  createdAt: "2026-11-08T03:00:00.000Z",
  updatedAt: "2026-11-08T03:00:00.000Z",
  customer: { fullName: "Nguyễn Văn A", phone: "0912345678", address: "12 Nguyễn Huệ, Quận 1" },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [],
  subtotal: 600_000,
  shippingFee: 0,
  total: 600_000,
};

describe("<OrderTotals />", () => {
  it("hiển thị dòng giảm giá với mã đã dùng", () => {
    render(
      <OrderTotals
        order={{ ...baseOrder, couponCode: "GIAM50K", discount: 50_000, total: 550_000 }}
      />,
    );
    expect(screen.getByText("Giảm giá (GIAM50K)")).toBeVisible();
    expect(screen.getByTestId("order-discount")).toHaveTextContent(/^-50\.000\s₫$/);
    expect(screen.getByTestId("order-total")).toHaveTextContent(/550\.000/);
  });

  it("không hiển thị dòng giảm giá khi discount = 0", () => {
    render(<OrderTotals order={{ ...baseOrder, discount: 0 }} />);
    expect(screen.queryByText(/Giảm giá/)).not.toBeInTheDocument();
  });

  it("đơn cũ không có couponCode/discount vẫn hiển thị đúng tổng, không có dòng giảm giá", () => {
    render(<OrderTotals order={baseOrder} />);
    expect(screen.queryByText(/Giảm giá/)).not.toBeInTheDocument();
    expect(screen.getByText("Tạm tính")).toBeVisible();
    expect(screen.getByTestId("order-total")).toHaveTextContent(/600\.000/);
  });

  it("đơn đã hủy vẫn hiển thị thông tin mã giảm giá", () => {
    render(
      <OrderTotals
        order={{
          ...baseOrder,
          status: "cancelled",
          couponCode: "SHOPLITE10",
          discount: 60_000,
          total: 540_000,
        }}
      />,
    );
    expect(screen.getByText("Giảm giá (SHOPLITE10)")).toBeVisible();
  });

  it("hiển thị Miễn phí khi phí giao hàng bằng 0", () => {
    render(<OrderTotals order={baseOrder} />);
    expect(screen.getByText("Miễn phí")).toBeVisible();
  });
});
