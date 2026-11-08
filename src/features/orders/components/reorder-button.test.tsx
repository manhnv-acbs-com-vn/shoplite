import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getProductById } from "@/features/catalog/catalog-service";
import { MAX_QUANTITY_PER_ITEM, toCartItem } from "@/features/cart/cart-reducer";
import { cartStore } from "@/features/cart/cart-store";
import { ReorderButton } from "./reorder-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
}));

const line = (productId: string, quantity: number) => ({
  product: getProductById(productId)!,
  quantity,
});

const cartQuantities = () =>
  cartStore.getSnapshot().items.map((item) => [item.productId, item.quantity]);

describe("<ReorderButton />", () => {
  beforeEach(() => cartStore.reset());
  afterEach(() => push.mockReset());

  it("thêm lại sản phẩm còn hàng vào giỏ, bỏ qua sản phẩm hết hàng và chuyển tới giỏ hàng", async () => {
    const user = userEvent.setup();
    render(<ReorderButton lines={[line("p010", 2), line("p004", 1)]} />);

    await user.click(screen.getByRole("button", { name: "Mua lại" }));

    expect(cartQuantities()).toEqual([["p010", 2]]);
    expect(push).toHaveBeenCalledWith("/cart");
  });

  it("cộng dồn với giỏ hiện có nhưng không vượt MAX_QUANTITY_PER_ITEM", async () => {
    cartStore.dispatch({
      type: "add",
      item: toCartItem(getProductById("p010")!),
      quantity: 9,
    });
    const user = userEvent.setup();
    render(<ReorderButton lines={[line("p010", 3)]} />);

    await user.click(screen.getByRole("button", { name: "Mua lại" }));

    expect(cartQuantities()).toEqual([["p010", MAX_QUANTITY_PER_ITEM]]);
  });

  it("vô hiệu hóa nút khi mọi sản phẩm trong đơn đã hết hàng", () => {
    render(<ReorderButton lines={[line("p004", 1)]} />);

    expect(screen.getByRole("button", { name: "Mua lại" })).toBeDisabled();
    expect(screen.getByText("Các sản phẩm trong đơn đã hết hàng")).toBeVisible();
  });
});
