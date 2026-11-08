import { NextResponse } from "next/server";
import { orderService } from "@/features/orders/server";
import { handleRouteError, jsonError, readJsonBody } from "@/lib/http";

/** POST /api/coupons/validate - kiểm tra mã giảm giá cho giỏ hàng. Body: { code, items }. */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (body === undefined) {
    return jsonError(400, "VALIDATION_ERROR", "Body phải là JSON hợp lệ");
  }

  try {
    return NextResponse.json(await orderService.validateCoupon(body));
  } catch (error) {
    return handleRouteError(error);
  }
}
