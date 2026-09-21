package com.bipin.sarkariai;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.view.View;
import android.graphics.Color;

public class MainActivity extends Activity {
    private WebView webView;
    private LinearLayout portalBar;
    private TextView portalTitle;
    private Button fillButton;
    private String currentPortal = "";

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);
        portalBar = findViewById(R.id.portalBar);
        portalTitle = findViewById(R.id.portalTitle);
        fillButton = findViewById(R.id.fillButton);
        Button back = findViewById(R.id.backButton);

        webView.setBackgroundColor(Color.WHITE);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setDatabaseEnabled(true);
        webView.getSettings().setLoadsImagesAutomatically(true);
        webView.getSettings().setSupportZoom(true);
        webView.getSettings().setBuiltInZoomControls(false);
        webView.getSettings().setDisplayZoomControls(false);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) { return false; }
            @Override public void onPageFinished(WebView v, String url) {
                super.onPageFinished(v, url);
                if (!url.startsWith("file:///android_asset/")) {
                    v.evaluateJavascript(fillScript(), null);
                }
            }
        });

        back.setOnClickListener(v -> showHome());
        fillButton.setOnClickListener(v -> webView.evaluateJavascript(fillScript(), null));
        showHome();
    }

    private void showHome() {
        currentPortal = "";
        portalBar.setVisibility(View.GONE);
        webView.loadUrl("file:///android_asset/index.html");
    }

    private void openPortal(String url, String title) {
        currentPortal = url;
        portalTitle.setText(title);
        portalBar.setVisibility(View.VISIBLE);
        webView.loadUrl(url);
    }

    private String fillScript() {
        return "(function(){try{"+
                "var d=JSON.parse(localStorage.getItem('bipinProfile')||'{}');"+
                "var h={fullName:['name','naam','candidate','applicant','fullname','full_name'],dob:['dob','birth','janam','dateofbirth','date_of_birth'],gender:['gender','sex'],fatherName:['father','pita','guardian','parent'],mobile:['mobile','phone','contact','telephone'],email:['email','mail'],address:['address','pata','residential'],category:['category','caste','reservation']};"+
                "function n(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}"+
                "function setv(e,v){var p=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,q=Object.getOwnPropertyDescriptor(p,'value');if(q&&q.set)q.set.call(e,v);else e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));}"+
                "document.querySelectorAll('input,textarea,select').forEach(function(e){var t=(e.type||'').toLowerCase();if(['file','hidden','submit','button','reset','password'].indexOf(t)>=0)return;var p=n((e.name||'')+' '+(e.id||'')+' '+(e.placeholder||'')+' '+(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('autocomplete')||''));for(var k in d){if(!d[k])continue;var a=h[k]||[k];if(a.some(function(w){return p.indexOf(n(w))>=0})){if(e.tagName==='SELECT'){var o=Array.from(e.options).find(function(z){return n(z.value)===n(d[k])||n(z.textContent)===n(d[k])||n(z.textContent).indexOf(n(d[k]))>=0});if(o)setv(e,o.value)}else setv(e,String(d[k]));break}}});"+
                "}catch(e){}})();";
    }

    public class AndroidBridge {
        @android.webkit.JavascriptInterface public void openPortal(String url, String title) {
            runOnUiThread(() -> openPortal(url, title));
        }
        @android.webkit.JavascriptInterface public void saveProfile(String json) {
            runOnUiThread(() -> webView.evaluateJavascript("localStorage.setItem('bipinProfile'," + JSONObjectQuote(json) + ");", null));
        }
        private String JSONObjectQuote(String s) { return "'" + s.replace("\\", "\\\\").replace("'", "\\'").replace("\n", "\\n") + "'"; }
    }

    @Override public void onBackPressed() {
        if (!currentPortal.isEmpty()) { showHome(); return; }
        if (webView.canGoBack()) webView.goBack(); else super.onBackPressed();
    }
}
