import { describe, expect, it } from "vitest";
import {
  checkoutFormSchema,
  placeOrderSchema,
  toFieldErrors,
  validateCouponSchema,
  VN_PHONE_REGEX,
} from "./checkout-schema";

const validForm = {
  fullName: "Nguyễn Văn A",
  phone: "0912345678",
  email: "",
  address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  note: "",
  shippingMethod: "standard",
  paymentMethod: "cod",
};

describe("VN_PHONE_REGEX", () => {
  it.each(["0912345678", "0387654321", "+84912345678"])("chấp nhận %s", (phone) => {
    expect(VN_PHONE_REGEX.test(phone)).toBe(true);
  });

  it.each(["091234567", "0212345678", "84912345678", "09123456789", "abc"])(
    "từ chối %s",
    (phone) => {
      expect(VN_PHONE_REGEX.test(phone)).toBe(false);
    },
  );
});

describe("checkoutFormSchema", () => {
  it("chấp nhận dữ liệu hợp lệ, email để trống", () => {
    expect(checkoutFormSchema.safeParse(validForm).success).toBe(true);
  });

  it("trả về lỗi theo từng field", () => {
    const result = checkoutFormSchema.safeParse({
      ...validForm,
      fullName: "A",
      phone: "123",
      email: "khong-phai-email",
      address: "ngắn",
    });
    expect(result.success).toBe(false);
    const errors = toFieldErrors(result.error!);
    expect(Object.keys(errors).sort()).toEqual(["address", "email", "fullName", "phone"]);
    expect(errors.phone).toMatch(/Số điện thoại không hợp lệ/);
  });

  it("từ chối phương thức giao hàng không hỗ trợ", () => {
    const result = checkoutFormSchema.safeParse({ ...validForm, shippingMethod: "drone" });
    expect(result.success).toBe(false);
  });
});

const validOrder = {
  customer: {
    fullName: "Nguyễn Văn A",
    phone: "0912345678",
    address: "12 Nguyễn Huệ, Quận 1",
  },
  shippingMethod: "standard",
  paymentMethod: "cod",
  items: [{ productId: "p006", quantity: 1 }],
};

describe("placeOrderSchema - couponCode", () => {
  it("chấp nhận đơn không có mã giảm giá", () => {
    const result = placeOrderSchema.safeParse(validOrder);
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("chuẩn hóa mã: bỏ khoảng trắng đầu/cuối và viết hoa", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      couponCode: " giam50k ",
    });
    expect(result.data?.couponCode).toBe("GIAM50K");
  });

  it.each(["", "   "])("mã rỗng %j được coi như không dùng mã", (couponCode) => {
    const result = placeOrderSchema.safeParse({ ...validOrder, couponCode });
    expect(result.success).toBe(true);
    expect(result.data?.couponCode).toBeUndefined();
  });

  it("chấp nhận mã đúng 32 ký tự, từ chối mã 33 ký tự", () => {
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode: "A".repeat(32) }).success).toBe(
      true,
    );
    expect(placeOrderSchema.safeParse({ ...validOrder, couponCode: "A".repeat(33) }).success).toBe(
      false,
    );
  });

  it.each([[["SHOPLITE10", "GIAM50K"]], [123], [{ code: "GIAM50K" }]])(
    "từ chối mã không phải chuỗi: %j",
    (couponCode) => {
      expect(placeOrderSchema.safeParse({ ...validOrder, couponCode }).success).toBe(false);
    },
  );

  it("loại bỏ các trường tiền do client tự gửi", () => {
    const result = placeOrderSchema.safeParse({
      ...validOrder,
      discount: 999_999,
      total: 1,
    });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("discount");
    expect(result.data).not.toHaveProperty("total");
  });
});

describe("validateCouponSchema", () => {
  const validBody = {
    code: "SHOPLITE10",
    items: [{ productId: "p006", quantity: 1 }],
  };

  it("chấp nhận dữ liệu hợp lệ và chuẩn hóa mã", () => {
    const result = validateCouponSchema.safeParse({
      ...validBody,
      code: " shoplite10 ",
    });
    expect(result.data?.code).toBe("SHOPLITE10");
  });

  it.each(["", "   "])("báo lỗi khi mã rỗng %j", (code) => {
    const result = validateCouponSchema.safeParse({ ...validBody, code });
    expect(result.success).toBe(false);
    expect(toFieldErrors(result.error!).code).toBe("Vui lòng nhập mã giảm giá");
  });

  it("báo lỗi khi mã dài hơn 32 ký tự", () => {
    expect(validateCouponSchema.safeParse({ ...validBody, code: "A".repeat(33) }).success).toBe(
      false,
    );
  });

  it("validate items giống đặt hàng: giỏ rỗng và số lượng quá 10 bị từ chối", () => {
    expect(validateCouponSchema.safeParse({ ...validBody, items: [] }).success).toBe(false);
    expect(
      validateCouponSchema.safeParse({
        ...validBody,
        items: [{ productId: "p006", quantity: 11 }],
      }).success,
    ).toBe(false);
  });
});
