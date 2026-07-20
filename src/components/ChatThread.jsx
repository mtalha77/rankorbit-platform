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
  onOpenCall,
  compact = false,
  fill = false,
  readOnly = false,
}) {
  const [messages, setMessages] = useState([]);
  const [agent, setAgent] = useState(null);
  const [support, setSupport] = useState(false);
  const [needsBdm, setNeedsBdm] = useState(false);
  const [noPeer, setNoPeer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const bottomRef = useRef(null);
  const listRef = useRef(null);
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
        const peer = data.agent || data.peer || null;
        setAgent(peer);
        setSupport(!!data.support || data.kind === "support");
        setNeedsBdm(!!data.needsBdm);
        setNoPeer(!peer && !isStaffVariant);
        if (typeof onUnreadRef.current === "function") onUnreadRef.current(data.unread || 0);
        setLoading(false);
        if (!readOnly) {
          chatApi.markRead(listArgs).then(() => {
            if (!cancelled && typeof onUnreadRef.current === "function") onUnreadRef.current(0);
          }).catch(() => {});
        }

        // SA↔SA uses a canonical DB staffId (min of pair) — subscribe on that, not the peer UI id.
        const subId = data.threadStaffId || threadKey;
        const expectPeerId = data.threadPeerId || null;
        try {
          unsub = chatApi.subscribe(subId, {
            onInsert: (row) => {
              if (expectPeerId && row.peerId !== expectPeerId) return;
              if (!expectPeerId && row.peerId) return;
              mergeMsg(row);
              if (row.senderId !== myId && !readOnly) {
                chatApi.markRead(listArgs).catch(() => {});
                if (typeof onUnreadRef.current === "function") onUnreadRef.current(0);
              }
            },
            onUpdate: (row) => {
              if (expectPeerId && row.peerId !== expectPeerId) return;
              if (!expectPeerId && row.peerId) return;
              mergeMsg(row);
            },
          });
          if (cancelled) {
            unsub();
            unsub = () => {};
          }
        } catch {
          unsub = () => {};
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.message || "Could not load messages");
          setLoading(false);
        }
      }
    })();

    pollId = setInterval(async () => {
      try {
        const data = await chatApi.list(listArgs);
        if (cancelled || data.error) return;
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        const peer = data.agent || data.peer || null;
        if (peer) {
          setAgent(peer);
          setNoPeer(false);
        }
        setSupport(!!data.support || data.kind === "support");
        setNeedsBdm(!!data.needsBdm);
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
  }, [clientId, staffId, myId, threadKey, variant, reloadKey, readOnly]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    try {
      el.scrollTop = el.scrollHeight;
    } catch {
      /* ignore */
    }
  }, [messages.length]);

  const send = async () => {
    if (readOnly) {
      toast?.("Read-only view — changes are disabled", "info");
      return;
    }
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
      if (r.agent) {
        setAgent(r.agent);
        setNoPeer(false);
      }
      setSupport(!!r.support || r.kind === "support");
      setNeedsBdm(!!r.needsBdm);
      if (r.support || r.kind === "support") {
        toast?.("Sent — a team member will reply shortly", "success");
      }
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
    (support && !isStaffVariant
      ? agent?.name || "Team support"
      : agent?.name || agent?.email) ||
    (isStaffVariant ? "Admin / Support" : clientId ? "Client" : "Your BDM");

  const cardHeight = fill
    ? "100%"
    : compact
    ? "min(420px, calc(100dvh - 180px))"
    : "calc(100dvh - 200px)";

  const composerBlocked = readOnly || (!isStaffVariant && noPeer);

  return (
    <Card
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        height: cardHeight,
        maxHeight: cardHeight,
        minHeight: fill ? 0 : compact ? 280 : 360,
        overflow: "hidden",
        boxSizing: "border-box",
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
          {support && !isStaffVariant ? "SUPPORT CHAT" : "CHAT"}
        </div>
        <div style={{ fontFamily: FONT_D, fontSize: 16, fontWeight: 800, marginTop: 2 }}>
          {headerName}
        </div>
        {needsBdm && !isStaffVariant && !noPeer && (
          <div style={{ fontSize: 11.5, color: T.amber, fontWeight: 700, marginTop: 6 }}>
            Your dedicated BDM is being assigned — a team member can reply in the meantime.
          </div>
        )}
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          padding: "16px 14px",
          background: `linear-gradient(180deg, ${T.surface} 0%, ${T.surface2} 100%)`,
        }}
      >
        {loading ? (
          <div style={{ textAlign: "center", color: T.faint, fontSize: 13, padding: 28 }}>
            Loading messages…
          </div>
        ) : error ? (
          <div>
            <Empty icon="💬" title="Chat unavailable" sub={error} />
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <Btn variant="soft" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Try again</Btn>
              {typeof onOpenCall === "function" && (
                <Btn size="sm" onClick={onOpenCall}>Book a Call →</Btn>
              )}
            </div>
          </div>
        ) : noPeer ? (
          <div>
            <Empty
              icon="💬"
              title="Connecting you with our team"
              sub="No BDM is free right now. Tap Try again in a moment, or book a call once someone is assigned."
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
              <Btn variant="soft" size="sm" onClick={() => setReloadKey((k) => k + 1)}>Try again</Btn>
              {typeof onOpenCall === "function" && (
                <Btn size="sm" onClick={onOpenCall}>Book a Call →</Btn>
              )}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <Empty
            icon="💬"
            title="No messages yet"
            sub={
              support
                ? "Say hello — a team member will pick this up and assign your BDM."
                : "Say hello — your message starts this thread."
            }
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
          alignItems: "center",
          background: T.surface,
          flexShrink: 0,
          opacity: composerBlocked ? 0.55 : 1,
        }}
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
          onKeyDown={onKeyDown}
          placeholder={readOnly ? "Read-only view — messaging disabled" : composerBlocked ? "Chat opens once a team member is available…" : "Type a message… (Enter to send)"}
          rows={1}
          disabled={composerBlocked}
          style={{
            flex: 1,
            height: 44,
            padding: "0 14px",
            borderRadius: 12,
            border: `1.5px solid ${T.line}`,
            background: T.surface2,
            color: T.ink,
            fontSize: 13.5,
            fontFamily: FONT_B,
            lineHeight: "44px",
            resize: "none",
            boxSizing: "border-box",
            textAlign: "left",
            overflow: "hidden",
          }}
        />
        <Btn
          onClick={send}
          disabled={composerBlocked || sending || !draft.trim()}
          style={{ flexShrink: 0, height: 44 }}
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
