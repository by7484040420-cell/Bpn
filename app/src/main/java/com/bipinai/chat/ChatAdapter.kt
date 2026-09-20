package com.bipinai.chat

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

/**
 * Two bubble styles: AI (left, avatar, optional portal button) and user (right).
 * onPortalClick is called with the service whenever the user taps the
 * "Open ..." button inside an AI bubble.
 */
class ChatAdapter(
    private val messages: MutableList<ChatMessage>,
    private val onPortalClick: (GovtService) -> Unit
) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

    private class AiViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val bubbleText: TextView = view.findViewById(R.id.bubbleText)
        val timeText: TextView = view.findViewById(R.id.timeText)
        val portalButton: Button = view.findViewById(R.id.portalButton)
    }

    private class UserViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val bubbleText: TextView = view.findViewById(R.id.bubbleText)
        val timeText: TextView = view.findViewById(R.id.timeText)
    }

    override fun getItemViewType(position: Int): Int =
        if (messages[position].isFromUser) TYPE_USER else TYPE_AI

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
        val inflater = LayoutInflater.from(parent.context)
        return if (viewType == TYPE_USER) {
            UserViewHolder(inflater.inflate(R.layout.item_message_user, parent, false))
        } else {
            AiViewHolder(inflater.inflate(R.layout.item_message_ai, parent, false))
        }
    }

    override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
        val message = messages[position]
        if (holder is UserViewHolder) {
            holder.bubbleText.text = message.text
            holder.timeText.text = message.time
        } else if (holder is AiViewHolder) {
            holder.bubbleText.text = message.text
            holder.timeText.text = message.time
            val service = message.service
            if (service != null) {
                holder.portalButton.visibility = View.VISIBLE
                holder.portalButton.text = "Open ${service.shortName} ↗"
                holder.portalButton.setOnClickListener { onPortalClick(service) }
            } else {
                holder.portalButton.visibility = View.GONE
            }
        }
    }

    override fun getItemCount(): Int = messages.size

    fun addMessage(message: ChatMessage) {
        messages.add(message)
        notifyItemInserted(messages.size - 1)
    }

    companion object {
        private const val TYPE_AI = 0
        private const val TYPE_USER = 1
    }
}
