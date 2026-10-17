import * as signalR from '@microsoft/signalr';
import type { SignalRConnectionStatus } from './orderSignalR';

export interface ChatMessageDto {
  id: string;
  threadId: string;
  senderRole: 'Customer' | 'Admin';
  senderName: string;
  senderEmail?: string | null;
  text: string;
  sentAt: string;
  isReadByAdmin: boolean;
  isReadByCustomer: boolean;
}

export interface ChatThreadSummaryDto {
  threadId: string;
  customerName: string;
  customerEmail?: string | null;
  lastMessageText: string;
  lastMessageAt: string;
  unreadForAdminCount: number;
  unreadForCustomerCount: number;
  isCustomerOnline: boolean;
  messages: ChatMessageDto[];
}

export interface ChatTypingEvent {
  threadId: string;
  senderRole: 'Customer' | 'Admin';
  senderName: string;
  isTyping: boolean;
}

export interface CustomerChatSignalRCallbacks {
  onThreadHistory: (thread: ChatThreadSummaryDto) => void;
  onReceiveMessage: (message: ChatMessageDto) => void;
  onThreadUpdated: (thread: ChatThreadSummaryDto) => void;
  onTyping: (typing: ChatTypingEvent) => void;
  onStatusChange: (status: SignalRConnectionStatus) => void;
}

export interface CustomerChatSignalRClient {
  sendMessage: (text: string) => Promise<void>;
  markRead: () => Promise<void>;
  sendTyping: (isTyping: boolean) => Promise<void>;
  updateIdentity: (customerName: string, customerEmail?: string | null) => Promise<void>;
  dispose: () => void;
}

export function createCustomerChatConnection(
  initialThreadId: string,
  initialCustomerName: string,
  initialCustomerEmail: string | null | undefined,
  token: string | undefined,
  callbacks: CustomerChatSignalRCallbacks
): CustomerChatSignalRClient {
  let isDisposed = false;
  let currentThreadId = initialThreadId;
  let currentName = initialCustomerName || 'KF Shopper';
  let currentEmail = initialCustomerEmail || null;

  const hubUrl =
    window.location.port === '5173'
      ? 'http://localhost:5050/hubs/chat'
      : '/hubs/chat';

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(
      hubUrl,
      token
        ? {
            accessTokenFactory: () => token,
          }
        : {}
    )
    .withAutomaticReconnect([0, 1500, 3000, 6000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on('ThreadHistory', (thread: ChatThreadSummaryDto) => {
    if (!isDisposed) {
      callbacks.onThreadHistory(thread);
    }
  });

  connection.on('ReceiveChatMessage', (msg: ChatMessageDto) => {
    if (!isDisposed) {
      callbacks.onReceiveMessage(msg);
    }
  });

  connection.on('ThreadUpdated', (thread: ChatThreadSummaryDto) => {
    if (!isDisposed) {
      callbacks.onThreadUpdated(thread);
    }
  });

  connection.on('UserTyping', (typing: ChatTypingEvent) => {
    if (!isDisposed) {
      callbacks.onTyping(typing);
    }
  });

  const joinThread = async () => {
    if (connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke(
        'JoinCustomerThread',
        currentThreadId,
        currentName,
        currentEmail
      );
    }
  };

  connection.onreconnecting(() => {
    if (!isDisposed) callbacks.onStatusChange('reconnecting');
  });

  connection.onreconnected(() => {
    if (!isDisposed) {
      callbacks.onStatusChange('connected');
      joinThread().catch(() => {});
    }
  });

  connection.onclose(() => {
    if (!isDisposed) callbacks.onStatusChange('disconnected');
  });

  callbacks.onStatusChange('connecting');

  connection
    .start()
    .then(async () => {
      if (!isDisposed) {
        callbacks.onStatusChange('connected');
        await joinThread();
      }
    })
    .catch(() => {
      if (!isDisposed) {
        callbacks.onStatusChange('disconnected');
      }
    });

  return {
    sendMessage: async (text: string) => {
      if (connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('Chat is currently reconnecting. Please try again in a moment.');
      }
      await connection.invoke(
        'SendCustomerMessage',
        currentThreadId,
        currentName,
        currentEmail,
        text
      );
    },
    markRead: async () => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection
          .invoke('MarkThreadRead', currentThreadId, 'Customer')
          .catch(() => {});
      }
    },
    sendTyping: async (isTyping: boolean) => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection
          .invoke(
            'SendTypingIndicator',
            currentThreadId,
            'Customer',
            currentName,
            isTyping
          )
          .catch(() => {});
      }
    },
    updateIdentity: async (customerName: string, customerEmail?: string | null) => {
      currentName = customerName || currentName;
      currentEmail = customerEmail ?? currentEmail;
      await joinThread();
    },
    dispose: () => {
      isDisposed = true;
      connection.stop().catch(() => {});
    },
  };
}

