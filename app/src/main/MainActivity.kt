package com.bipinai.chat

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.view.inputmethod.EditorInfo
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
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

/**
 * Laptop-style layout (phone held sideways):
 *   header  [menu] BIPIN AI ...................... Online
 *   left  = AI chat        right = government portal (desktop mode)
 * The service list (PAN, Aadhaar ...) slides over the left side when the
 * menu button is tapped; tapping a service opens its portal on the right.
 */
class MainActivity : AppCompatActivity() {

    /** One entry in the sidebar (Home has service == null). */
    private data class NavItem(val icon: String, val label: String, val service: GovtService?)

    private val messages = mutableListOf<ChatMessage>()
    private lateinit var chatAdapter: ChatAdapter
    private lateinit var chatRecycler: RecyclerView
    private lateinit var messageInput: EditText

    private lateinit var sidebar: View
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

    // DEMO ONLY. In the real app this comes from the logged-in user's own
    // profile (stored securely) — NEVER hardcode real user data like this.
    private val userProfile = mapOf("mobile" to "9999999999")

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
                    "Upar left ke menu se service chuniye ya likhiye, jaise \"Mujhe PAN card banana hai\".",
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

    private fun sendUserMessage() {
        val text = messageInput.text.toString().trim()
        if (text.isEmpty()) return
        addMessage(ChatMessage(text = text, isFromUser = true))
        messageInput.text.clear()

        // TODO: replace this keyword matching with your bot/LLM backend call.
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
            GovtService.entries.map { NavItem(it.icon, it.shortName, it) }

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
            view.isSelected = (item.service == service)
        }
    }

    private fun onNavClick(item: NavItem) {
        sidebar.visibility = View.GONE
        val service = item.service
        if (service == null) {
            closePortal()
            return
        }
        // AI explains on the left while the portal opens on the right.
        addMessage(service.toChatMessage())
        openPortal(service)
    }

    // ------------------------------------------------------------ portal panel

    private fun setupWebPanel() {
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
                maybeAutoFill(view, url)
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
        }

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener {
            if (portalWebView.canGoBack()) portalWebView.goBack()
        }
        findViewById<ImageButton>(R.id.btnForward).setOnClickListener {
            if (portalWebView.canGoForward()) portalWebView.goForward()
        }
        findViewById<ImageButton>(R.id.btnReload).setOnClickListener { portalWebView.reload() }
        findViewById<ImageButton>(R.id.btnCloseWeb).setOnClickListener { closePortal() }
        findViewById<ImageButton>(R.id.btnOpenExternal).setOnClickListener {
            openExternal(portalWebView.url ?: activeService?.url)
        }
        btnToggleSize.setOnClickListener { setPortalWide(!portalWide) }
    }

    private fun openPortal(service: GovtService) {
        activeService = service
        highlightNav(service)
        tabTitle.text = service.shortName
        updateAddressBar(service.url)
        webPanel.visibility = View.VISIBLE
        panelDivider.visibility = View.VISIBLE
        portalWebView.loadUrl(service.url)
    }

    private fun closePortal() {
        portalWebView.stopLoading()
        webPanel.visibility = View.GONE
        panelDivider.visibility = View.GONE
        activeService = null
        highlightNav(null)
    }

    /** false = chat and portal share the screen 50/50, true = portal gets two thirds. */
    private fun setPortalWide(wide: Boolean) {
        portalWide = wide
        val params = webPanel.layoutParams as LinearLayout.LayoutParams
        params.weight = if (wide) 2f else 1f
        webPanel.layoutParams = params
        btnToggleSize.setImageResource(
            if (wide) R.drawable.ic_fullscreen_exit else R.drawable.ic_fullscreen
        )
    }

    private fun updateAddressBar(url: String?) {
        if (url.isNullOrEmpty()) return
        urlText.text = url
        lockIcon.visibility = if (url.startsWith("https://")) View.VISIBLE else View.GONE
    }

    /**
     * Auto-fill only runs while the page is still on the SAME host as the
     * selected service, so the user's data is never injected into other sites.
     */
    private fun maybeAutoFill(view: WebView?, url: String?) {
        val service = activeService ?: return
        if (view == null || url == null || service.fieldMap.isEmpty()) return
        if (Uri.parse(url).host != Uri.parse(service.url).host) return
        FormAutoFiller.fillTextFields(view, userProfile, service.fieldMap)
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
