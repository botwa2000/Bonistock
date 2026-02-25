/**
 * Client-side StoreKit 2 wrapper via @capgo/native-purchases.
 * All functions no-op on web. Dynamic imports for tree-shaking.
 * Same pattern as native.ts.
 */

import { isNative } from "@/lib/native";

export interface AppleProduct {
  identifier: string;
  title: string;
  priceString: string;
  price: number;
  currencyCode: string;
}

export interface ApplePurchaseResult {
  transactionId: string;
  productIdentifier: string;
}

/** Fetch Apple product info for given product IDs. */
export async function getProducts(productIds: string[]): Promise<AppleProduct[]> {
  if (!isNative || productIds.length === 0) return [];
  try {
    const { NativePurchases } = await import("@capgo/native-purchases");
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: productIds,
    });
    return products.map((p) => ({
      identifier: p.identifier,
      title: p.title,
      priceString: p.priceString,
      price: p.price,
      currencyCode: p.currencyCode,
    }));
  } catch {
    return [];
  }
}

/** Initiate StoreKit 2 purchase. Returns transaction info on success, null on cancel/failure. */
export async function purchaseProduct(productId: string): Promise<ApplePurchaseResult | null> {
  if (!isNative) return null;
  try {
    const { NativePurchases } = await import("@capgo/native-purchases");
    const transaction = await NativePurchases.purchaseProduct({
      productIdentifier: productId,
    });
    return {
      transactionId: transaction.transactionId,
      productIdentifier: transaction.productIdentifier,
    };
  } catch {
    return null;
  }
}

/** Restore previous purchases (required by Apple). Returns transactions found. */
export async function restorePurchases(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const { NativePurchases } = await import("@capgo/native-purchases");
    await NativePurchases.restorePurchases();
    // After restore, check if there are active purchases
    const { purchases } = await NativePurchases.getPurchases();
    return purchases.length > 0;
  } catch {
    return false;
  }
}
