package com.bipinai.chat

import android.content.ActivityNotFoundException
import android.content.DialogInterface
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.ImageButton
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

/**
 * Laptop-style layout (phone held sideways):
 *   header  [menu] BIPIN AI ...................... Online
 *   left  = AI chat        right = government portal (desktop mode)
 * The service list (PAN, Aadhaar ...) slides over the left side when the
 * menu button is tapped; tapping a service opens its portal on the right.
 * "My details" (in the same menu) stores the user's own details encrypted on
 * this phone; the pencil button / the chat command "details bhar do" fills them
 * into the open .gov.in page.
 */
class MainActivity : AppCompatActivity() {

    /** One entry in the sidebar (Home has service == null and isProfile == false). */
    private data class NavItem(
        val icon: String,
        val label: String,
        val service: GovtService?,
        val isProfile: Boolean = false
    )

    private val messages = mutableListOf<ChatMessage>()
    private lateinit var chatAdapter: ChatAdapter
    private lateinit var chatRecycler: RecyclerView
    private lateinit var messageInput: EditText

    private lateinit var sidebar: View
    private lateinit var chatPanel: View
    private lateinit var panelDivider: View
    private lateinit var webPanel: View
    private lateinit var portalWebView: WebView
    private lateinit var webProgress: ProgressBar
    private lateinit var tabTitle: TextView
    private lateinit var urlText: TextView
    private lateinit var lockIcon: ImageView
    private lateinit var btnToggleSize: ImageButton

    private val navViews = mutableListOf<Pair<NavItem, View>>()
    private var activeService: GovtService? = null
    private var portalWide = false

    // File upload (photo / signature / PDF) requested by a portal page.
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private val fileChooserLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            fileCallback?.onReceiveValue(
                WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            )
            fileCallback = null
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        sidebar = findViewById(R.id.sidebar)
        findViewById<View>(R.id.btnMenu).setOnClickListener { toggleSidebar() }

        setupChat()
        setupServiceNav()
        setupWebPanel()

