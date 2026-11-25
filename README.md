# PulseLedger — Bank Notification Money Sorter

Parses bank notifications (including **BCELOne**, **LDB**, **APB Meporm**, **JDB**, **U-Money**, and international banks) and sorts them into **Money Received** and **Money Paid**.

## 1. Host as a Web App / Installable PWA

Because this app has no backend, you can deploy the folder directly to any static host over HTTPS:

- **Netlify Drop**: Drag and drop the `bank-notification-sorter` folder at https://app.netlify.com/drop
- **Cloudflare Pages / Vercel / GitHub Pages**: Push this folder to a Git repository and deploy as a static site (build command: none, output directory: `.`).

Once hosted on `https://...`:
1. Open the URL on your phone (Chrome on Android or Safari on iOS).
2. Tap **Install App** / **Add to Home Screen**.
3. It will install with its app icon (`icon.svg`) and work offline via `sw.js`.

## 2. Build an Android APK with Capacitor

If you want to package this as an Android app (e.g., to add a native `NotificationListenerService` that auto-reads BCELOne, LDB, and APB Meporm push notifications):

```bash
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```

Then build the APK/AAB in **Android Studio**.
