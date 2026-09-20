package com.bipinai.chat

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * One chat bubble.
 * - service != null -> the bubble shows an "Open <service>" button that
 *   opens that portal in the portal panel when tapped.
 */
data class ChatMessage(
    val id: Long = System.nanoTime(),
    val text: String,
    val isFromUser: Boolean,
    val service: GovtService? = null,
    val time: String = SimpleDateFormat("hh:mm a", Locale.getDefault()).format(Date())
)
