package com.bipinai.chat

import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject

/**
 * Fills TEXT fields of the page that is currently open, using the user's own saved
 * details. Fields are found by their label / placeholder / name (like a password
 * manager does), so no per-site selectors are needed — but it is a best effort:
 * if a site names its fields strangely, that field is reported as "missing" and the
 * user types it by hand.
 *
 * What it never does (by design):
 *  - solve CAPTCHA, read or enter OTPs, press Submit / Next
 *  - touch password, checkbox, radio or file fields
 *  - overwrite a field that already has a value
 */
object FormAutoFiller {

    data class Result(val filled: List<String>, val missing: List<String>)

    /** onDone gets null if the script could not run or its answer could not be read. */
    fun fill(webView: WebView, values: Map<String, String>, onDone: (Result?) -> Unit) {
        val data = JSONObject()
        for ((key, value) in values) {
            if (value.isNotBlank()) data.put(key, value)
        }
        if (data.length() == 0) {
            onDone(Result(emptyList(), emptyList()))
            return
        }
        val js = SCRIPT.replace("__DATA__", data.toString())
        webView.evaluateJavascript(js) { raw -> onDone(parse(raw)) }
    }

    private fun parse(raw: String?): Result? = try {
        val obj = JSONObject(raw ?: "")
        Result(obj.getJSONArray("filled").toStrings(), obj.getJSONArray("missing").toStrings())
    } catch (e: Exception) {
        null
    }

    private fun JSONArray.toStrings(): List<String> = (0 until length()).map { getString(it) }

    private const val SCRIPT = """
        (function() {
            var data = __DATA__;
            var rules = [
                ['fatherName', ['father']],
                ['middleName', ['middle name', 'middlename', 'middle_name']],
                ['lastName', ['last name', 'lastname', 'last_name', 'surname']],
                ['firstName', ['first name', 'firstname', 'first_name', 'given name']],
                ['dob', ['date of birth', 'dob', 'birth']],
                ['aadhaar', ['aadhaar', 'aadhar', 'uid number']],
                ['mobile', ['mobile', 'phone']],
                ['email', ['email', 'e-mail']]
            ];
            var skipTypes = ['hidden', 'password', 'checkbox', 'radio', 'file', 'submit', 'button', 'reset', 'image', 'range', 'color'];
            var skipWords = /mother|spouse|guardian|parent|representative/;

            function labelText(el) {
                var t = '';
                if (el.id) {
                    var l = document.querySelector('label[for="' + el.id + '"]');
                    if (l) t += ' ' + l.textContent;
                }
                var p = el.closest('label');
                if (p) t += ' ' + p.textContent;
                var f = el.closest('mat-form-field, .form-group, .field');
                if (f) {
                    var fl = f.querySelector('label, mat-label');
                    if (fl) t += ' ' + fl.textContent;
                }
                return t;
            }
            function hay(el) {
                return [el.name, el.id, el.placeholder, el.getAttribute('aria-label'),
                    el.getAttribute('formcontrolname'), el.getAttribute('title'), labelText(el)
                ].join(' ').toLowerCase();
            }
            function setVal(el, v) {
                var proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
                el.dispatchEvent(new Event('input', {bubbles: true}));
                el.dispatchEvent(new Event('change', {bubbles: true}));
                el.dispatchEvent(new Event('blur', {bubbles: true}));
            }

            var filled = [];
            var done = {};
            var inputs = document.querySelectorAll('input, textarea');
            for (var i = 0; i < inputs.length; i++) {
                var el = inputs[i];
                if (skipTypes.indexOf((el.type || '').toLowerCase()) >= 0) continue;
                if (el.disabled || el.readOnly || el.offsetParent === null || el.value) continue;
                var h = hay(el);
                var isFather = h.indexOf('father') >= 0;
                if (!isFather && skipWords.test(h)) continue;
                for (var r = 0; r < rules.length; r++) {
                    var key = rules[r][0];
                    if (done[key] || !data[key]) continue;
                    if (isFather && key !== 'fatherName') continue;
                    var words = rules[r][1];
                    var hit = false;
                    for (var w = 0; w < words.length; w++) {
                        if (h.indexOf(words[w]) >= 0) { hit = true; break; }
                    }
                    if (hit) {
                        setVal(el, data[key]);
                        done[key] = true;
                        filled.push(key);
                        break;
                    }
                }
            }
            var missing = [];
            for (var k in data) {
                if (!done[k]) missing.push(k);
            }
            return {filled: filled, missing: missing};
        })();
    """
}
