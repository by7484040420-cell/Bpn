package com.bipinai.chat

import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.ImageButton
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView

class MainActivity : AppCompatActivity() {

    private lateinit var chatAdapter: ChatAdapter
    private val messages = mutableListOf<ChatMessage>()

    private lateinit var webPanel: View
    private lateinit var portalWebView: WebView
    private lateinit var webProgress: ProgressBar
    private lateinit var urlLabel: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        setupChat()
        setupWebPanel()

        // All services from the sidebar (PAN, Income Tax, Aadhaar, Driving
        // License, Ration Card, Scholarship) — real govt URLs, see GovtService.kt.
        // In the real app, your bot/LLM decides WHICH single service to show
        // based on what the user typed; this seeds all of them for the demo.
        GovtService.seedMessages().forEach { chatAdapter.addMessage(it) }

        // Example user profile data for auto-fill. In the real app this comes
        // from wherever you store the logged-in user's own details —
        // NEVER hardcode a real user's data like this.
        userProfile = mapOf(
            "mobile" to "9999999999"
            // "aadhaar" intentionally left out of this demo — see README
            // for why Aadhaar number needs extra handling.
        )
    }

    private lateinit var userProfile: Map<String, String>
    private var activeService: GovtService? = null

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

        portalWebView.settings.javaScriptEnabled = true
        portalWebView.settings.domStorageEnabled = true // needed for OTP/session-based govt logins

        portalWebView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                urlLabel.text = url

                // Auto-fill only the TEXT fields we have a verified selector for.
                // CAPTCHA/OTP/login steps are always left for the user.
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

    /** Opens the given government portal URL in the right-side panel. */
    private fun openPortal(url: String, label: String) {
        urlLabel.text = label
        webPanel.visibility = View.VISIBLE
        portalWebView.loadUrl(url)
    }

    private fun closePortal() {
        portalWebView.stopLoading()
        webPanel.visibility = View.GONE
    }

    override fun onBackPressed() {
        // If the portal panel is open and has history, navigate it back first
        // instead of exiting the activity.
        if (webPanel.visibility == View.VISIBLE && portalWebView.canGoBack()) {
            portalWebView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
