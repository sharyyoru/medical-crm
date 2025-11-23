"use client";

import { FormEvent, useState } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatWithAliicePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        setError(payload?.error ?? "Failed to get a response from Aliice.");
        setLoading(false);
        return;
      }

      const json = (await response.json()) as {
        message?: { role?: string; content?: string };
      };

      if (!json.message || !json.message.content) {
        setError("Aliice did not return a response.");
        setLoading(false);
        return;
      }

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: json.message.content,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setLoading(false);
    } catch {
      setError("Network error talking to Aliice.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Chat with Aliice</h1>
        <p className="text-sm text-slate-500">
          Your AI assistant for bookings, post-op docs, and patient or insurance
          communication.
        </p>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex-1 min-h-[220px] max-h-[440px] space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-[13px]">
          {messages.length === 0 ? (
            <p className="text-[12px] text-slate-500">
              Start a conversation with Aliice about bookings, post-op docs, or
              how to communicate with patients and insurers.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={
                  "flex " +
                  (message.role === "user"
                    ? "justify-end text-right"
                    : "justify-start text-left")
                }
              >
                <div
                  className={
                    "inline-block max-w-[80%] rounded-2xl px-3 py-2 text-[12px] " +
                    (message.role === "user"
                      ? "bg-sky-600 text-white"
                      : "bg-slate-100 text-slate-900")
                  }
                >
                  {message.content}
                </div>
              </div>
            ))
          )}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="flex items-end gap-2 pt-1">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Ask Aliice a question..."
            className="flex-1 resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[13px] text-slate-900 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
