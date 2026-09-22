BIPIN AI - WebView version

Is version me:
- Purana home page style rakha gaya hai.
- Remote browser / Playwright / Render dependency nahi hai.
- Government portal direct Android WebView me khulta hai.
- Home screen se service select karein.
- Portal khulne par upar AI Fill button hai.
- Saved profile ke normal fields ko fill karne ki koshish hoti hai.
- Password, OTP, CAPTCHA, payment aur file upload ko AI touch nahi karta.

GitHub Actions:
1. ZIP extract karein.
2. ZIP ke andar ka 'bipin' folder kholkar uske files repository ke ROOT me upload karein.
3. Actions -> Build Bipin AI APK -> Run workflow.
4. Build ke baad Artifacts se Bipin-AI-debug download karein.
5. Render ki zarurat nahi.
