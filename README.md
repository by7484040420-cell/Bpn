# BIPIN AI - Government Form Assistant (Android)

Phone seedha (portrait) ya tirchha (landscape), dono mein chalta hai. Layout laptop jaisa hai:

- Header: menu (☰) button, BIPIN AI naam, Online
- Left: AI chat. Right: sarkari portal (desktop mode). Tirchha = 50/50, seedha = 40/60
- Portal toolbar ka arrows button: tirchha = portal 2/3, seedha = sirf portal (dobara dabao to chat wapas)
- Menu (☰): Home, PAN Card, Income Tax, Aadhaar, Driving License, Ration Card, Scholarship, My details
- Service chunte hi AI jawab deta hai aur portal right side mein khul jata hai

## My details + auto-fill
- Menu > "My details" mein naam, father ka naam, DOB, mobile, email, Aadhaar bharo
- Details sirf phone mein encrypted save hoti hain (Android Keystore), kisi server pe nahi jaati
- Portal pe chat mein "details bhar do" likho ya toolbar ka blue pencil dabao
- Sirf .gov.in pages pe chalta hai. CAPTCHA, OTP aur Submit user khud karta hai

## Files
- app/src/main/java/com/bipinai/chat/
  - MainActivity.kt   screen, menu, portal, my details, auto-fill trigger
  - ChatAdapter.kt / ChatMessage.kt   chat bubbles
  - GovtService.kt    services, URLs, keyword matching (placeholder for real AI)
  - ProfileStore.kt   encrypted storage of the user details
  - FormAutoFiller.kt fills text fields of the open page
- app/src/main/res/  layouts, drawables, colors, theme
- .github/workflows/build-apk.yml   builds the APK on GitHub

## TODO
- Real AI backend (never send Aadhaar / saved details to it)
- Verify auto-fill on each portal
rtal ki real URLs**, har ek ka note, aur (jahan verify
  kiya) fieldMap for auto-fill
- `FormAutoFiller.kt` — JS injection se text fields auto-fill karta hai (CAPTCHA/OTP chhod ke)
- `MainActivity.kt` — sab jodta hai: chat seed karta hai saare 6 services ke saath,
  jab user koi portal kholta hai to WebView load hone ke baad `FormAutoFiller` call hota hai

## Required permission
`AndroidManifest.xml` mein internet permission add karo (WebView ke bina yeh kaam nahi karega):

```xml
<uses-permission android:name="android.permission.INTERNET" />
```

## Phone vs tablet layout
Screenshot wide/split-view dikhata hai — yeh tablet jaisi screen ke liye theek hai.
Aapka app Android mobile-first hai, isliye:
- `res/layout/activity_main.xml` (phones): WebView panel ko full-screen kholo
  (chat ko replace kare, side-by-side nahi), taaki content chhota na dikhe.
- `res/layout-sw600dp/activity_main.xml` (tablets): yahi side-by-side split-view file rakho.

`MainActivity.kt` mein koi change nahi karna padega — Android khud sahi layout file
uthayega screen size ke hisaab se.

## Auto-fill ke bare mein — kya kaam karega, kya nahi

**Zaroori: `GovtService.kt` mein jo selectors (`#aadhaarNumber`, `#mobileNumber`) hai wo
PLACEHOLDER hai, verified nahi.** Maine live PAN portal ka HTML inspect nahi kiya (aur
kiya bhi nahi ja sakta bina live browser session ke) — ye sirf structure dikhane ke liye
hai. Real use se pehle:

1. Desktop Chrome mein us govt portal ka form page kholo
2. Right-click → Inspect → jis field mein value daalni hai uska `id` ya `name` dekho
3. Wo asli selector `GovtService.kt` ke `fieldMap` mein daalo
4. Govt sites apna HTML kabhi bhi badal sakti hai — production mein ek periodic check
   rakho ki selectors abhi bhi match ho rahe hai

**Kya auto-fill kar sakta hai:** simple text inputs jinka value pehle se pata hai
(mobile number, naam, etc.) — agar unka selector sahi diya ho.

**Kya kabhi nahi karega (design se):**
- CAPTCHA solve
- OTP padhna/bharna (OTP user ke phone pe SMS se aata hai, WebView ke bahar)
- Multi-step Aadhaar/biometric verification bypass
- Dropdown-heavy flows jaise Driving License (state select karne ke baad hi form aata hai)

## Legal/policy risk — dhyan se padho
Kai government portals ke Terms of Use mein automated scripts / bots se form fill karna
**explicitly disallowed** hota hai. Is code ko real users ke liye deploy karne se pehle:
- Har portal ka Terms of Use / Terms of Service check karo
- Sirf **user ka apna data**, **user ki apni jaankari ke saath** fill karo — kabhi
  doosre logo ka data ya bulk automation ke liye mat use karo
- Agar koi portal automation explicitly disallow karta hai to auto-fill feature us
  portal ke liye off rakho (empty `fieldMap` chhod do — jaisa abhi 4 services ke liye hai)

## Real-world caveats (chat mein pehle discuss kiya gaya)
1. **Bot-detection se block** — kuch sites unusual user-agent reject kar sakti hai.
   Fallback rakho: agar WebView load fail ho, "Open in Browser" (Intent.ACTION_VIEW)
   se system browser mein kholo.
2. **Chat ko WebView ka content nahi dikhta** — agar user portal pe atak jaye, bot ko
   automatically pata nahi chalega. User ko explicitly bolna padega ya aapko ek
   "I'm stuck" button add karna hoga jo current step/URL chat ko bhej de.

## Next steps
- Har portal ke real selectors verify karo (upar wala section dekho) pehle production mein
- Fallback "open in external browser" button add karo jab WebView load fail ho
- `messages.list` ko persist karo (Room DB) taaki chat history na khoye
- Apna bot/LLM backend call `sendButton` click ke andar add karo (abhi TODO comment hai)
- User ka real profile data kahin securely store karo (EncryptedSharedPreferences ya
  backend se fetch) — kabhi hardcode mat karo jaisa demo mein `userProfile` hai
