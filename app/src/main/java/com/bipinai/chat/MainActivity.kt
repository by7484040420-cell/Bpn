package com.bipinai.chat

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.os.Bundle
import android.view.View
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

class MainActivity : AppCompatActivity() {

    /** One entry in the service strip (Home has service == null). */
    private data class NavItem(val icon: String, val label: String, val service: GovtService?)

    private val messages = mutableListOf<ChatMessage>()
    private lateinit var chatAdapter: ChatAdapter
    private lateinit var chatRecycler: RecyclerView
    private lateinit var messageInput: EditText

    private lateinit var topBar: View
    private lateinit var chatPanel: View
    private lateinit var webPanel: View
    private lateinit var chatPeek: View
    private lateinit var portalWebView: WebView
    private lateinit var webProgress: ProgressBar
    private lateinit var tabTitle: TextView
    private lateinit var urlText: TextView
    private lateinit var lockIcon: ImageView
    private lateinit var btnToggleSize: ImageButton

    private val navViews = mutableListOf<Pair<NavItem, View>>()
    private var activeService: GovtService? = null
    private var portalFullscreen = false

    // DEMO ONLY. In the real app this comes from the logged-in user's own
    // profile (stored securely) — NEVER hardcode real user data like this.
    private val userProfile = mapOf("mobile" to "9999999999")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        topBar = findViewById(R.id.topBar)
        setupChat()
        setupServiceNav()
        setupWebPanel()

        addMessage(
            ChatMessage(
                text = "Namaste! Main BIPIN AI hoon. Kaun si sarkari service mein madad chahiye? " +
                    "Service chuniye ya likhiye, jaise \"Mujhe PAN card banana hai\".",
                isFromUser = false
            )
        )
    }

    // ------------------------------------------------------------------ chat

    private fun setupChat() {
        chatPanel = findViewById(R.id.chatPanel)
        chatRecycler = findViewById(R.id.chatRecyclerView)
        messageInput = findViewById(R.id.messageInput)

        chatAdapter = ChatAdapter(messages) { service -> openPortal(service) }
        chatRecycler.layoutManager = LinearLayoutManager(this)
        chatRecycler.adapter = chatAdapter

        findViewById<View>(R.id.sendButton).setOnClickListener { sendUserMessage() }
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

    // ----------------------------------------------------------- service strip

    private fun setupServiceNav() {
        val container = findViewById<LinearLayout>(R.id.serviceList)
        val items = listOf(NavItem("🏠", "Home", null)) +
            GovtService.entries.map { NavItem(it.icon, it.shortName, it) }

        for (item in items) {
            val view = layoutInflater.inflate(R.layout.item_service_chip, container, false)
            view.findViewById<TextView>(R.id.serviceIcon).text = item.icon
            view.findViewById<TextView>(R.id.serviceLabel).text = item.label
            view.setOnClickListener { onNavClick(item) }
            container.addView(view)
            navViews.add(item to view)
        }
        highlightNav(null)
    }

    private fun highlightNav(service: GovtService?) {
        for ((item, view) in navViews) {
            view.isSelected = (item.service == service)
        }
    }

    private fun onNavClick(item: NavItem) {
        val service = item.service
        if (service == null) {
            closePortal()
            return
        }
        // Make sure the chat is visible so the person sees the reply.
        if (webPanel.visibility == View.VISIBLE) setPortalFullscreen(false)
        highlightNav(service)
        addMessage(service.toChatMessage())
    }

    // ------------------------------------------------------------ portal panel

    private fun setupWebPanel() {
        webPanel = findViewById(R.id.webPanel)
        chatPeek = findViewById(R.id.chatPeek)
        portalWebView = findViewById(R.id.portalWebView)
        webProgress = findViewById(R.id.webProgress)
        tabTitle = findViewById(R.id.tabTitle)
        urlText = findViewById(R.id.urlText)
        lockIcon = findViewById(R.id.lockIcon)
        btnToggleSize = findViewById(R.id.btnToggleSize)

        portalWebView.settings.javaScriptEnabled = true
        portalWebView.settings.domStorageEnabled = true // needed for OTP/session-based govt logins

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

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                updateAddressBar(url)
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
        btnToggleSize.setOnClickListener { setPortalFullscreen(!portalFullscreen) }
        chatPeek.setOnClickListener { setPortalFullscreen(false) }
    }

    private fun openPortal(service: GovtService) {
        activeService = service
        highlightNav(service)
        tabTitle.text = service.shortName
        updateAddressBar(service.url)
        webPanel.visibility = View.VISIBLE
        setPortalFullscreen(true)
        portalWebView.loadUrl(service.url)
    }

    private fun closePortal() {
        portalWebView.stopLoading()
        webPanel.visibility = View.GONE
        chatPeek.visibility = View.GONE
        chatPanel.visibility = View.VISIBLE
        topBar.visibility = View.VISIBLE
        portalFullscreen = false
        activeService = null
        highlightNav(null)
    }

    /**
     * full = true : portal takes the whole screen (header hidden, chat collapsed
     *               into a small "Ask BIPIN AI" bar at the bottom).
     * full = false: portal on top, chat below.
     */
    private fun setPortalFullscreen(full: Boolean) {
        portalFullscreen = full
        topBar.visibility = if (full) View.GONE else View.VISIBLE
        chatPanel.visibility = if (full) View.GONE else View.VISIBLE
        chatPeek.visibility = if (full) View.VISIBLE else View.GONE
        btnToggleSize.setImageResource(
            if (full) R.drawable.ic_fullscreen_exit else R.drawable.ic_fullscreen
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
        if (webPanel.visibility == View.VISIBLE) {
            if (portalWebView.canGoBack()) portalWebView.goBack() else closePortal()
        } else {
            super.onBackPressed()
        }
    }
}
