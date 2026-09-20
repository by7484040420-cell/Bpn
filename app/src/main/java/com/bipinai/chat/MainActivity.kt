package com.bipinai.chat

import android.net.Uri
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageButton
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.GravityCompat
import androidx.drawerlayout.widget.DrawerLayout
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class MainActivity : AppCompatActivity() {

    private lateinit var chatAdapter: ChatAdapter
    private val messages = mutableListOf<ChatMessage>()

    private lateinit var drawerLayout: DrawerLayout
    private lateinit var webPanel: View
    private lateinit var portalWebView: WebView
    private lateinit var webProgress: ProgressBar
    private lateinit var urlLabel: TextView
    private lateinit var domainLabel: TextView

    private lateinit var userProfile: Map<String, String>
    private var activeService: GovtService? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        drawerLayout = findViewById(R.id.drawerLayout)

        setupHeader()
        setupSidebar()
        setupChat()
        setupWebPanel()

        // Initial AI greeting, same as the reference screenshot.
        chatAdapter.addMessage(
            ChatMessage(text = "Ask me anything, I'm here to help!", isFromUser = false)
        )

        // Example user profile data for auto-fill. In the real app this comes
        // from wherever you store the logged-in user's own details —
        // NEVER hardcode a real user's data like this.
        userProfile = mapOf("mobile" to "9999999999")
    }

    private fun setupHeader() {
        findViewById<ImageButton>(R.id.btnMenu).setOnClickListener {
            drawerLayout.openDrawer(GravityCompat.START)
        }
    }

    /** Builds the sidebar list from GovtService — tapping an item opens that portal directly. */
    private fun setupSidebar() {
        val container = findViewById<LinearLayout>(R.id.sidebarItemsContainer)

        GovtService.entries.forEach { service ->
            val item = TextView(this).apply {
                text = "${service.icon}  ${service.displayName}"
                setTextColor(getColor(R.color.text_primary))
                textSize = 14f
                gravity = Gravity.CENTER_VERTICAL
                setPadding(16.dp(), 14.dp(), 16.dp(), 14.dp())
                background = run {
                    val typedValue = android.util.TypedValue()
                    theme.resolveAttribute(android.R.attr.selectableItemBackground, typedValue, true)
                    androidx.core.content.ContextCompat.getDrawable(this@MainActivity, typedValue.resourceId)
                }
                setOnClickListener {
                    drawerLayout.closeDrawer(GravityCompat.START)
                    // Post a chat message + open the portal, same flow as tapping
                    // a portal button inside the chat.
                    chatAdapter.addMessage(
                        ChatMessage(
                            text = "${service.displayName}: ${service.note}",
                            isFromUser = false,
                            portalUrl = service.url,
                            portalLabel = "Open ${service.displayName}"
                        )
                    )
                    activeService = service
                    openPortal(service.url, service.displayName)
                }
            }
            container.addView(item)
        }
    }

    private fun Int.dp(): Int = (this * resources.displayMetrics.density).toInt()

    private fun setupChat() {
        val recyclerView = findViewById<RecyclerView>(R.id.chatRecyclerView)
        chatAdapter = ChatAdapter(messages) { url, label ->
            activeService = GovtService.entries.find { it.url == url }
            openPortal(url, label)
        }
        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = chatAdapter

        findViewById<View>(R.id.sendButton).setOnClickListener {
            val input = findViewById<android.widget.EditText>(R.id.messageInput)
            val text = input.text.toString().trim()
            if (text.isNotEmpty()) {
                chatAdapter.addMessage(ChatMessage(text = text, isFromUser = true))
                input.text.clear()
                // TODO: send `text` to your bot/LLM backend and add its reply
                // via chatAdapter.addMessage(...) when the response arrives.
            }
        }
    }

    private fun setupWebPanel() {
        webPanel = findViewById(R.id.webPanel)
        portalWebView = findViewById(R.id.portalWebView)
        webProgress = findViewById(R.id.webProgress)
        urlLabel = findViewById(R.id.urlLabel)
        domainLabel = findViewById(R.id.domainLabel)

        portalWebView.settings.javaScriptEnabled = true
        portalWebView.settings.domStorageEnabled = true // needed for OTP/session-based govt logins

        portalWebView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Only the short domain is shown here (e.g. "incometax.gov.in"),
                // never the full raw URL — that was the earlier bug.
                domainLabel.text = "🔒 " + (url?.let { Uri.parse(it).host } ?: "")

                val service = activeService
                if (service != null && view != null && service.fieldMap.isNotEmpty()) {
                    FormAutoFiller.fillTextFields(view, userProfile, service.fieldMap)
                }
            }
        }

        portalWebView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                webProgress.progress = newProgress
                webProgress.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
            }
        }

        findViewById<ImageButton>(R.id.btnBack).setOnClickListener {
            if (portalWebView.canGoBack()) portalWebView.goBack()
        }
        findViewById<ImageButton>(R.id.btnForward).setOnClickListener {
            if (portalWebView.canGoForward()) portalWebView.goForward()
        }
        findViewById<ImageButton>(R.id.btnReload).setOnClickListener {
            portalWebView.reload()
        }
        findViewById<ImageButton>(R.id.btnCloseWeb).setOnClickListener {
            closePortal()
        }
    }

    /** Opens the given government portal URL in the panel. Shows only the service name — not the raw URL. */
    private fun openPortal(url: String, label: String) {
        urlLabel.text = label
        webPanel.visibility = View.VISIBLE

        val webParams = webPanel.layoutParams as LinearLayout.LayoutParams
        webParams.height = 0
        webParams.weight = 2f
        webPanel.layoutParams = webParams

        portalWebView.loadUrl(url)
    }

    private fun closePortal() {
        portalWebView.stopLoading()
        webPanel.visibility = View.GONE
        val webParams = webPanel.layoutParams as LinearLayout.LayoutParams
        webParams.weight = 0f
        webPanel.layoutParams = webParams
    }

    override fun onBackPressed() {
        when {
            drawerLayout.isDrawerOpen(GravityCompat.START) -> drawerLayout.closeDrawer(GravityCompat.START)
            webPanel.visibility == View.VISIBLE && portalWebView.canGoBack() -> portalWebView.goBack()
            else -> super.onBackPressed()
        }
    }
}
