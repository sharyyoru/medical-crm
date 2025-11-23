"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatConversation = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

function formatConversationTitle(conversation: ChatConversation): string {
  const raw = (conversation.title || "").trim();
  if (raw) return raw;
  return "Untitled chat";
}

export default function ChatWithAliicePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null,
  );
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(
    null,
  );
  const [initialMessagesLoading, setInitialMessagesLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUserAndConversations() {
      try {
        setConversationsLoading(true);
        setConversationsError(null);

        const { data, error: authError } = await supabaseClient.auth.getUser();

        if (!isMounted) return;

        if (authError || !data?.user) {
          setCurrentUserId(null);
          setConversations([]);
          setConversationsLoading(false);
          return;
        }

        const authUser = data.user;
        setCurrentUserId(authUser.id);

        const { data: rows, error } = await supabaseClient
          .from("chat_conversations")
          .select("id, title, created_at, updated_at")
          .eq("user_id", authUser.id)
          .order("updated_at", { ascending: false });

        if (!isMounted) return;

        if (error || !rows) {
          setConversations([]);
          setConversationsError(error?.message ?? "Failed to load conversations.");
        } else {
          const items = (rows as any[]).map((row) => ({
            id: row.id as string,
            title: (row.title as string | null) ?? null,
            created_at: row.created_at as string,
            updated_at: row.updated_at as string,
          }));
          setConversations(items);
          if (items.length > 0) {
            setActiveConversationId(items[0].id);
          }
        }

        setConversationsLoading(false);
      } catch {
        if (!isMounted) return;
        setConversations([]);
        setConversationsError("Failed to load conversations.");
        setConversationsLoading(false);
      }
    }

    void loadUserAndConversations();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;

    async function loadMessages() {
      try {
        setInitialMessagesLoading(true);

        const { data, error } = await supabaseClient
          .from("chat_messages")
          .select("id, role, content, created_at")
          .eq("conversation_id", activeConversationId)
          .order("created_at", { ascending: true });

        if (!isMounted) return;

        if (error || !data) {
          setMessages([]);
        } else {
          const rows = data as any[];
          const mapped: ChatMessage[] = rows.map((row) => {
            const roleValue = row.role as "user" | "assistant" | "system";
            const safeRole: "user" | "assistant" =
              roleValue === "user" ? "user" : "assistant";
            return {
              id: row.id as string,
              role: safeRole,
              content: (row.content as string) ?? "",
            };
          });
          setMessages(
            mapped.filter((message) => message.content.trim().length > 0),
          );
        }

        setInitialMessagesLoading(false);
      } catch {
        if (!isMounted) return;
        setMessages([]);
        setInitialMessagesLoading(false);
      }
    }

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [activeConversationId]);

  async function ensureConversation(
    firstMessageContent: string,
  ): Promise<string | null> {
    if (activeConversationId) {
      return activeConversationId;
    }
    if (!currentUserId) {
      return null;
    }

    const titleSource = firstMessageContent.trim();
    const title =
      titleSource.length > 0 ? titleSource.slice(0, 80) : "New chat";

    const { data, error } = await supabaseClient
      .from("chat_conversations")
      .insert({
        user_id: currentUserId,
        title,
      })
      .select("id, title, created_at, updated_at")
      .single();

    if (error || !data) {
      setError(error?.message ?? "Failed to create conversation.");
      return null;
    }

    const row = data as any;
    const conversationId = row.id as string;

    const conversation: ChatConversation = {
      id: conversationId,
      title: (row.title as string | null) ?? null,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };

    setConversations((prev) => [conversation, ...prev]);
    setActiveConversationId(conversationId);

    return conversationId;
  }

  async function handleStartNewConversation() {
    if (!currentUserId || loading) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabaseClient
        .from("chat_conversations")
        .insert({
          user_id: currentUserId,
          title: "New chat",
        })
        .select("id, title, created_at, updated_at")
        .single();

      if (error || !data) {
        setError(error?.message ?? "Failed to create conversation.");
        setLoading(false);
        return;
      }

      const row = data as any;

      const conversation: ChatConversation = {
        id: row.id as string,
        title: (row.title as string | null) ?? null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      };

      setConversations((prev) => [conversation, ...prev]);
      setActiveConversationId(conversation.id);
      setMessages([]);
      setLoading(false);
    } catch {
      setError("Failed to create conversation.");
      setLoading(false);
    }
  }

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

    let conversationId = activeConversationId;

    if (!conversationId && currentUserId) {
      conversationId = await ensureConversation(trimmed);
      if (!conversationId) {
        setLoading(false);
        return;
      }
    }

    if (conversationId) {
      try {
        const { error: insertError } = await supabaseClient
          .from("chat_messages")
          .insert({
            conversation_id: conversationId,
            role: "user",
            content: trimmed,
          });

        if (insertError) {
          console.error("Failed to save user message", insertError);
        }
      } catch (saveError) {
        console.error("Failed to save user message", saveError);
      }
    }

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

      if (conversationId) {
        try {
          const nowIso = new Date().toISOString();

          const { error: insertError } = await supabaseClient
            .from("chat_messages")
            .insert({
              conversation_id: conversationId,
              role: "assistant",
              content: assistantMessage.content,
            });

          if (insertError) {
            console.error("Failed to save assistant message", insertError);
          }

          const { error: updateError } = await supabaseClient
            .from("chat_conversations")
            .update({
              updated_at: nowIso,
            })
            .eq("id", conversationId);

          if (updateError) {
            console.error("Failed to update conversation", updateError);
          }

          setConversations((prev) => {
            const items = prev.filter((item) => item.id !== conversationId);
            const existing = prev.find((item) => item.id === conversationId);
            const base: ChatConversation =
              existing ??
              {
                id: conversationId,
                title: null,
                created_at: nowIso,
                updated_at: nowIso,
              };

            const nextTitle =
              (base.title && base.title.trim().length > 0
                ? base.title
                : userMessage.content.slice(0, 80)) || "New chat";

            const updated: ChatConversation = {
              ...base,
              title: nextTitle,
              updated_at: nowIso,
            };

            return [updated, ...items];
          });
        } catch (saveError) {
          console.error("Failed to save assistant message", saveError);
        }
      }

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
      <div className="flex items-center justify-between text-[12px] text-slate-600">
        <div className="flex items-center gap-2">
          <span>Conversation</span>
          {conversationsLoading ? (
            <span className="text-slate-400">Loading...</span>
          ) : conversations.length === 0 ? (
            <span className="text-slate-400">No saved conversations yet</span>
          ) : (
            <select
              value={activeConversationId ?? (conversations[0]?.id ?? "")}
              onChange={(event) => {
                const value = event.target.value;
                setActiveConversationId(value || null);
              }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[12px] text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {conversations.map((conversation) => (
                <option key={conversation.id} value={conversation.id}>
                  {formatConversationTitle(conversation)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={handleStartNewConversation}
          disabled={loading || !currentUserId}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          New chat
        </button>
      </div>
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-4 text-sm shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex-1 min-h-[220px] max-h-[440px] space-y-2 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-[13px]">
          {initialMessagesLoading ? (
            <p className="text-[12px] text-slate-500">Loading conversation...</p>
          ) : messages.length === 0 ? (
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

        {(error || conversationsError) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error || conversationsError}
          </div>
        )}
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
            disabled={loading || !input.trim() || initialMessagesLoading}
            className="inline-flex items-center justify-center rounded-full border border-sky-500 bg-sky-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
