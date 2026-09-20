package com.bipinai.chat

/**
 * One chat bubble.
 * - portalUrl != null  -> bubble renders an "Open Portal" button that loads
 *   that URL in the right-side WebView panel when tapped.
 * - portalLabel        -> button text, e.g. "Open PAN Portal"
 */
data class ChatMessage(
    val id: Long = System.currentTimeMillis(),
    val text: String,
    val isFromUser: Boolean,
    val portalUrl: String? = null,
    val portalLabel: String? = null
)
