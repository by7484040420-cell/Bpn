"use client";

import { createContext, useContext, useCallback } from "react";

const WebsiteModalContext = createContext(null);

export function useWebsiteModal() {
  const ctx = useContext(WebsiteModalContext);
  if (!ctx) throw new Error("useWebsiteModal must be used inside WebsiteModalProvider");
  return ctx;
}

// External portals are opened inside the Android app's WebView.
// No remote browser, Playwright server, screenshot streaming, or proxy is used.
// On the normal website, the official portal opens in a normal browser tab.
export default function WebsiteModalProvider({ children }) {
  const openSite = useCallback(async (url, name, filled = null) => {
    if (!url) return;

    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        const { InAppBrowser } = await import("@capgo/inappbrowser");

        await InAppBrowser.openWebView({
          url,
          title: name || "Official Website",
          toolbarColor: "#0b1f3a",
        });

        // Optional AI/profile autofill when values are supplied by ApplyFlow.
        if (filled && Object.keys(filled).length) {
          const { buildFillScript } = await import("@/lib/nativeAutoFill");
          const script = buildFillScript(filled);

          const fill = () => {
            InAppBrowser.executeScript({ code: script }).catch(() => {});
          };

          InAppBrowser.addListener("urlChangeEvent", () => {
            setTimeout(fill, 1200);
          });
          setTimeout(fill, 2500);
        }
        return;
      }
    } catch (e) {
      console.warn("Native WebView unavailable; using browser fallback.", e);
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const closeSite = useCallback(async () => {
    try {
      const { InAppBrowser } = await import("@capgo/inappbrowser");
      await InAppBrowser.close();
    } catch {}
  }, []);

  return (
    <WebsiteModalContext.Provider value={{ openSite, closeSite }}>
      {children}
    </WebsiteModalContext.Provider>
  );
}
