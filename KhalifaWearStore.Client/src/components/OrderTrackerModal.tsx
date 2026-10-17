import React, { useEffect, useState } from 'react';
import {
  X,
  Package,
  CheckCircle2,
  Clock,
  Search,
  MapPin,
  Phone,
  AlertCircle,
  Loader2,
  XCircle,
} from 'lucide-react';
import type { AuthResponseDto } from '../services/authApi';
import {
  fetchMyOrders,
  fetchMyOrderDetails,
  trackOrderPublic,
  resolveProductImage,
  type OrderDto,
  type OrderDetailsDto,
} from '../services/storeApi';

interface OrderTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuthResponseDto | null;
}

const PIPELINE_STEPS = [
  { key: 'Pending', label: 'ORDER RECEIVED', desc: 'Awaiting dispatch confirmation' },
  { key: 'Confirmed', label: 'CONFIRMED', desc: 'Packed at KHALIFA warehouse' },
  { key: 'Shipped', label: 'WITH COURIER', desc: 'Out for Cash on Delivery' },
  { key: 'Delivered', label: 'DELIVERED', desc: 'Handed over & COD collected' },
];

function getStepIndex(status?: string): number {
  const s = (status || 'Pending').trim().toLowerCase();
  if (s === 'cancelled') return -1;
  if (s === 'delivered') return 3;
  if (s === 'shipped') return 2;
  if (s === 'confirmed') return 1;
  return 0;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  isOpen,
  onClose,
  session,
}) => {
  const [myOrders, setMyOrders] = useState<OrderDto[]>([]);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetailsDto | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Public / Direct Order Lookup
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackPhone, setTrackPhone] = useState('');
  const [trackError, setTrackError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTrackError(null);

    if (session?.token) {
      setLoadingMyOrders(true);
      fetchMyOrders(session.token)
        .then((list) => {
          setMyOrders(list);
          if (list.length > 0) {
            handleInspectMyOrder(list[0].id, session.token);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingMyOrders(false));
    } else {
      setMyOrders([]);
    }
  }, [isOpen, session?.token]);

  const handleInspectMyOrder = async (orderId: number, tokenOverride?: string) => {
    const token = tokenOverride || session?.token;
    if (!token) return;
    setLoadingDetails(true);
    setTrackError(null);
    try {
      const detail = await fetchMyOrderDetails(orderId, token);
      setSelectedOrder(detail);
    } catch (err) {
      setTrackError(err instanceof Error ? err.message : 'Unable to load order details.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleTrackByNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    const idNum = Number(trackOrderId.replace(/[^0-9]/g, ''));
    if (!idNum || !trackPhone.trim()) {
      setTrackError('Please enter both your Order # and delivery phone number.');
      return;
    }

    setLoadingDetails(true);
    setTrackError(null);
    try {
      const detail = await trackOrderPublic(idNum, trackPhone.trim());
      setSelectedOrder(detail);
    } catch (err) {
      setTrackError(
        err instanceof Error
          ? err.message
          : 'Could not find an order matching that Order # and phone number.'
      );
    } finally {
      setLoadingDetails(false);
    }
  };

  if (!isOpen) return null;

  const currentStage = getStepIndex(selectedOrder?.orderStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0A0B0F] border border-white/[0.15] shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#07080B]">
          <div className="flex items-center gap-3">
            <img src="/kf-mark.svg" alt="KF" className="h-6 w-auto object-contain" />
            <div className="border-l border-white/15 pl-3">
              <span className="font-display text-[10px] uppercase tracking-[0.26em] text-amber-300 block">
                LIVE COURIER &amp; DISPATCH TRACKER
              </span>
              <h2 className="font-brand text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                TRACK YOUR ORDER &amp; SHIPMENT HISTORY
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 bg-white/[0.06] hover:bg-white text-white hover:text-[#060608] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
          {/* Quick Lookup Bar by Order # + Phone */}
          <form
            onSubmit={handleTrackByNumber}
            className="p-4 bg-[#11131A] border border-white/[0.1] grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                ORDER NUMBER (#)
              </label>
              <input
                type="text"
                value={trackOrderId}
                onChange={(e) => setTrackOrderId(e.target.value)}
                placeholder="e.g. 1002"
                className="w-full bg-[#090A0F] border border-white/15 focus:border-white px-3 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                DELIVERY PHONE NUMBER
              </label>
              <input
                type="tel"
                value={trackPhone}
                onChange={(e) => setTrackPhone(e.target.value)}
                placeholder="e.g. 01012345678"
                className="w-full bg-[#090A0F] border border-white/15 focus:border-white px-3 py-2.5 text-xs text-white outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={loadingDetails}
                className="w-full py-2.5 px-4 bg-white hover:bg-amber-300 text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-[0.2em] flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>TRACK ORDER</span>
              </button>
            </div>
          </form>

          {trackError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{trackError}</span>
            </div>
          )}

          {/* Account Order History Pills if signed in */}
          {session && (
            <div className="space-y-2">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] block">
                YOUR RECENT ORDERS ({myOrders.length})
              </span>
              {loadingMyOrders ? (
                <div className="flex items-center gap-2 text-xs text-[#9EA2B3]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading your orders...</span>
                </div>
              ) : myOrders.length === 0 ? (
                <p className="text-xs text-[#7D8091]">
                  No orders placed under this account yet. You can also look up any order above using Order # and phone number.
                </p>
              ) : (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {myOrders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    return (
                      <button
                        key={ord.id}
                        type="button"
                        onClick={() => handleInspectMyOrder(ord.id)}
                        className={`px-3.5 py-2 border text-left transition cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-white text-[#060608] border-white'
                            : 'bg-[#11131A] text-white border-white/12 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold">
                            #{ord.id}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-[8px] font-display font-extrabold uppercase ${
                              isSelected
                                ? 'bg-[#060608] text-amber-300'
                                : 'bg-white/10 text-amber-300'
                            }`}
                          >
                            {ord.orderStatus || 'Pending'}
                          </span>
                        </div>
                        <span
                          className={`block text-[10px] mt-0.5 ${
                            isSelected ? 'text-[#060608]/80' : 'text-[#8E92A4]'
                          }`}
                        >
                          {ord.orderTotal.toLocaleString()} EGP •{' '}
                          {new Date(ord.orderDate).toLocaleDateString()}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Selected Order Live Pipeline & Details */}
          {loadingDetails ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-[#9EA2B3]">
              <Loader2 className="w-6 h-6 animate-spin text-white" />
              <span>FETCHING LIVE SHIPMENT TELEMETRY...</span>
            </div>
          ) : selectedOrder ? (
            <div className="space-y-6 pt-2 border-t border-white/[0.08]">
              {/* Status Stepper */}
              <div className="p-5 bg-[#11131A] border border-white/[0.1] space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 block">
                      ORDER #{selectedOrder.id} • PLACED{' '}
                      {new Date(selectedOrder.orderDate).toLocaleString()}
                    </span>
                    <h3 className="font-brand text-base font-bold uppercase tracking-wider text-white mt-0.5">
                      CURRENT STATUS: {selectedOrder.orderStatus || 'Pending'}
                    </h3>
                  </div>

                  <span
                    className={`px-3 py-1 text-[10px] font-display font-extrabold uppercase tracking-[0.2em] border ${
                      selectedOrder.paid
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                    }`}
                  >
                    {selectedOrder.paid ? 'COD PAID' : 'CASH ON DELIVERY'}
                  </span>
                </div>

                {currentStage === -1 ? (
                  <div className="p-4 bg-red-500/15 border border-red-400/40 text-red-200 flex items-center gap-3 text-xs">
                    <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                    <span>
                      This order has been cancelled and reserved stock has been returned to inventory.
                    </span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    {PIPELINE_STEPS.map((step, idx) => {
                      const isDone = idx <= currentStage;
                      const isCurrent = idx === currentStage;
                      return (
                        <div
                          key={step.key}
                          className={`p-3.5 border transition ${
                            isCurrent
                              ? 'bg-amber-400/15 border-amber-400 text-white'
                              : isDone
                              ? 'bg-emerald-500/10 border-emerald-500/35 text-white'
                              : 'bg-[#090A0F] border-white/[0.07] text-[#6E7180]'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-display text-[9px] font-extrabold uppercase tracking-[0.18em]">
                              STEP 0{idx + 1}
                            </span>
                            {isDone ? (
                              <CheckCircle2
                                className={`w-4 h-4 ${
                                  isCurrent ? 'text-amber-300' : 'text-emerald-400'
                                }`}
                              />
                            ) : (
                              <Clock className="w-4 h-4 text-[#5E6170]" />
                            )}
                          </div>
                          <p className="font-brand text-xs font-bold uppercase tracking-wide">
                            {step.label}
                          </p>
                          <p className="text-[10px] opacity-80 mt-0.5">{step.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Destination & Pricing Summary */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-7 space-y-2.5">
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] block">
                    ORDERED PIECES ({selectedOrder.items?.length ?? 0})
                  </span>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {selectedOrder.items?.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-[#11131A] border border-white/[0.08] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={resolveProductImage(
                              item.productImage ?? item.pictureUrl,
                              item.productId
                            )}
                            alt={item.productName}
                            className="w-12 h-14 object-cover bg-[#060608] border border-white/10 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-brand text-xs font-bold uppercase text-white truncate">
                              {item.productName}
                            </p>
                            <p className="text-[10px] text-[#9EA2B3] mt-0.5">
                              SIZE <strong className="text-white">{item.size}</strong> •{' '}
                              {item.colour} • QTY {item.quantity}
                            </p>
                          </div>
                        </div>
                        <span className="font-display text-xs font-bold text-white shrink-0">
                          {item.total.toLocaleString()} EGP
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="md:col-span-5 p-4 bg-[#11131A] border border-white/[0.1] flex flex-col justify-between space-y-4">
                  <div className="space-y-2 text-xs">
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] block">
                      DELIVERY &amp; COD SUMMARY
                    </span>
                    <p className="text-white font-semibold flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>
                        {selectedOrder.customerCity} — {selectedOrder.shippingAddress}
                      </span>
                    </p>
                    <p className="text-[#9EA2B3] flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#8E92A4] shrink-0" />
                      <span>{selectedOrder.customerPhoneNo}</span>
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/[0.08] space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#9EA2B3]">
                      <span>Items Subtotal</span>
                      <span className="text-white">
                        {(selectedOrder.subtotal ?? selectedOrder.orderTotal).toLocaleString()} EGP
                      </span>
                    </div>
                    {(selectedOrder.discountAmount ?? 0) > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>
                          Discount {selectedOrder.promoCode ? `(${selectedOrder.promoCode})` : ''}
                        </span>
                        <span>-{(selectedOrder.discountAmount ?? 0).toLocaleString()} EGP</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#9EA2B3]">
                      <span>Courier Fee</span>
                      <span className="text-white">
                        {(selectedOrder.shippingFee ?? 0) === 0
                          ? 'FREE'
                          : `${(selectedOrder.shippingFee ?? 0).toLocaleString()} EGP`}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-white/[0.08]">
                      <span className="font-display text-[11px] font-extrabold uppercase tracking-wider text-white">
                        TOTAL COD
                      </span>
                      <span className="font-brand text-lg font-extrabold text-amber-300">
                        {selectedOrder.orderTotal.toLocaleString()} EGP
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center space-y-2">
              <Package className="w-8 h-8 text-[#5E6170] mx-auto" />
              <p className="font-brand text-xs uppercase tracking-wider text-white">
                ENTER YOUR ORDER # &amp; PHONE NUMBER ABOVE
              </p>
              <p className="text-xs text-[#7D8091]">
                Track your package status from warehouse packing to doorstep Cash-on-Delivery.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
