// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

// Thay orderService (ghi file) bằng bản dùng repository trong bộ nhớ.
vi.mock("@/features/orders/server", async () => {
  const { createOrderService } = await import("@/features/orders/order-service");
  const { createInMemoryOrderRepository } = await import("@/features/orders/order-repository");
  return {
    orderService: createOrderService({
      repository: createInMemoryOrderRepository(),
    }),
  };
});

const postValidate = (body: unknown) =>
  POST(
    new Request("http://localhost/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );

describe("POST /api/coupons/validate", () => {
  it("200 - trả về quy tắc của đúng mã vừa nhập và số tiền giảm", async () => {
    const response = await postValidate({
      code: "shoplite10",
      items: [{ productId: "p001", quantity: 1 }],
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      coupon: {
        code: "SHOPLITE10",
        type: "percent",
        percent: 10,
        maxDiscount: 100_000,
        minSubtotal: 300_000,
      },
      subtotal: 1_290_000,
      discount: 100_000,
    });
    expect(JSON.stringify(body)).not.toContain("GIAM50K");
  });

  it("422 - COUPON_NOT_FOUND khi mã không tồn tại", async () => {
    const response = await postValidate({
      code: "KHONGCO",
      items: [{ productId: "p001", quantity: 1 }],
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error).toMatchObject({
      code: "COUPON_NOT_FOUND",
      message: "Mã giảm giá không tồn tại",
    });
  });

  it("422 - COUPON_EXPIRED kèm ngày hết hạn (hôm nay sau 28/02/2026)", async () => {
    const response = await postValidate({
      code: "TET2026",
      items: [{ productId: "p001", quantity: 1 }],
    });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_EXPIRED");
    expect(error.details).toEqual({ expiresOn: "2026-02-28" });
  });

  it("422 - COUPON_MIN_SUBTOTAL_NOT_MET kèm số tiền cần mua thêm", async () => {
    // 2 x 150.000đ = 300.000đ < 500.000đ
    const response = await postValidate({
      code: "GIAM50K",
      items: [{ productId: "p010", quantity: 2 }],
    });
    expect(response.status).toBe(422);
    const { error } = await response.json();
    expect(error.code).toBe("COUPON_MIN_SUBTOTAL_NOT_MET");
    expect(error.details).toEqual({
      minSubtotal: "500000",
      shortfall: "200000",
    });
  });

  it.each(["", "   ", "A".repeat(33)])("400 - VALIDATION_ERROR khi mã %j", async (code) => {
    const response = await postValidate({
      code,
      items: [{ productId: "p001", quantity: 1 }],
    });
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("422 - PRODUCT_NOT_FOUND khi sản phẩm không tồn tại", async () => {
    const response = await postValidate({
      code: "SHOPLITE10",
      items: [{ productId: "p999", quantity: 1 }],
    });
    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe("PRODUCT_NOT_FOUND");
  });

  it("400 - body không phải JSON", async () => {
    const response = await postValidate("{oops");
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });
});
