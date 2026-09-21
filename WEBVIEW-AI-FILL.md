# Bipin AI — WebView + AI Form Fill

- Android app opens official portals inside the app WebView.
- No remote-browser server, Puppeteer, proxy, screenshot streaming, or cloud browser is used.
- `lib/nativeAutoFill.js` injects profile values into text/select fields after the user opens a portal.
- The same fill is retried after navigation for multi-page forms.
- OTP, CAPTCHA, payment confirmation, biometric checks, and document/file uploads remain manual.
- The app does not bypass portal security or submit forms automatically.
- Normal website (outside Android app) falls back to opening the official portal in a browser tab.
