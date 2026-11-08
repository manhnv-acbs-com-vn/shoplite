"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@/features/catalog/types";
import { getMaxQuantity } from "@/features/cart/cart-reducer";
import { useCart } from "@/features/cart/use-cart";

export interface ReorderLine {
  product: Product;
  quantity: number;
}

/** Thêm lại sản phẩm của đơn vào giỏ theo giá và tồn kho hiện tại, bỏ qua sản phẩm hết hàng. */
export function ReorderButton({ lines }: { lines: ReorderLine[] }) {
  const router = useRouter();
  const { addItem } = useCart();
  const available = lines.filter((line) => getMaxQuantity(line.product.stock) > 0);

  function handleReorder() {
    for (const { product, quantity } of available) addItem(product, quantity);
    router.push("/cart");
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={handleReorder} disabled={available.length === 0}>
        <RotateCcw className="size-4" />
        Mua lại
      </Button>
      {available.length === 0 && (
        <p className="text-sm text-slate-500">Các sản phẩm trong đơn đã hết hàng</p>
      )}
    </div>
  );
}
