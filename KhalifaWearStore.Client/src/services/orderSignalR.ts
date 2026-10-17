import * as signalR from '@microsoft/signalr';
import type { OrderDetailsDto } from './storeApi';

export type SignalRConnectionStatus =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'disconnected';

export interface OrderSignalRHandlers {
  onNewOrder: (order: OrderDetailsDto) => void;
  onOrderPaymentUpdated: (order: OrderDetailsDto) => void;
  onStatusChange: (status: SignalRConnectionStatus) => void;
}

export function createOrderSignalRConnection(
  token: string,
  handlers: OrderSignalRHandlers
): () => void {
  let isDisposed = false;

  const hubUrl =
    window.location.port === '5173'
      ? 'http://localhost:5050/hubs/orders'
      : '/hubs/orders';

  const connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  connection.on('NewOrderReceived', (order: OrderDetailsDto) => {
    if (!isDisposed) {
      handlers.onNewOrder(order);
    }
  });

  connection.on('OrderPaymentUpdated', (order: OrderDetailsDto) => {
    if (!isDisposed) {
      handlers.onOrderPaymentUpdated(order);
    }
  });

  connection.onreconnecting(() => {
    if (!isDisposed) {
      handlers.onStatusChange('reconnecting');
    }
  });

  connection.onreconnected(() => {
    if (!isDisposed) {
      handlers.onStatusChange('connected');
    }
  });

  connection.onclose(() => {
    if (!isDisposed) {
      handlers.onStatusChange('disconnected');
    }
  });

  handlers.onStatusChange('connecting');

  connection
    .start()
    .then(() => {
      if (!isDisposed) {
        handlers.onStatusChange('connected');
      }
    })
    .catch(() => {
      if (!isDisposed) {
        handlers.onStatusChange('disconnected');
      }
    });

  return () => {
    isDisposed = true;
    connection.stop().catch(() => {});
  };
}
