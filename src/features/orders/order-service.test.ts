import { beforeEach, describe, expect, it } from "vitest";
import { SHIPPING_OPTIONS } from "@/features/checkout/pricing";
import { OrderError } from "./order-errors";
import { createInMemoryOrderRepository, type OrderRepository } from "./order-repository";
import { createOrderService, generateOrderId, type OrderService } from "./order-service";

const FIXED_DATE = new Date("2026-10-21T03:00:00.000Z");

const validInput = (overrides: Record<string, unknown> = {}) => ({
  customer: {
    fullName: "Trần Thị B",
    phone: "0987654321",
    email: "",
    address: "45 Lê Lợi, Hải Châu, Đà Nẵng",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p010", quantity: 2 }], // Cáp USB-C 150.000đ
  ...overrides,
});

async function expectOrderError(promise: Promise<unknown>, code: OrderError["code"]) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(OrderError);
  expect((error as OrderError).code).toBe(code);
  return error as OrderError;
}

describe("orderService", () => {
  let repository: OrderRepository;
  let service: OrderService;

  beforeEach(() => {
    repository = createInMemoryOrderRepository();
    let counter = 0;
    service = createOrderService({
      repository,
      now: () => FIXED_DATE,
      generateId: () => `SL-TEST-${++counter}`,
    });
  });

  describe("placeOrder", () => {
    it("tạo đơn hàng với giá lấy từ catalog và lưu vào repository", async () => {
      const order = await service.placeOrder(validInput());

      expect(order).toMatchObject({
        id: "SL-TEST-1",
        status: "pending",
        createdAt: FIXED_DATE.toISOString(),
        subtotal: 300_000,
        shippingFee: SHIPPING_OPTIONS.standard.fee,
        total: 330_000,
      });
      expect(order.items[0]).toMatchObject({
        productId: "p010",
        unitPrice: 150_000,
        lineTotal: 300_000,
      });
      expect(order.customer.email).toBeUndefined();
      expect(await repository.findById(order.id)).toEqual(order);
    });

    it("bỏ qua giá do client gửi lên", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p010", quantity: 1, price: 1 }] }),
      );
      expect(order.items[0].unitPrice).toBe(150_000);
    });

    it("gộp các dòng trùng sản phẩm", async () => {
      const order = await service.placeOrder(
        validInput({
          items: [
            { productId: "p010", quantity: 1 },
            { productId: "p010", quantity: 2 },
          ],
        }),
      );
      expect(order.items).toHaveLength(1);
      expect(order.items[0].quantity).toBe(3);
    });

    it("miễn phí giao hàng tiêu chuẩn cho đơn từ 500.000đ", async () => {
      const order = await service.placeOrder(
        validInput({ items: [{ productId: "p001", quantity: 1 }] }),
      );
      expect(order.shippingFee).toBe(0);
    });

    it("trả lỗi VALIDATION_ERROR kèm chi tiết từng field", async () => {
      const error = await expectOrderError(
        service.placeOrder(validInput({ customer: { fullName: "", phone: "123", address: "" } })),
        "VALIDATION_ERROR",
      );
      expect(error.details).toHaveProperty(["customer.phone"]);
      expect(error.httpStatus).toBe(400);
    });

    it("từ chối giỏ hàng trống", async () => {
      await expectOrderError(service.placeOrder(validInput({ items: [] })), "VALIDATION_ERROR");
    });

    it("trả lỗi PRODUCT_NOT_FOUND khi sản phẩm không tồn tại", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p999", quantity: 1 }] })),
        "PRODUCT_NOT_FOUND",
      );
    });

    it("trả lỗi INSUFFICIENT_STOCK khi vượt tồn kho hoặc hết hàng", async () => {
      // Giá đỡ laptop (p011) chỉ còn 3 sản phẩm, micro (p004) đã hết hàng
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p011", quantity: 4 }] })),
        "INSUFFICIENT_STOCK",
      );
      await expectOrderError(
        service.placeOrder(validInput({ items: [{ productId: "p004", quantity: 1 }] })),
        "INSUFFICIENT_STOCK",
      );
    });
  });

  describe("validateCoupon", () => {
    it("trả về quy tắc mã, tạm tính và số tiền giảm do server tính", async () => {
      const result = await service.validateCoupon({
        code: " shoplite10 ",
        items: [{ productId: "p001", quantity: 1 }], // 1.290.000đ
      });
      expect(result).toEqual({
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
    });

    it("bỏ qua giá do client gửi lên khi tính tạm tính", async () => {
      const result = await service.validateCoupon({
        code: "GIAM50K",
        items: [{ productId: "p001", quantity: 1, price: 1 }],
      });
      expect(result.subtotal).toBe(1_290_000);
    });

    it("trả lỗi VALIDATION_ERROR khi mã rỗng", async () => {
      await expectOrderError(
        service.validateCoupon({
          code: "  ",
          items: [{ productId: "p001", quantity: 1 }],
        }),
        "VALIDATION_ERROR",
      );
    });

    it("trả lỗi COUPON_NOT_FOUND khi mã không tồn tại", async () => {
      await expectOrderError(
        service.validateCoupon({
          code: "KHONGCO",
          items: [{ productId: "p001", quantity: 1 }],
        }),
        "COUPON_NOT_FOUND",
      );
    });
  });

  describe("placeOrder với mã giảm giá", () => {
    it("lưu mã đã chuẩn hóa, số tiền giảm và tổng đã trừ", async () => {
      const order = await service.placeOrder(
        validInput({
          couponCode: "giam50k",
          items: [{ productId: "p006", quantity: 2 }],
        }),
      );
      expect(order).toMatchObject({
        subtotal: 900_000,
        couponCode: "GIAM50K",
        discount: 50_000,
        shippingFee: 0,
        total: 850_000,
      });
      expect(await repository.findById(order.id)).toMatchObject({
        couponCode: "GIAM50K",
        discount: 50_000,
      });
    });

    it("đơn không dùng mã có discount 0 và không có couponCode", async () => {
      const order = await service.placeOrder(validInput());
      expect(order.discount).toBe(0);
      expect(order).not.toHaveProperty("couponCode");
      expect(order.total).toBe(order.subtotal + order.shippingFee);
    });

    it("không lưu đơn khi mã không hợp lệ, không bỏ qua mã lặng lẽ", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ couponCode: "KHONGCO" })),
        "COUPON_NOT_FOUND",
      );
      expect(await repository.findAll()).toEqual([]);
    });
  });

  describe("placeOrder - chống gian lận mã giảm giá", () => {
    const serviceAt = (isoDate: string) =>
      createOrderService({ repository, now: () => new Date(isoDate), generateId: () => "SL-T" });

    it("bỏ qua mọi số tiền do client gửi, lưu số do server tính", async () => {
      const order = await service.placeOrder(
        validInput({
          couponCode: "SHOPLITE10",
          items: [{ productId: "p001", quantity: 2, unitPrice: 1 }], // 2 x 1.290.000đ
          discount: 500_000,
          subtotal: 1,
          total: 1,
        }),
      );
      expect(order).toMatchObject({
        subtotal: 2_580_000,
        discount: 100_000,
        shippingFee: 0,
        total: 2_480_000,
      });
    });

    it("từ chối mã đã hết hạn tại thời điểm đặt (00:00 ngày 01/03/2026) và không lưu đơn", async () => {
      const error = await expectOrderError(
        serviceAt("2026-03-01T00:00:00+07:00").placeOrder(
          validInput({ couponCode: "TET2026", items: [{ productId: "p001", quantity: 1 }] }),
        ),
        "COUPON_EXPIRED",
      );
      expect(error.message).toBe("Mã giảm giá TET2026 đã hết hạn ngày 28/02/2026");
      expect(await repository.findAll()).toEqual([]);
    });

    it("vẫn giảm giá khi đặt ở giây cuối của ngày hết hạn", async () => {
      const order = await serviceAt("2026-02-28T23:59:59+07:00").placeOrder(
        validInput({ couponCode: "TET2026", items: [{ productId: "p001", quantity: 1 }] }),
      );
      expect(order).toMatchObject({ couponCode: "TET2026", discount: 193_500 });
    });

    it("từ chối khi tạm tính lúc đặt dưới mức tối thiểu và không lưu đơn", async () => {
      // 2 x 150.000đ = 300.000đ < 500.000đ
      const error = await expectOrderError(
        service.placeOrder(validInput({ couponCode: "GIAM50K" })),
        "COUPON_MIN_SUBTOTAL_NOT_MET",
      );
      expect(error.details).toEqual({ minSubtotal: "500000", shortfall: "200000" });
      expect(await repository.findAll()).toEqual([]);
    });

    it("từ chối nhiều mã trong một đơn", async () => {
      await expectOrderError(
        service.placeOrder(validInput({ couponCode: ["SHOPLITE10", "GIAM50K"] })),
        "VALIDATION_ERROR",
      );
    });

    it("vẫn kiểm tra giới hạn số lượng và tồn kho khi có mã", async () => {
      await expectOrderError(
        service.placeOrder(
          validInput({ couponCode: "SHOPLITE10", items: [{ productId: "p001", quantity: 11 }] }),
        ),
        "VALIDATION_ERROR",
      );
      await expectOrderError(
        service.placeOrder(
          validInput({ couponCode: "SHOPLITE10", items: [{ productId: "p004", quantity: 1 }] }),
        ),
        "INSUFFICIENT_STOCK",
      );
    });
  });

  describe("listOrders / getOrder", () => {
    it("liệt kê đơn hàng mới nhất trước", async () => {
      let time = FIXED_DATE.getTime();
      const timedService = createOrderService({
        repository,
        now: () => new Date((time += 60_000)),
      });
      const first = await timedService.placeOrder(validInput());
      const second = await timedService.placeOrder(validInput());

      const orders = await timedService.listOrders();
      expect(orders.map((order) => order.id)).toEqual([second.id, first.id]);
    });

    it("trả lỗi ORDER_NOT_FOUND với mã đơn không tồn tại", async () => {
      await expectOrderError(service.getOrder("SL-KHONG-CO"), "ORDER_NOT_FOUND");
    });
  });

  describe("đơn cũ không có thông tin mã giảm giá", () => {
    it("getOrder/listOrders trả về nguyên vẹn đơn thiếu couponCode và discount", async () => {
      const legacy = await service.placeOrder(validInput());
      const { discount: _discount, ...withoutDiscount } = legacy;
      void _discount;
      const legacyRepo = createInMemoryOrderRepository([withoutDiscount]);
      const legacyService = createOrderService({ repository: legacyRepo, now: () => FIXED_DATE });

      const fetched = await legacyService.getOrder(legacy.id);
      expect(fetched).toEqual(withoutDiscount);
      expect(fetched).not.toHaveProperty("discount");
      expect(await legacyService.listOrders()).toEqual([withoutDiscount]);
    });
  });

  describe("cancelOrder", () => {
    it("hủy đơn đang chờ xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled.status).toBe("cancelled");
      expect((await service.getOrder(order.id)).status).toBe("cancelled");
    });

    it("hủy đơn vẫn giữ nguyên mã và số tiền giảm", async () => {
      const order = await service.placeOrder(
        validInput({ couponCode: "GIAM50K", items: [{ productId: "p006", quantity: 2 }] }),
      );
      const cancelled = await service.cancelOrder(order.id);
      expect(cancelled).toMatchObject({ couponCode: "GIAM50K", discount: 50_000, total: 850_000 });
    });

    it("không cho hủy đơn đã hủy hoặc đã xác nhận", async () => {
      const order = await service.placeOrder(validInput());
      await repository.save({ ...order, status: "confirmed" });
      await expectOrderError(service.cancelOrder(order.id), "INVALID_STATUS_TRANSITION");
    });
  });
});

describe("generateOrderId", () => {
  it("có dạng SL-YYYYMMDD-XXXXXX", () => {
    expect(generateOrderId(FIXED_DATE)).toMatch(/^SL-20261021-[0-9A-F]{6}$/);
  });
});
