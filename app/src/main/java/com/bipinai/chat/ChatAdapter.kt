package com.bipinai.chat

import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView

class ChatAdapter(
    private val messages: MutableList<ChatMessage>,
    private val onPortalClick: (url: String, label: String) -> Unit
) : RecyclerView.Adapter<ChatAdapter.MessageViewHolder>() {

    inner class MessageViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val rowContainer: LinearLayout = view.findViewById(R.id.rowContainer)
        val avatarView: TextView = view.findViewById(R.id.avatarView)
        val bubbleContainer: LinearLayout = view.findViewById(R.id.bubbleContainer)
        val bubbleText: TextView = view.findViewById(R.id.bubbleText)
        val portalButton: Button = view.findViewById(R.id.portalButton)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): MessageViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_chat_bubble, parent, false)
        return MessageViewHolder(view)
    }

    override fun onBindViewHolder(holder: MessageViewHolder, position: Int) {
        val message = messages[position]
        holder.bubbleText.text = message.text

        val context = holder.itemView.context
        if (message.isFromUser) {
            holder.rowContainer.gravity = Gravity.END
            holder.avatarView.visibility = View.GONE
            holder.bubbleContainer.background = ContextCompat.getDrawable(context, R.drawable.bg_bubble_user)
        } else {
            holder.rowContainer.gravity = Gravity.START
            holder.avatarView.visibility = View.VISIBLE
            holder.avatarView.text = "AI"
            holder.bubbleContainer.background = ContextCompat.getDrawable(context, R.drawable.bg_bubble_ai)
        }

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
