/**
 * Unified native interface for Capacitor.
 * All functions no-op on web. Dynamic imports for tree-shaking.
 */

import { Capacitor } from "@capacitor/core";

export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === "ios";
export const isWeb = Capacitor.getPlatform() === "web";

/** Request push permission and return APNs device token, or null on web/denial. */
export async function registerPushNotifications(): Promise<string | null> {
  if (!isNative) return null;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return null;

    return new Promise((resolve) => {
      PushNotifications.addListener("registration", (token) => {
        resolve(token.value);
      });
      PushNotifications.addListener("registrationError", () => {
        resolve(null);
      });
      PushNotifications.register();
    });
  } catch {
    return null;
  }
}

/** Listen for push notification events. */
export async function addPushListeners(handlers: {
  onNotificationReceived?: (data: { title?: string; body?: string; data?: Record<string, unknown> }) => void;
  onNotificationTapped?: (data: { title?: string; body?: string; data?: Record<string, unknown> }) => void;
}): Promise<void> {
  if (!isNative) return;
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");

    if (handlers.onNotificationReceived) {
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        handlers.onNotificationReceived!({
          title: notification.title ?? undefined,
          body: notification.body ?? undefined,
          data: notification.data,
        });
      });
    }

    if (handlers.onNotificationTapped) {
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        handlers.onNotificationTapped!({
          title: action.notification.title ?? undefined,
          body: action.notification.body ?? undefined,
          data: action.notification.data,
        });
      });
    }
  } catch {}
}

/** Trigger haptic impact feedback. */
export async function hapticImpact(style: "light" | "medium" | "heavy" = "light"): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] });
  } catch {}
}

/** Trigger haptic notification feedback. */
export async function hapticNotification(type: "success" | "warning" | "error" = "success"): Promise<void> {
  if (!isNative) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
    await Haptics.notification({ type: map[type] });
  } catch {}
}

/** Set the app badge count. */
export async function setBadgeCount(count: number): Promise<void> {
  if (!isNative) return;
  try {
    const { Badge } = await import("@capawesome/capacitor-badge");
    await Badge.set({ count });
  } catch {}
}

/** Configure the status bar for dark theme. */
export async function configureStatusBar(): Promise<void> {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: "#0a0a0a" });
  } catch {}
}

/** Listen for app lifecycle events (resume/pause). */
export async function addAppLifecycleListeners(handlers?: {
  onResume?: () => void;
  onPause?: () => void;
}): Promise<void> {
  if (!isNative) return;
  try {
    const { App } = await import("@capacitor/app");
    if (handlers?.onResume) {
      App.addListener("appStateChange", (state) => {
        if (state.isActive) handlers.onResume!();
      });
    }
    if (handlers?.onPause) {
      App.addListener("appStateChange", (state) => {
        if (!state.isActive) handlers.onPause!();
      });
    }
  } catch {}
}

/** Open URL in SFSafariViewController (native) or navigate (web). */
export async function openInAppBrowser(url: string): Promise<void> {
  if (!isNative) {
    window.location.href = url;
    return;
  }
  try {
    const { Browser } = await import("@capacitor/browser");
    await Browser.open({ url });
  } catch {
    window.location.href = url;
  }
}
