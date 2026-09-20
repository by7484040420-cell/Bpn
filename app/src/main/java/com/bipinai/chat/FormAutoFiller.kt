package com.bipinai.chat

import android.webkit.WebView
import org.json.JSONObject

/**
 * Auto-fills TEXT fields only, via JS injection, once a page finishes loading.
 *
 * What this can do:
 *  - Set the .value of an input/textarea/select the page already rendered
 *  - Fire an 'input' + 'change' event so the site's own JS validation notices
 *
 * What this CANNOT do (by design — do not try to work around these):
 *  - Solve CAPTCHA images
 *  - Read or enter OTPs (they arrive on the user's phone, outside the WebView)
 *  - Click through multi-step Aadhaar/biometric verification
 *  - Guarantee it works at all — if the government site changes its HTML,
 *    field selectors silently stop matching and nothing gets filled.
 *    Always leave the field visible so the user can fill it manually as fallback.
 */
object FormAutoFiller {

    /**
     * @param webView the loaded WebView (call this from WebViewClient.onPageFinished)
     * @param values map of "purpose" -> value, e.g. mapOf("aadhaar" to "1234...", "mobile" to "98...")
     * @param fieldMap map of "purpose" -> CSS selector, from GovtService.fieldMap
     */
    fun fillTextFields(webView: WebView, values: Map<String, String>, fieldMap: Map<String, String>) {
        val fillOps = JSONObject()
        for ((purpose, value) in values) {
            val selector = fieldMap[purpose] ?: continue
            fillOps.put(selector, value)
        }
        if (fillOps.length() == 0) return

        // language=JavaScript
        val js = """
            (function() {
                var ops = ${fillOps};
                var filled = [];
                var failed = [];
                for (var selector in ops) {
                    try {
                        var el = document.querySelector(selector);
                        if (el) {
                            el.value = ops[selector];
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                            filled.push(selector);
                        } else {
                            failed.push(selector);
                        }
                    } catch (e) {
                        failed.push(selector);
                    }
                }
                return JSON.stringify({ filled: filled, failed: failed });
            })();
        """.trimIndent()

        webView.evaluateJavascript(js) { result ->
            // result is a JSON string like {"filled":["#mobileNumber"],"failed":["#aadhaarNumber"]}
            // Surface `failed` selectors back to your chat/UI so the user knows
            // which fields still need to be filled by hand.
        }
    }
}
