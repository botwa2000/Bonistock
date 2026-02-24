import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.bonifatus.bonistock",
  appName: "Bonistock",
  webDir: "out",
  server: {
    url: "https://bonistock.com",
    allowNavigation: [
      "bonistock.com",
      "*.stripe.com",
      "accounts.google.com",
      "*.facebook.com",
      "*.fbcdn.net",
    ],
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0a0a0a",
      spinnerColor: "#10b981",
      launchAutoHide: true,
      launchShowDuration: 2000,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
    },
  },
};

export default config;