export interface AdminChatSignalRCallbacks {
  onAllThreadsSnapshot: (threads: ChatThreadSummaryDto[]) => void;
  onReceiveMessage: (message: ChatMessageDto) => void;
  onThreadUpdated: (thread: ChatThreadSummaryDto) => void;
  onTyping: (typing: ChatTypingEvent) => void;
  onStatusChange: (status: SignalRConnectionStatus) => void;
}

export interface AdminChatSignalRClient {
  sendAdminReply: (threadId: string, adminName: string, text: string) => Promise<void>;
  markThreadRead: (threadId: string) => Promise<void>;
  sendTyping: (threadId: string, adminName: string, isTyping: boolean) => Promise<void>;
  refreshThreads: () => Promise<void>;
  dispose: () => void;
}

export function createAdminChatConnection(
  token: string,
  callbacks: AdminChatSignalRCallbacks
): AdminChatSignalRClient {
  let isDisposed = false;

  const hubUrl =
    window.location.port === '5173'
      ? 'http://localhost:5050/hubs/chat'
      : '/hubs/chat';

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect([0, 1500, 3000, 6000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on('AllThreadsSnapshot', (threads: ChatThreadSummaryDto[]) => {
    if (!isDisposed) {
      callbacks.onAllThreadsSnapshot(threads);
    }
  });

  connection.on('ReceiveChatMessage', (msg: ChatMessageDto) => {
    if (!isDisposed) {
      callbacks.onReceiveMessage(msg);
    }
  });

  connection.on('ThreadUpdated', (thread: ChatThreadSummaryDto) => {
    if (!isDisposed) {
      callbacks.onThreadUpdated(thread);
    }
  });

  connection.on('UserTyping', (typing: ChatTypingEvent) => {
    if (!isDisposed) {
      callbacks.onTyping(typing);
    }
  });

  const joinConsole = async () => {
    if (connection.state === signalR.HubConnectionState.Connected) {
      await connection.invoke('JoinAdminConsole');
    }
  };

  connection.onreconnecting(() => {
    if (!isDisposed) callbacks.onStatusChange('reconnecting');
  });

  connection.onreconnected(() => {
    if (!isDisposed) {
      callbacks.onStatusChange('connected');
      joinConsole().catch(() => {});
    }
  });

  connection.onclose(() => {
    if (!isDisposed) callbacks.onStatusChange('disconnected');
  });

  callbacks.onStatusChange('connecting');

  connection
    .start()
    .then(async () => {
      if (!isDisposed) {
        callbacks.onStatusChange('connected');
        await joinConsole();
      }
    })
    .catch(() => {
      if (!isDisposed) {
        callbacks.onStatusChange('disconnected');
      }
    });

  return {
    sendAdminReply: async (threadId: string, adminName: string, text: string) => {
      if (connection.state !== signalR.HubConnectionState.Connected) {
        throw new Error('SignalR chat connection is offline.');
      }
      await connection.invoke('SendAdminReply', threadId, adminName, text);
    },
    markThreadRead: async (threadId: string) => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection.invoke('MarkThreadRead', threadId, 'Admin').catch(() => {});
      }
    },
    sendTyping: async (threadId: string, adminName: string, isTyping: boolean) => {
      if (connection.state === signalR.HubConnectionState.Connected) {
        await connection
          .invoke('SendTypingIndicator', threadId, 'Admin', adminName, isTyping)
          .catch(() => {});
      }
    },
    refreshThreads: async () => {
      await joinConsole();
    },
    dispose: () => {
      isDisposed = true;
      connection.stop().catch(() => {});
    },
  };
}
