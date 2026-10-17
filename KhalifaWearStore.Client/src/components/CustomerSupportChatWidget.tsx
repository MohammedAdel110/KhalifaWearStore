import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  CheckCheck,
  User,
  Minimize2,
  Radio,
} from 'lucide-react';
import type { AuthResponseDto } from '../services/authApi';
import type { SignalRConnectionStatus } from '../services/orderSignalR';
import {
  createCustomerChatConnection,
  type ChatMessageDto,
  type CustomerChatSignalRClient,
} from '../services/chatSignalR';

interface CustomerSupportChatWidgetProps {
  session: AuthResponseDto | null;
}

const GUEST_THREAD_STORAGE_KEY = 'kf_support_guest_thread_id';
const GUEST_NAME_STORAGE_KEY = 'kf_support_guest_name';

function getOrCreateGuestThreadId(): string {
  try {
    const existing = localStorage.getItem(GUEST_THREAD_STORAGE_KEY);
    if (existing) return existing;
    const generated = `guest:${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    localStorage.setItem(GUEST_THREAD_STORAGE_KEY, generated);
    return generated;
  } catch {
    return `guest:${Date.now()}`;
  }
}

function getStoredGuestName(): string {
  try {
    return localStorage.getItem(GUEST_NAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function playChatReplyPop() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  } catch {
    // Ignore audio context restrictions
  }
}

const QUICK_PROMPTS = [
  'Track my order status',
  'Sizing & fit guide for 500GSM Hoodie',
  'Delivery time & Cash on Delivery question',
  'Issue with an item / exchange request',
];

export const CustomerSupportChatWidget: React.FC<
  CustomerSupportChatWidgetProps
> = ({ session }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<SignalRConnectionStatus>('connecting');
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageInput, setMessageInput] = useState('');
  const [guestName, setGuestName] = useState<string>(() => getStoredGuestName());
  const [isEditingName, setIsEditingName] = useState(false);
  const [adminIsTyping, setAdminIsTyping] = useState(false);
  const [sending, setSending] = useState(false);
  const [latestPopupPreview, setLatestPopupPreview] =
    useState<ChatMessageDto | null>(null);

  const clientRef = useRef<CustomerChatSignalRClient | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isOpenRef = useRef(isOpen);
  const typingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
      setLatestPopupPreview(null);
      clientRef.current?.markRead();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    }
  }, [isOpen]);

  const effectiveThreadId = session?.email
    ? `user:${session.email.toLowerCase()}`
    : getOrCreateGuestThreadId();

  const effectiveCustomerName =
    session?.fullName || guestName.trim() || 'KF Guest Shopper';

  const effectiveCustomerEmail = session?.email || null;

  useEffect(() => {
    const client = createCustomerChatConnection(
      effectiveThreadId,
      effectiveCustomerName,
      effectiveCustomerEmail,
      session?.token,
      {
        onThreadHistory: (thread) => {
          setMessages(thread.messages || []);
          if (isOpenRef.current) {
            setUnreadCount(0);
            client.markRead();
          } else {
            setUnreadCount(thread.unreadForCustomerCount || 0);
          }
        },
        onReceiveMessage: (msg) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });

          if (msg.senderRole === 'Admin') {
            setAdminIsTyping(false);
            playChatReplyPop();
            if (isOpenRef.current) {
              client.markRead();
            } else {
              setUnreadCount((c) => c + 1);
              setLatestPopupPreview(msg);
            }
          }
        },
        onThreadUpdated: (thread) => {
          setMessages(thread.messages || []);
          if (!isOpenRef.current) {
            setUnreadCount(thread.unreadForCustomerCount || 0);
          }
        },
        onTyping: (typing) => {
          if (typing.senderRole === 'Admin') {
            setAdminIsTyping(typing.isTyping);
          }
        },
        onStatusChange: (status) => {
          setConnectionStatus(status);
        },
      }
    );

    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, [effectiveThreadId, session?.token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, adminIsTyping]);

  const handleSaveGuestName = (newName: string) => {
    setGuestName(newName);
    try {
      localStorage.setItem(GUEST_NAME_STORAGE_KEY, newName.trim());
    } catch {
      // Ignore storage errors
    }
    setIsEditingName(false);
    clientRef.current?.updateIdentity(
      newName.trim() || 'KF Guest Shopper',
      effectiveCustomerEmail
    );
  };

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    clientRef.current?.sendTyping(val.trim().length > 0);
    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(() => {
      clientRef.current?.sendTyping(false);
    }, 2000);
  };

  const handleSendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? messageInput).trim();
    if (!text || sending) return;

    setSending(true);
    if (!textOverride) {
      setMessageInput('');
    }
    clientRef.current?.sendTyping(false);

    try {
      await clientRef.current?.sendMessage(text);
    } catch {
      // Restore message if failed
      if (!textOverride) setMessageInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      {/* Unread Admin Reply Preview Toast when minimized */}
      {!isOpen && latestPopupPreview && (
        <div
          onClick={() => setIsOpen(true)}
          className="mb-3 max-w-xs bg-[#0E1017] border border-amber-400/50 shadow-2xl p-3.5 cursor-pointer hover:border-amber-300 transition animate-fadeIn"
        >
          <div className="flex items-center justify-between gap-3 mb-1">
            <span className="font-display text-[9px] font-extrabold uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{latestPopupPreview.senderName}</span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLatestPopupPreview(null);
              }}
              className="text-[#8E92A4] hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-white line-clamp-2">
            {latestPopupPreview.text}
          </p>
          <span className="block mt-1.5 font-display text-[9px] font-bold uppercase tracking-wider text-amber-300/90">
            CLICK TO REPLY →
          </span>
        </div>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="w-[350px] sm:w-[395px] h-[540px] max-h-[82vh] bg-[#090A0F] border border-white/20 shadow-[0_24px_70px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden mb-3">
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#11131C] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 bg-white text-[#060608] flex items-center justify-center font-brand text-xs font-extrabold tracking-wider">
                KF
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#11131C] ${
                    connectionStatus === 'connected'
                      ? 'bg-emerald-400'
                      : connectionStatus === 'connecting' ||
                        connectionStatus === 'reconnecting'
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-red-400'
                  }`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-brand text-xs font-bold uppercase tracking-wider text-white">
                    KHALIFA CONCIERGE
                  </h3>
                  <span className="px-1.5 py-0.5 bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-display text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5" />
                    <span>LIVE</span>
                  </span>
                </div>
                <p className="text-[10px] text-[#9EA2B3]">
                  Direct real-time line to Sales Admin
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 text-[#8E92A4] hover:text-white transition cursor-pointer"
              title="Minimize chat"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Customer Identity Bar */}
          <div className="px-4 py-2 bg-[#0D0F16] border-b border-white/[0.07] flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1.5 text-[#9EA2B3] truncate">
              <User className="w-3 h-3 text-amber-300 shrink-0" />
              <span className="truncate">
                Chatting as:{' '}
                <strong className="text-white">{effectiveCustomerName}</strong>
              </span>
            </div>
            {!session && !isEditingName && (
              <button
                type="button"
                onClick={() => setIsEditingName(true)}
                className="font-display text-[9px] font-bold uppercase tracking-wider text-amber-300 hover:underline shrink-0 cursor-pointer"
              >
                SET NAME
              </button>
            )}
          </div>

          {!session && isEditingName && (
            <div className="px-4 py-2.5 bg-[#141722] border-b border-amber-400/30 flex items-center gap-2">
              <input
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name (e.g. Omar)"
                className="flex-1 bg-[#090A0F] border border-white/20 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-300"
              />
              <button
                type="button"
                onClick={() => handleSaveGuestName(guestName)}
                className="px-3 py-1.5 bg-amber-400 text-[#060608] font-display text-[9px] font-extrabold uppercase tracking-wider cursor-pointer"
              >
                SAVE
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#090A0F]">
            {messages.map((msg) => {
              const isCustomer = msg.senderRole === 'Customer';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isCustomer ? 'items-end' : 'items-start'
                  }`}
                >
                  <span className="font-display text-[9px] font-bold uppercase tracking-wider text-[#7D8091] mb-1 px-1">
                    {isCustomer ? 'YOU' : msg.senderName}
                  </span>
                  <div
                    className={`max-w-[82%] px-3.5 py-2.5 text-xs leading-relaxed ${
                      isCustomer
                        ? 'bg-white text-[#060608] font-medium'
                        : 'bg-[#141722] text-white border border-white/10'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-1 px-1 text-[9px] text-[#6E7180]">
                    <span>
                      {new Date(msg.sentAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {isCustomer && (
                      <CheckCheck
                        className={`w-3 h-3 ${
                          msg.isReadByAdmin ? 'text-emerald-400' : 'text-[#6E7180]'
                        }`}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            {adminIsTyping && (
              <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-[#141722] border border-amber-400/20 px-3 py-2 w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Admin is typing a reply...</span>
              </div>
            )}

            {/* Quick Starter Chips if only welcome message exists */}
            {messages.length <= 1 && (
              <div className="pt-2 space-y-1.5">
                <span className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#7D8091] block">
                  QUICK QUESTIONS:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="text-left px-2.5 py-1.5 bg-[#11131C] hover:bg-white hover:text-[#060608] border border-white/12 text-[10px] text-[#D0D3E0] transition cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-[#11131C] border-t border-white/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={messageInput}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Write a message to Admin..."
              className="flex-1 bg-[#090A0F] border border-white/15 focus:border-white px-3 py-2.5 text-xs text-white placeholder-[#666A7A] outline-none"
            />
            <button
              type="submit"
              disabled={!messageInput.trim() || sending}
              className="px-3.5 py-2.5 bg-white hover:bg-amber-300 disabled:opacity-40 text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </button>
          </form>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group relative flex items-center gap-2.5 px-4 py-3.5 bg-white hover:bg-amber-300 text-[#060608] shadow-[0_14px_34px_rgba(0,0,0,0.65)] border border-white transition cursor-pointer"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="font-display text-[11px] font-extrabold uppercase tracking-[0.2em]">
          {isOpen ? 'CLOSE CHAT' : 'LIVE SUPPORT'}
        </span>
        <span
          className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />

        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white font-display text-[10px] font-extrabold flex items-center justify-center shadow-lg animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
};
