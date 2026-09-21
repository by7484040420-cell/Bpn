"use client";

import { useState } from "react";

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Namaste! Main Bipin AI hoon 🤖 — job, admit card, result ya documents, kuchh bhi poochho." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: newMessages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages([...newMessages, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", text: "Abhi AI se connect nahi ho paya. Thodi der me try karo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-card flex flex-col h-[70vh]">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "bg-navy text-white self-end rounded-br-sm"
                : "bg-slate-100 text-slate-700 self-start rounded-bl-sm"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="bg-slate-100 text-slate-400 text-sm rounded-2xl px-4 py-2.5 self-start">
            Typing…
          </div>
        )}
      </div>
      <form onSubmit={sendMessage} className="border-t border-slate-100 p-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Apna sawaal likho…"
          className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-sm outline-none"
        />
        <button
          disabled={loading}
          className="bg-navy text-white rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          Bhejo
        </button>
      </form>
    </div>
  );
}
