// Android WebView AI/profile autofill.
// This runs only inside the app's WebView. It does NOT use a remote browser,
// proxy, Playwright server, or screenshot streaming.
//
// OTP, CAPTCHA, payment confirmation and file uploads remain manual.

const FIELD_HINTS = {
  fullName: ["name", "naam", "candidate", "applicant", "fullname", "full_name"],
  mobile: ["mobile", "phone", "contact", "telephone"],
  email: ["email", "mail"],
  dob: ["dob", "birth", "janam", "dateofbirth", "date_of_birth"],
  fatherName: ["father", "pita", "guardian", "parent"],
  address: ["address", "pata", "residential"],
  age: ["age", "umar"],
  category: ["category", "caste", "reservation"],
  gender: ["gender", "sex"],
  qualification: ["qualification", "education", "educational"],
  height: ["height"],
  weight: ["weight"],
  berthPreference: ["berth", "preference"],
};

export function buildFillScript(filled) {
  const data = JSON.stringify(filled || {});
  const hints = JSON.stringify(FIELD_HINTS);

  return `
    (function() {
      try {
        var data = ${data};
        var hints = ${hints};

        function norm(v) {
          return String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        }

        function setNativeValue(el, value) {
          var proto = el instanceof HTMLInputElement
            ? HTMLInputElement.prototype
            : el instanceof HTMLTextAreaElement
              ? HTMLTextAreaElement.prototype
              : HTMLSelectElement.prototype;
          var desc = Object.getOwnPropertyDescriptor(proto, "value");
          if (desc && desc.set) desc.set.call(el, value);
          else el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new Event("blur", { bubbles: true }));
        }

        var inputs = Array.prototype.slice.call(
          document.querySelectorAll("input, textarea, select")
        );

        inputs.forEach(function(el) {
          var type = (el.type || "").toLowerCase();
          if (["file","hidden","submit","button","reset","password"].indexOf(type) !== -1) return;

          var probe = norm(
            (el.name || "") + " " +
            (el.id || "") + " " +
            (el.placeholder || "") + " " +
            (el.getAttribute("aria-label") || "") + " " +
            (el.getAttribute("autocomplete") || "")
          );

          for (var key in data) {
            if (!data[key]) continue;
            var words = hints[key] || [key];
            var matched = words.some(function(w) {
              return probe.indexOf(norm(w)) !== -1;
            });

            if (matched) {
              var value = String(data[key]);

              if (el.tagName.toLowerCase() === "select") {
                var opts = Array.prototype.slice.call(el.options || []);
                var wanted = norm(value);
                var opt = opts.find(function(o) {
                  return norm(o.value) === wanted || norm(o.textContent) === wanted ||
                         norm(o.value).indexOf(wanted) !== -1 ||
                         norm(o.textContent).indexOf(wanted) !== -1;
                });
                if (opt) {
                  setNativeValue(el, opt.value);
                }
              } else {
                setNativeValue(el, value);
              }
              break;
            }
          }
        });

        // Some portals render forms after a delay; a second pass helps with
        // React/Angular forms without continuously touching the page.
        setTimeout(function() {
          try {
            document.querySelectorAll("input, textarea, select").forEach(function(el) {
              var type = (el.type || "").toLowerCase();
              if (["file","hidden","submit","button","reset","password"].indexOf(type) !== -1) return;
              var probe = norm(
                (el.name || "") + " " + (el.id || "") + " " +
                (el.placeholder || "") + " " + (el.getAttribute("aria-label") || "")
              );
              for (var key in data) {
                if (!data[key]) continue;
                var words = hints[key] || [key];
                if (words.some(function(w){ return probe.indexOf(norm(w)) !== -1; })) {
                  setNativeValue(el, String(data[key]));
                  break;
                }
              }
            });
          } catch (e) {}
        }, 1800);
      } catch (e) {
        console.log("Bipin AI autofill:", e);
      }
    })();
  `;
}

export async function openAndAutoFill(url, filled) {
  const { InAppBrowser } = await import("@capgo/inappbrowser");

  await InAppBrowser.openWebView({
    url,
    title: "Bipin AI — AI Form Fill",
    toolbarColor: "#0b1f3a",
  });

  const script = buildFillScript(filled);

  const fill = () => {
    InAppBrowser.executeScript({ code: script }).catch(() => {});
  };

  InAppBrowser.addListener("urlChangeEvent", () => {
    setTimeout(fill, 1200);
  });

  setTimeout(fill, 2500);
}
