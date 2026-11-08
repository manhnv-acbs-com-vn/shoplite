import { getProductById } from "@/features/catalog/catalog-service";
import type { Product } from "@/features/catalog/types";
import {
  placeOrderSchema,
  toFieldErrors,
  validateCouponSchema,
} from "@/features/checkout/checkout-schema";
import { calculateOrderTotals, calculateSubtotal } from "@/features/checkout/pricing";
import { checkCoupon } from "@/features/coupons/coupon-service";
import { toCouponError } from "@/features/coupons/coupon-messages";
import type { Coupon } from "@/features/coupons/types";
import { OrderError } from "./order-errors";
import type { OrderRepository } from "./order-repository";
import type { Order, OrderItem } from "./types";

export interface ValidateCouponResult {
  coupon: Coupon;
  subtotal: number;
  discount: number;
}

export interface OrderServiceDeps {
  repository: OrderRepository;
  findProduct?: (id: string) => Product | undefined;
  now?: () => Date;
  generateId?: (date: Date) => string;
}

/** Mã đơn hàng dạng SL-20261021-4F9A2C */
export function generateOrderId(date: Date): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  return `SL-${ymd}-${random}`;
}

/** Gộp các dòng trùng productId: [{p1, 2}, {p1, 1}] -> [{p1, 3}] */
function mergeItems(items: { productId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const item of items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);
  }
  return [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export function createOrderService({
  repository,
  findProduct = getProductById,
  now = () => new Date(),
  generateId = generateOrderId,
}: OrderServiceDeps) {
  /** Dựng dòng hàng từ catalog (bỏ qua mọi giá client gửi lên) và kiểm tra tồn kho. */
  function buildOrderItems(items: { productId: string; quantity: number }[]): OrderItem[] {
    return mergeItems(items).map(({ productId, quantity }) => {
      const product = findProduct(productId);
      if (!product) {
        throw new OrderError("PRODUCT_NOT_FOUND", `Không tìm thấy sản phẩm "${productId}"`);
      }
      if (quantity > product.stock) {
        throw new OrderError(
          "INSUFFICIENT_STOCK",
          product.stock === 0
            ? `Sản phẩm "${product.name}" đã hết hàng`
            : `Sản phẩm "${product.name}" chỉ còn ${product.stock} sản phẩm`,
        );
      }
      return {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        unitPrice: product.price,
        quantity,
        lineTotal: product.price * quantity,
      };
    });
  }

  /** Kiểm tra mã tại thời điểm hiện tại; mã không hợp lệ -> ném OrderError (không bao giờ bỏ qua lặng lẽ). */
  function resolveCoupon(code: string, subtotal: number): Coupon {
    const result = checkCoupon(code, subtotal, now());
    if (!result.ok) throw toCouponError(result, code);
    return result.coupon;
  }

  async function getOrder(id: string): Promise<Order> {
    const order = await repository.findById(id);
    if (!order) {
      throw new OrderError("ORDER_NOT_FOUND", `Không tìm thấy đơn hàng "${id}"`);
    }
    return order;
  }

  return {
    /**
     * Tạo đơn hàng mới từ payload của client.
     * - Validate dữ liệu bằng placeOrderSchema
     * - Lấy giá từ catalog (bỏ qua mọi giá client gửi lên)
     * - Kiểm tra tồn kho
     */
    async placeOrder(input: unknown): Promise<Order> {
      const parsed = placeOrderSchema.safeParse(input);
      if (!parsed.success) {
        throw new OrderError(
          "VALIDATION_ERROR",
          "Thông tin đơn hàng không hợp lệ",
          toFieldErrors(parsed.error),
        );
      }

      const { customer, items, shippingMethod, paymentMethod, couponCode } = parsed.data;

      const orderItems = buildOrderItems(items);
      const coupon = couponCode
        ? resolveCoupon(couponCode, calculateSubtotal(orderItems))
        : undefined;

      const createdAt = now();
      const order: Order = {
        id: generateId(createdAt),
        status: "pending",
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
        customer: {
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email || undefined,
          address: customer.address,
          note: customer.note || undefined,
        },
        shippingMethod,
        paymentMethod,
        items: orderItems,
        ...(coupon ? { couponCode: coupon.code } : {}),
        ...calculateOrderTotals(orderItems, shippingMethod, coupon),
      };

      await repository.save(order);
      return order;
    },

    /**
     * Kiểm tra mã giảm giá cho giỏ hàng (không tạo dữ liệu). Tạm tính do server tính từ catalog.
     * Trả về quy tắc công khai của đúng mã vừa nhập để client tính lại khi giỏ thay đổi.
     */
    async validateCoupon(input: unknown): Promise<ValidateCouponResult> {
      const parsed = validateCouponSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors = toFieldErrors(parsed.error);
        // Lỗi của ô mã được trả thẳng làm message để trang thanh toán hiển thị cạnh ô nhập.
        throw new OrderError(
          "VALIDATION_ERROR",
          fieldErrors.code ?? "Dữ liệu kiểm tra mã giảm giá không hợp lệ",
          fieldErrors,
        );
      }
      const subtotal = calculateSubtotal(buildOrderItems(parsed.data.items));
      const result = checkCoupon(parsed.data.code, subtotal, now());
      if (!result.ok) throw toCouponError(result, parsed.data.code);
      return { coupon: result.coupon, subtotal, discount: result.discount };
    },

    /** Danh sách đơn hàng, mới nhất trước. */
    async listOrders(): Promise<Order[]> {
      const orders = await repository.findAll();
      return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    getOrder,

    /** Khách hàng chỉ được hủy đơn khi đơn còn ở trạng thái "Chờ xác nhận". */
    async cancelOrder(id: string): Promise<Order> {
      const order = await getOrder(id);
      if (order.status !== "pending") {
        throw new OrderError(
          "INVALID_STATUS_TRANSITION",
          "Chỉ có thể hủy đơn hàng đang ở trạng thái Chờ xác nhận",
        );
      }
      const cancelled: Order = { ...order, status: "cancelled", updatedAt: now().toISOString() };
      await repository.save(cancelled);
      return cancelled;
    },
  };
}

export type OrderService = ReturnType<typeof createOrderService>;
