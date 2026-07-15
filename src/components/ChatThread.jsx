import { Component, useEffect, useRef, useState } from "react";
import { T, FONT_D, FONT_B } from "../lib/theme";
import { api } from "../lib/api";
import { Btn, Card, Empty } from "./atoms";

function fmtTime(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

class ChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  render() {
    if (this.state.err) {
      return (
        <Card>
          <Empty
            icon="💬"
            title="Chat failed to load"
            sub={this.state.err?.message || "Refresh the page and try again."}
          />
        </Card>
      );
    }
    return this.props.children;
  }
}

function ChatThreadInner({
  variant = "client",
  clientId,
  staffId,
  myId,
  peerLabel,
  toast,
  onUnreadChange,
  compact = false,
}) {
  const [messages, setMessages] = useState([]);
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef(null);
  const onUnreadRef = useRef(onUnreadChange);
  onUnreadRef.current = onUnreadChange;

  const isStaffVariant = variant === "staff";
  // Client thread: keyed by clientId (client omits it → uses own session).
  // Staff thread: keyed by staffId (staff omits it → uses own session).
  const listArgs = isStaffVariant
    ? staffId
      ? { staffId }
      : {}
    : clientId
    ? { clientId }
    : {};
  const threadKey = isStaffVariant ? staffId || myId : clientId || myId;

  const chatApi = isStaffVariant
    ? {
        list: (a) => api.listStaffMessages(a),
        send: (a) => api.sendStaffMessage(a),
        markRead: (a) => api.markStaffRead(a),
        subscribe: (id, cbs) => api.subscribeStaffChat(id, cbs),
        sendArgs: (bodyText) => ({ body: bodyText, staffId }),
      }
    : {
        list: (a) => api.listChatMessages(a),
        send: (a) => api.sendChatMessage(a),
        markRead: (a) => api.markChatRead(a),
        subscribe: (id, cbs) => api.subscribeChat(id, cbs),
        sendArgs: (bodyText) => ({ body: bodyText, clientId }),
      };

  const mergeMsg = (row) => {
    if (!row?.id) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === row.id)) {
        return prev.map((m) => (m.id === row.id ? { ...m, ...row } : m));
      }
      return [...prev, row].sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || ""))
      );
    });
  };

  useEffect(() => {
    let cancelled = false;
    let pollId = null;
    let unsub = () => {};

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await Promise.race([
          chatApi.list(listArgs),
          new Promise((resolve) =>
            setTimeout(() => resolve({ error: "Chat request timed out. Is the API running?" }), 12000)
          ),
        ]);
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setAgent(data.agent || data.peer || null);
        if (typeof onUnreadRef.current === "function") onUnreadRef.current(data.unread || 0);
        setLoading(false);
        chatApi.markRead(listArgs).then(() => {
          if (!cancelled && typeof onUnreadRef.current === "function") onUnreadRef.current(0);
        }).catch(() => {});
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load messages");
          setLoading(false);
        }
      }
    })();

    try {
      unsub = chatApi.subscribe(threadKey, {
        onInsert: (row) => {
          mergeMsg(row);
          if (row.senderId !== myId) {
            chatApi.markRead(listArgs).catch(() => {});
            if (typeof onUnreadRef.current === "function") onUnreadRef.current(0);
          }
        },
        onUpdate: (row) => mergeMsg(row),
      });
    } catch {
      unsub = () => {};
    }

    pollId = setInterval(async () => {
      try {
        const data = await chatApi.list(listArgs);
        if (cancelled || data.error) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        if (data.agent || data.peer) setAgent(data.agent || data.peer);
      } catch {
        /* keep last good state */
      }
    }, 10000);

    return () => {
      cancelled = true;
      try {
        unsub();
      } catch {
        /* ignore */
      }
      if (pollId) clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, staffId, myId, threadKey, variant]);

  useEffect(() => {
    try {
      bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    } catch {
      /* ignore */
    }
  }, [messages.length]);

  const send = async () => {
    const text = draft.trim();
    if (!text) {
      toast?.("Write a message first", "info");
      return;
    }
    setSending(true);
    try {
      const r = await chatApi.send(chatApi.sendArgs(text));
      if (r.error) {
        toast?.(r.error, "info");
        return;
      }
      setDraft("");
      if (r.message) mergeMsg(r.message);
      if (r.agent) setAgent(r.agent);
    } catch (e) {
      toast?.(e?.message || "Could not send", "info");
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!sending) send();
    }
  };

  const headerName =
    peerLabel ||
    agent?.name ||
    agent?.email ||
    (isStaffVariant ? "Admin / Support" : clientId ? "Client" : "Your BDM");

  return (
    <Card
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: compact ? 360 : 480,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "14px 16px",
          borderBottom: `1px solid ${T.line}`,
          background: T.surface2,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 800, color: T.faint, letterSpacing: ".6px" }}>
          CHAT
        </div>
        <div style={{ fontFamily: FONT_D, fontSize: 16, fontWeight: 800, marginTop: 2 }}>
          {headerName}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 200,
          overflowY: "auto",
          padding: "16px 14px",
          background: `linear-gradient(180deg, ${T.surface} 0%, ${T.surface2} 100%)`,
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", color: T.faint, fontSize: 13, padding: 28 }}>
            Loading messages…
          </div>
        ) : error ? (
          <Empty icon="💬" title="Chat unavailable" sub={error} />
        ) : messages.length === 0 ? (
          <Empty
            icon="💬"
            title="No messages yet"
            sub="Say hello — your message starts this thread."
          />
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myId;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    maxWidth: "78%",
                    padding: "10px 13px",
                    borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: mine ? T.brand : "#fff",
                    color: mine ? "#fff" : T.ink,
                    boxShadow: "0 1px 2px rgba(0,0,0,.06)",
                    border: mine ? "none" : `1px solid ${T.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.45,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.body}
                  </div>
                  <div
                    style={{
                      fontSize: 10.5,
                      marginTop: 5,
                      opacity: mine ? 0.75 : 1,
                      color: mine ? "#fff" : T.faint,
                      textAlign: "right",
                    }}
                  >
                    {fmtTime(m.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          padding: "12px 14px",
          borderTop: `1px solid ${T.line}`,
          display: "flex",
          gap: 10,
          alignItems: "stretch",
          background: T.surface,
          flexShrink: 0,
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          onKeyDown={onKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={2}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 12,
            border: `1.5px solid ${T.line}`,
            background: T.surface2,
            color: T.ink,
            fontSize: 13.5,
            fontFamily: FONT_B,
            resize: "none",
            boxSizing: "border-box",
          }}
        />
        <Btn
          onClick={send}
          disabled={sending || !draft.trim()}
          style={{ flexShrink: 0, height: "auto", alignSelf: "stretch" }}
        >
          {sending ? "…" : "Send"}
        </Btn>
      </div>
    </Card>
  );
}

/** Shared client↔BDM chat thread (error-boundary wrapped). */
export default function ChatThread(props) {
  return (
    <ChatErrorBoundary>
      <ChatThreadInner {...props} />
    </ChatErrorBoundary>
  );
}
