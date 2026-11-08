import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { CheckoutForm } from "./checkout-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

describe("<CheckoutForm />", () => {
  beforeEach(() => {
    cartStore.reset();
    cartStore.dispatch({ type: "add", item: toCartItem(getProductById("p010")!), quantity: 2 });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    push.mockReset();
  });

  it("hiển thị lỗi validate khi gửi form trống và không gọi API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(screen.getByTestId("error-fullName")).toBeVisible();
    expect(screen.getByTestId("error-phone")).toHaveTextContent(/Số điện thoại không hợp lệ/);
    expect(screen.getByTestId("error-address")).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cập nhật phí giao hàng khi đổi phương thức giao hàng", async () => {
    const user = userEvent.setup();
    render(<CheckoutForm />);

    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/30\.000/);
    await user.click(screen.getByText("Giao hàng nhanh"));
    expect(screen.getByTestId("shipping-fee")).toHaveTextContent(/60\.000/);
  });

  it("gửi đơn hàng, xóa giỏ và chuyển tới trang đơn hàng", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), { status: 201 }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/orders");
    expect(JSON.parse(init.body)).toMatchObject({
      shippingMethod: "standard",
      paymentMethod: "cod",
      items: [{ productId: "p010", quantity: 2 }],
      customer: { fullName: "Nguyễn Văn A", phone: "0912345678" },
    });
    expect(push).toHaveBeenCalledWith("/orders/SL-20261021-ABC123?placed=1");
    expect(cartStore.getSnapshot().items).toEqual([]);
  });

  it("áp dụng mã: tóm tắt hiện dòng giảm giá, tổng đã trừ và gửi couponCode khi đặt hàng", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            coupon: {
              code: "SHOPLITE10",
              type: "percent",
              percent: 10,
              maxDiscount: 100_000,
              minSubtotal: 300_000,
            },
            subtotal: 300_000,
            discount: 30_000,
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), {
          status: 201,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<CheckoutForm />);

    // 2 x 150.000đ = 300.000đ, ship 30.000đ
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
    await user.type(screen.getByLabelText("Mã giảm giá"), "shoplite10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));

    expect(await screen.findByText("Giảm giá (SHOPLITE10)")).toBeVisible();
    expect(screen.getByTestId("discount-amount")).toHaveTextContent(/-\s?30\.000/);
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/300\.000/);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/orders");
    expect(JSON.parse(init.body)).toMatchObject({ couponCode: "SHOPLITE10" });
  });

  it.each([
    ["COUPON_EXPIRED", "Mã giảm giá SHOPLITE10 đã hết hạn ngày 28/02/2026"],
    ["COUPON_MIN_SUBTOTAL_NOT_MET", "Đơn hàng chưa đạt tối thiểu 300.000 ₫ để dùng mã SHOPLITE10"],
    ["COUPON_NOT_FOUND", "Mã giảm giá không tồn tại"],
  ])(
    "server trả %s khi đặt hàng: tự gỡ mã, hiện lý do, khách bấm lại để đặt theo giá chưa giảm",
    async (code, message) => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              coupon: {
                code: "SHOPLITE10",
                type: "percent",
                percent: 10,
                maxDiscount: 100_000,
                minSubtotal: 300_000,
              },
              subtotal: 300_000,
              discount: 30_000,
            }),
            { status: 200 },
          ),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: { code, message } }), { status: 422 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: "SL-20261021-ABC123" }), { status: 201 }),
        );
      vi.stubGlobal("fetch", fetchMock);
      const user = userEvent.setup();
      render(<CheckoutForm />);

      await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
      await user.click(screen.getByRole("button", { name: "Áp dụng" }));
      await screen.findByText("Giảm giá (SHOPLITE10)");
      await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
      await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
      await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

      expect(await screen.findByText(message)).toBeVisible();
      expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
      expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
      expect(push).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
      const [, init] = fetchMock.mock.calls[2];
      expect(JSON.parse(init.body)).not.toHaveProperty("couponCode");
      expect(push).toHaveBeenCalledWith("/orders/SL-20261021-ABC123?placed=1");
    },
  );

  it("gỡ mã: tổng trở về như ban đầu và không còn dòng giảm giá", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            coupon: {
              code: "SHOPLITE10",
              type: "percent",
              percent: 10,
              maxDiscount: 100_000,
              minSubtotal: 300_000,
            },
            subtotal: 300_000,
            discount: 30_000,
          }),
          { status: 200 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText("Mã giảm giá"), "SHOPLITE10");
    await user.click(screen.getByRole("button", { name: "Áp dụng" }));
    await screen.findByText("Giảm giá (SHOPLITE10)");
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/300\.000/);

    await user.click(screen.getByRole("button", { name: "Gỡ mã" }));
    expect(screen.queryByTestId("discount-amount")).not.toBeInTheDocument();
    expect(screen.getByTestId("checkout-total")).toHaveTextContent(/330\.000/);
    expect(screen.getByLabelText("Mã giảm giá")).toBeEnabled();
  });

  it("hiển thị thông báo lỗi từ server", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "INSUFFICIENT_STOCK", message: "Sản phẩm đã hết hàng" },
          }),
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<CheckoutForm />);

    await user.type(screen.getByLabelText(/Họ và tên/), "Nguyễn Văn A");
    await user.type(screen.getByLabelText(/Số điện thoại/), "0912345678");
    await user.type(screen.getByLabelText(/Địa chỉ giao hàng/), "12 Nguyễn Huệ, Quận 1, TP.HCM");
    await user.click(screen.getByRole("button", { name: "Đặt hàng" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm đã hết hàng");
    expect(push).not.toHaveBeenCalled();
  });
});