        addMessage(
            ChatMessage(
                text = "Namaste! Main BIPIN AI hoon. Kaun si sarkari service mein madad chahiye? " +
                    "Upar left ke menu se service chuniye ya likhiye, jaise \"Mujhe PAN card banana hai\".\n\n" +
                    "Menu mein \"My details\" bhar do, phir portal pe \"details bhar do\" likho — " +
                    "main form bhar dunga.",
                isFromUser = false
            )
        )
    }

    // ------------------------------------------------------------------ chat

    private fun setupChat() {
        chatRecycler = findViewById(R.id.chatRecyclerView)
        messageInput = findViewById(R.id.messageInput)

        chatAdapter = ChatAdapter(messages) { service -> openPortal(service) }
        chatRecycler.layoutManager = LinearLayoutManager(this)
        chatRecycler.adapter = chatAdapter

        findViewById<View>(R.id.sendButton).setOnClickListener { sendUserMessage() }
        messageInput.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendUserMessage()
                true
            } else {
                false
            }
        }
    }

    private fun addMessage(message: ChatMessage) {
        chatAdapter.addMessage(message)
        chatRecycler.scrollToPosition(messages.size - 1)
    }

    private fun aiSay(text: String) = addMessage(ChatMessage(text = text, isFromUser = false))

    private fun sendUserMessage() {
        val text = messageInput.text.toString().trim()
        if (text.isEmpty()) return
        addMessage(ChatMessage(text = text, isFromUser = true))
        messageInput.text.clear()

        // "details bhar do" / "fill" while a portal is open -> fill the form.
        val lower = text.lowercase()
        if (webPanel.visibility == View.VISIBLE && (lower.contains("bhar") || lower.contains("fill"))) {
            chatRecycler.postDelayed({ runAutoFill() }, 300)
            return
        }

        // TODO: replace this keyword matching with your bot/LLM backend call.
        // Never send the saved personal details (Aadhaar etc.) to that backend.
        val service = GovtService.match(text)
        chatRecycler.postDelayed({
            addMessage(
                service?.toChatMessage()
                    ?: ChatMessage(text = GovtService.helpText(), isFromUser = false)
            )
        }, 400)
    }

    // ----------------------------------------------------------------- sidebar

    private fun setupServiceNav() {
        val container = findViewById<LinearLayout>(R.id.serviceList)
        val items = listOf(NavItem("🏠", "Home", null)) +
            GovtService.entries.map { NavItem(it.icon, it.shortName, it) } +
            NavItem("📝", "My details", null, isProfile = true)

        for (item in items) {
            val view = layoutInflater.inflate(R.layout.item_service_side, container, false)
            view.findViewById<TextView>(R.id.serviceIcon).text = item.icon
            view.findViewById<TextView>(R.id.serviceLabel).text = item.label
            view.setOnClickListener { onNavClick(item) }
            container.addView(view)
            navViews.add(item to view)
        }
        highlightNav(null)
    }

    private fun toggleSidebar() {
        sidebar.visibility = if (sidebar.visibility == View.VISIBLE) View.GONE else View.VISIBLE
    }

    private fun highlightNav(service: GovtService?) {
        for ((item, view) in navViews) {
            view.isSelected = !item.isProfile && item.service == service
        }
    }

    private fun onNavClick(item: NavItem) {
        sidebar.visibility = View.GONE
        if (item.isProfile) {
            showProfileDialog()
            return
        }
        val service = item.service
        if (service == null) {
            closePortal()
            return
        }
        // AI explains on the left while the portal opens on the right.
        addMessage(service.toChatMessage())
        openPortal(service)
    }

    // -------------------------------------------------------------- my details

    private fun showProfileDialog() {
        val view = layoutInflater.inflate(R.layout.dialog_profile, null)
        val fields = mapOf(
            "firstName" to view.findViewById<EditText>(R.id.fieldFirstName),
            "middleName" to view.findViewById<EditText>(R.id.fieldMiddleName),
            "lastName" to view.findViewById<EditText>(R.id.fieldLastName),
            "fatherName" to view.findViewById<EditText>(R.id.fieldFatherName),
            "dob" to view.findViewById<EditText>(R.id.fieldDob),
            "mobile" to view.findViewById<EditText>(R.id.fieldMobile),
            "email" to view.findViewById<EditText>(R.id.fieldEmail),
            "aadhaar" to view.findViewById<EditText>(R.id.fieldAadhaar)
        )
        val saved = ProfileStore.load(this)
        for ((key, edit) in fields) {
            edit.setText(saved[key] ?: "")
        }

        val dialog = AlertDialog.Builder(this)
            .setView(view)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .setNeutralButton("Delete all") { _, _ ->
                ProfileStore.clear(this)
                Toast.makeText(this, "Saari details delete ho gayi", Toast.LENGTH_SHORT).show()
            }
            .create()

        // Save is wired after show() so that a validation error keeps the dialog open.
        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                if (!validateProfile(fields)) return@setOnClickListener
                ProfileStore.save(this, fields.mapValues { it.value.text.toString().trim() })
                Toast.makeText(this, "Details save ho gayi", Toast.LENGTH_SHORT).show()
                dialog.dismiss()
            }
        }
        dialog.show()
    }

    private fun validateProfile(fields: Map<String, EditText>): Boolean {
        var ok = true
        fun text(key: String): String = fields[key]?.text?.toString()?.trim().orEmpty()
        fun fail(key: String, message: String) {
            fields[key]?.error = message
            ok = false
        }

        val dob = text("dob")
        if (dob.isNotEmpty() &&
            !Regex("(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/[0-9]{4}").matches(dob)
        ) fail("dob", "DD/MM/YYYY format mein likho")

        val mobile = text("mobile")
        if (mobile.isNotEmpty() && !Regex("[6-9][0-9]{9}").matches(mobile)) {
            fail("mobile", "10 digit ka mobile number likho")
        }

        val aadhaar = text("aadhaar")
        if (aadhaar.isNotEmpty() && !Regex("[0-9]{12}").matches(aadhaar)) {
            fail("aadhaar", "12 digit ka Aadhaar number likho")
        }

        val email = text("email")
        if (email.isNotEmpty() && !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            fail("email", "Sahi email likho")
        }
        return ok
    }

    // --------------------------------------------------------------- auto-fill

    private fun runAutoFill() {
        if (webPanel.visibility != View.VISIBLE) {
            aiSay("Pehle koi portal kholo (menu se service chuno), phir main details bharunga.")
            return
        }
        if (portalWide && isPortrait()) setPortalWide(false)
        val profile = ProfileStore.load(this)
        if (profile.isEmpty()) {
            aiSay("Abhi aapki details save nahi hain. Menu mein \"My details\" bharo, phir dobara bolo.")
            showProfileDialog()
            return
        }
        // Only ever fill official government pages, never any other site.
        val host = Uri.parse(portalWebView.url ?: "").host ?: ""
        if (!host.endsWith(".gov.in")) {
            aiSay("Yeh page sarkari (.gov.in) site ka nahi hai, isliye main yahan details nahi bharunga.")
            return
        }
        FormAutoFiller.fill(portalWebView, profile) { result -> aiSay(autoFillSummary(result)) }
    }

    private fun autoFillSummary(result: FormAutoFiller.Result?): String {
        if (result == null) {
            return "Details bharne mein dikkat aayi. Page reload karke dobara try karo."
        }
        if (result.filled.isEmpty()) {
            return "Is page pe mujhe bharne layak field nahi mili. " +
                "Form wale step pe pahunch kar dobara \"details bhar do\" likho."
        }
        val labels = ProfileStore.LABELS
        val done = result.filled.joinToString(", ") { labels[it] ?: it }
        val text = StringBuilder("Maine yeh bhar diya: $done.")
        if (result.missing.isNotEmpty()) {
            val left = result.missing.joinToString(", ") { labels[it] ?: it }
            text.append("\n\nYeh is page pe nahi mile (agle step mein aa sakte hain): $left.")
        }
        text.append("\n\nCAPTCHA, OTP aur Submit aapko khud karna hai. Bhari hui details ek baar check kar lena.")
        return text.toString()
    }

    // ------------------------------------------------------------ portal panel

    private fun setupWebPanel() {
        chatPanel = findViewById(R.id.chatPanel)
        webPanel = findViewById(R.id.webPanel)
        panelDivider = findViewById(R.id.panelDivider)
        portalWebView = findViewById(R.id.portalWebView)
        webProgress = findViewById(R.id.webProgress)
        tabTitle = findViewById(R.id.tabTitle)
        urlText = findViewById(R.id.urlText)
        lockIcon = findViewById(R.id.lockIcon)
        btnToggleSize = findViewById(R.id.btnToggleSize)

        val settings = portalWebView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true // needed for OTP/session-based govt logins

        // Desktop ("laptop") mode: desktop user agent + wide viewport, fitted to the
        // panel. Pinch to zoom in on the small text.
        settings.userAgentString = desktopUserAgent(settings.userAgentString)
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.setSupportZoom(true)
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

        // e-PAN / Aadhaar PDFs etc. — WebView cannot download, so hand off to the browser.
        portalWebView.setDownloadListener { url, _, _, _, _ -> openExternal(url) }

        portalWebView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val scheme = request?.url?.scheme
                // Keep http/https inside the WebView, block everything else (intent:, tel: ...)
                return scheme != "http" && scheme != "https"
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                updateAddressBar(url)
            }

            override fun onPageCommitVisible(view: WebView?, url: String?) {
                super.onPageCommitVisible(view, url)
                view?.evaluateJavascript(DESKTOP_VIEWPORT_JS, null)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                updateAddressBar(url)
                view?.evaluateJavascript(DESKTOP_VIEWPORT_JS, null)
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    Toast.makeText(
                        this@MainActivity,
                        "Page load nahi hua. Internet check karo ya browser mein kholo.",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }

        portalWebView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                webProgress.progress = newProgress
                webProgress.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
            }

            override fun onReceivedTitle(view: WebView?, title: String?) {
                if (!title.isNullOrBlank()) tabTitle.text = title
            }

            // The user picks the document (photo, signature, PDF) from the phone.
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: WebChromeClient.FileChooserParams?
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = filePathCallback
                val intent = fileChooserParams?.createIntent()
                if (intent == null) {
                    fileCallback = null
                    return false
                }
                return try {
                    fileChooserLauncher.launch(intent)
                    true
                } catch (e: ActivityNotFoundException) {
                    fileCallback = null
                    false
                }
            }
        }

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener {
            if (portalWebView.canGoBack()) portalWebView.goBack()
        }
        findViewById<ImageButton>(R.id.btnForward).setOnClickListener {
            if (portalWebView.canGoForward()) portalWebView.goForward()
        }
        findViewById<ImageButton>(R.id.btnReload).setOnClickListener { portalWebView.reload() }
        findViewById<ImageButton>(R.id.btnCloseWeb).setOnClickListener { closePortal() }
        findViewById<ImageButton>(R.id.btnAutoFill).setOnClickListener { runAutoFill() }
        findViewById<ImageButton>(R.id.btnOpenExternal).setOnClickListener {
            openExternal(portalWebView.url ?: activeService?.url)
        }
        btnToggleSize.setOnClickListener { setPortalWide(!portalWide) }

        applyOrientation()
    }

    private fun openPortal(service: GovtService) {
        activeService = service
        highlightNav(service)
        tabTitle.text = service.shortName
        updateAddressBar(service.url)
        webPanel.visibility = View.VISIBLE
        panelDivider.visibility = View.VISIBLE
        portalWide = false
        btnToggleSize.setImageResource(R.drawable.ic_fullscreen)
        applyPanelLayout()
        portalWebView.loadUrl(service.url)
    }

    private fun closePortal() {
        portalWebView.stopLoading()
        webPanel.visibility = View.GONE
        panelDivider.visibility = View.GONE
        applyPanelLayout()
        activeService = null
        highlightNav(null)
    }

    /**
     * Phone sideways: false = chat and portal 50/50, true = portal gets two thirds.
     * Phone upright: false = chat left / portal right (40/60), true = portal only.
     */
    private fun setPortalWide(wide: Boolean) {
        portalWide = wide
        applyPanelLayout()
        btnToggleSize.setImageResource(
            if (wide) R.drawable.ic_fullscreen_exit else R.drawable.ic_fullscreen
        )
    }

    private fun isPortrait(): Boolean =
        resources.configuration.orientation == Configuration.ORIENTATION_PORTRAIT

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    private fun applyPanelLayout() {
        val portalOpen = webPanel.visibility == View.VISIBLE
        val chatParams = chatPanel.layoutParams as LinearLayout.LayoutParams
        val webParams = webPanel.layoutParams as LinearLayout.LayoutParams
        if (isPortrait()) {
            chatParams.weight = 2f
            webParams.weight = 3f
            chatPanel.visibility = if (portalWide && portalOpen) View.GONE else View.VISIBLE
        } else {
            chatParams.weight = 1f
            webParams.weight = if (portalWide) 2f else 1f
            chatPanel.visibility = View.VISIBLE
        }
        chatPanel.layoutParams = chatParams
        webPanel.layoutParams = webParams
    }

    /** Upright phone: address bar goes on its own row under the buttons (not enough width). */
    private fun placeUrlPill(portrait: Boolean) {
        val pill = findViewById<View>(R.id.urlPill)
        val buttonRow = findViewById<LinearLayout>(R.id.toolbarRow)
        val urlRow = findViewById<LinearLayout>(R.id.urlRow)
        val target = if (portrait) urlRow else buttonRow
        if (pill.parent !== target) {
            (pill.parent as? ViewGroup)?.removeView(pill)
            if (portrait) {
                val params = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(32))
                params.setMargins(dp(3), 0, dp(3), 0)
                urlRow.addView(pill, params)
            } else {
                val params = LinearLayout.LayoutParams(0, dp(32), 1f)
                params.setMargins(dp(4), 0, dp(4), 0)
                buttonRow.addView(pill, 3, params)
            }
        }
        urlRow.visibility = if (portrait) View.VISIBLE else View.GONE
    }

    private fun applyOrientation() {
        placeUrlPill(isPortrait())
        applyPanelLayout()
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        applyOrientation()
    }

    private fun updateAddressBar(url: String?) {
        if (url.isNullOrEmpty()) return
        urlText.text = url
        lockIcon.visibility = if (url.startsWith("https://")) View.VISIBLE else View.GONE
    }

    private fun openExternal(url: String?) {
        if (url.isNullOrEmpty()) return
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (e: ActivityNotFoundException) {
            Toast.makeText(this, "Browser nahi mila", Toast.LENGTH_SHORT).show()
        }
    }

    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        when {
            sidebar.visibility == View.VISIBLE -> sidebar.visibility = View.GONE
            webPanel.visibility == View.VISIBLE ->
                if (portalWebView.canGoBack()) portalWebView.goBack() else closePortal()
            else -> super.onBackPressed()
        }
    }

    companion object {
        /** Turns the default mobile WebView user agent into a desktop Linux Chrome one. */
        private fun desktopUserAgent(ua: String): String =
            ua
                .replace(Regex("""\(Linux; Android[^)]*\)"""), "(X11; Linux x86_64)")
                .replace(" Mobile", "")

        /** Forces a laptop-width layout (1280 px) so sites do not switch to mobile view. */
        private const val DESKTOP_VIEWPORT_JS = """
            (function() {
                var m = document.querySelector('meta[name=viewport]');
                if (!m) {
                    m = document.createElement('meta');
                    m.setAttribute('name', 'viewport');
                    (document.head || document.documentElement).appendChild(m);
                }
                m.setAttribute('content', 'width=1280');
            })();
        """
    }
}
