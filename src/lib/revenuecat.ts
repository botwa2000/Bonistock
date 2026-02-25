/**
 * RevenueCat SDK wrapper for Capacitor.
 * All functions no-op on web. Dynamic imports for tree-shaking.
 * Same pattern as native.ts.
 */

import { isNative } from "@/lib/native";

const RC_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ?? "";

export interface RCPackage {
  identifier: string;
  productId: string;
  priceString: string;
  price: number;
  currencyCode: string;
}

/** Configure RevenueCat SDK. Called once at app startup on native. */
export async function initRevenueCat(): Promise<void> {
  if (!isNative || !RC_API_KEY) return;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.configure({ apiKey: RC_API_KEY });
  } catch {}
}

/** Associate RevenueCat customer with our user ID. Called after auth. */
export async function loginRevenueCat(userId: string): Promise<void> {
  if (!isNative || !RC_API_KEY) return;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.logIn({ appUserID: userId });
  } catch {}
}

/** Clear RevenueCat customer. Called on logout. */
export async function logoutRevenueCat(): Promise<void> {
  if (!isNative || !RC_API_KEY) return;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    await Purchases.logOut();
  } catch {}
}

/** Fetch available products with Apple-localized prices. */
export async function getOfferings(): Promise<RCPackage[]> {
  if (!isNative || !RC_API_KEY) return [];
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await Purchases.getOfferings();
    const current = offerings?.current;
    if (!current?.availablePackages) return [];

    return current.availablePackages.map((pkg: { identifier: string; product: { identifier: string; priceString: string; price: number; currencyCode: string } }) => ({
      identifier: pkg.identifier,
      productId: pkg.product.identifier,
      priceString: pkg.product.priceString,
      price: pkg.product.price,
      currencyCode: pkg.product.currencyCode,
    }));
  } catch {
    return [];
  }
}

/** Initiate StoreKit purchase. Returns true on success. */
export async function purchasePackage(packageId: string): Promise<boolean> {
  if (!isNative || !RC_API_KEY) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const offerings = await Purchases.getOfferings();
    const pkg = offerings?.current?.availablePackages.find(
      (p: { identifier: string }) => p.identifier === packageId
    );
    if (!pkg) return false;

    await Purchases.purchasePackage({ aPackage: pkg });
    return true;
  } catch {
    return false;
  }
}

/** Restore previous purchases (required by Apple). Returns true if entitlements found. */
export async function restorePurchases(): Promise<boolean> {
  if (!isNative || !RC_API_KEY) return false;
  try {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    const { customerInfo } = await Purchases.restorePurchases();
    return Object.keys(customerInfo.entitlements.active).length > 0;
  } catch {
    return false;
  }
}
