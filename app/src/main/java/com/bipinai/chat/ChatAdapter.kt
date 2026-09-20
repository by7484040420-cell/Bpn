package com.bipinai.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

/**
 * onPortalClick is called with the URL + label whenever the user taps a
 * portal button inside a bubble (e.g. "Open PAN Portal").
 * MainActivity uses this callback to open the right-side WebView panel.
 */
class ChatAdapter(
    private val messages: MutableList<ChatMessage>,
    private val onPortalClick: (url: String, label: String) -> Unit
) : RecyclerView.Adapter<ChatAdapter.MessageViewHolder>() {

    inner class MessageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val bubbleText: TextView = view.findViewById(R.id.bubbleText)
        val portalButton: Button = view.findViewById(R.id.portalButton)
        val container: LinearLayout = view.findViewById(R.id.bubbleContainer)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_chat_bubble, parent, false)
        return MessageViewHolder(view)
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        val message = messages[position]
        holder.bubbleText.text = message.text

        // Align bubble left/right depending on sender
        val params = holder.container.layoutParams as ViewGroup.MarginLayoutParams
        holder.container.gravity = if (message.isFromUser)
            android.view.Gravity.END else android.view.Gravity.START

        if (message.portalUrl != null) {
            holder.portalButton.visibility = View.VISIBLE
            holder.portalButton.text = message.portalLabel ?: "Open Portal"
            holder.portalButton.setOnClickListener {
                onPortalClick(message.portalUrl, message.portalLabel ?: "Portal")
            }
        } else {
            holder.portalButton.visibility = View.GONE
        }
    }

    override fun getItemCount() = messages.size

    fun addMessage(message: ChatMessage) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }
}
