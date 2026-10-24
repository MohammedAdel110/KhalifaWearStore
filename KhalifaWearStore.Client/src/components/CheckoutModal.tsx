import React, { useEffect, useState } from 'react';
import {
  X,
  MapPin,
  User,
  Mail,
  Phone,
  Building2,
  Banknote,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Tag,
  Truck,
} from 'lucide-react';
import type { AuthResponseDto } from '../services/authApi';
import {
  fetchMyCustomerProfile,
  fetchPayments,
  fetchActivePromoCodes,
  createOrder,
  resolveProductImage,
  calculateShippingAndPromoPreview,
  FREE_SHIPPING_THRESHOLD_EGP,
  type BagItem,
  type PaymentDto,
  type OrderDetailsDto,
  type PromoCodeDto,
} from '../services/storeApi';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuthResponseDto | null;
  bag: BagItem[];
  onOrderSuccess: (order: OrderDetailsDto) => void;
  onRequireAuth: () => void;
  onUpdateQty?: (stockId: number, delta: number) => void;
  onRemoveItem?: (stockId: number) => void;
}

const EGYPT_REGIONS = [
  'Cairo',
  'Giza',
  'Alexandria',
  'New Cairo',
  'Sheikh Zayed',
  '6th of October',
  'Mansoura',
  'Tanta',
  'Port Said',
  'Suez',
  'Ismailia',
  'Hurghada',
  'Sharm El Sheikh',
  'Assiut',
  'Aswan',
  'Luxor',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  session,
  bag,
  onOrderSuccess,
  onRequireAuth,
  onUpdateQty,
  onRemoveItem,
}) => {
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account-retrieved fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNo, setPhoneNo] = useState('');
  const [region, setRegion] = useState('Cairo');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoInput, setAppliedPromoInput] = useState('');
  const [activePromoCodes, setActivePromoCodes] = useState<PromoCodeDto[]>([]);

  // Cash on Delivery payment ID
  const [codPaymentId, setCodPaymentId] = useState<number>(1);

  // Completed Order receipt
  const [completedOrder, setCompletedOrder] = useState<OrderDetailsDto | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCompletedOrder(null);
      setError(null);
      return;
    }

    if (!session) {
      onClose();
      onRequireAuth();
      return;
    }

    // Seed initial fallback from session while fetching stored Customer profile from DB
    setFullName(session.fullName || '');
    setEmail(session.email || '');
    setPhoneNo(session.phoneNumber || '');
    setError(null);
    setLoadingProfile(true);

    Promise.all([
      fetchMyCustomerProfile(session.token).catch(() => null),
      fetchPayments().catch(() => [] as PaymentDto[]),
      fetchActivePromoCodes().catch(() => [] as PromoCodeDto[]),
    ])
      .then(([profile, paymentList, promos]) => {
        setActivePromoCodes(promos);
        if (profile) {
          const combinedName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
          setFullName(combinedName || session.fullName || '');
          setEmail(profile.email || session.email || '');
          setPhoneNo(profile.phoneNo || session.phoneNumber || '');
          if (profile.city && profile.city !== 'Not Specified') {
            setRegion(profile.city);
          }
          if (profile.address) {
            setDetailedAddress(profile.address);
          }
        }

        const codOption = paymentList.find((p) => {
          const raw = String(p.paymentType).toLowerCase();
          return raw === '1' || raw.includes('cash');
        });
        setCodPaymentId(codOption?.id ?? paymentList[0]?.id ?? 1);
      })
      .finally(() => {
        setLoadingProfile(false);
      });
  }, [isOpen, session, onClose, onRequireAuth]);

  if (!isOpen) return null;

  const subtotal = bag.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalItems = bag.reduce((sum, item) => sum + item.quantity, 0);
  const pricingPreview = calculateShippingAndPromoPreview(
    subtotal,
    region,
    appliedPromoInput,
    activePromoCodes
  );

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      onRequireAuth();
      return;
    }

    if (bag.length === 0) {
      setError('Your shopping bag is empty.');
      return;
    }

    const trimmedName = fullName.trim();
    const trimmedPhone = phoneNo.trim();
    const trimmedRegion = region.trim();
    const trimmedAddress = detailedAddress.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedPhone) {
      setError('Please provide a valid phone number for delivery coordination.');
      return;
    }
    if (!trimmedRegion) {
      setError('Please specify your delivery region / city.');
      return;
    }
    if (!trimmedAddress || trimmedAddress.length < 5) {
      setError(
        'Please enter your detailed delivery address (street name, building number, floor/apartment).'
      );
      return;
    }

    const nameParts = trimmedName.split(/\s+/);
    const firstName = nameParts[0] || 'Khalifa';
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Member';

    setSubmitting(true);
    setError(null);

    try {
      const orderResult = await createOrder(
        {
          paymentId: codPaymentId,
          paid: false,
          firstName,
          lastName,
          phoneNo: trimmedPhone,
          city: trimmedRegion,
          shippingAddress: trimmedAddress,
          promoCode: pricingPreview.appliedPromoCode || undefined,
          items: bag.map((item) => ({
            productId: item.productId,
            size: item.size,
            colour: item.colour,
            quantity: item.quantity,
          })),
        },
        session.token
      );

      setCompletedOrder(orderResult);
      onOrderSuccess(orderResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete your order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0A0B0F] border border-white/[0.14] shadow-2xl my-auto max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08] bg-[#07080B]">
          <div className="flex items-center gap-3">
            <img src="/kf-mark.svg" alt="KF" className="h-6 w-auto object-contain" />
            <div className="border-l border-white/15 pl-3">
              <span className="font-display text-[10px] uppercase tracking-[0.26em] text-[#8E92A4] block">
                KHALIFA WEAR HOUSE // SECURE DISPATCH
              </span>
              <h2 className="font-brand text-base sm:text-lg font-bold uppercase tracking-wider text-white">
                {completedOrder ? `ORDER CONFIRMED #${completedOrder.id}` : 'CHECKOUT & DISPATCH'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white text-white hover:text-[#060608] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {completedOrder ? (
            /* ================================================================
               ORDER CONFIRMATION VIEW
               ================================================================ */
            <div className="space-y-8">
              <div className="p-6 bg-emerald-500/[0.07] border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] uppercase tracking-[0.24em] text-emerald-400 font-bold">
                      ORDER CONFIRMED &amp; READY FOR DISPATCH
                    </span>
                    <h3 className="font-brand text-xl font-bold uppercase text-white mt-0.5">
                      THANK YOU FOR YOUR ORDER, {completedOrder.customerName}
                    </h3>
                    <p className="text-xs text-[#A5A9BA] mt-1">
                      Your order <strong className="text-white">#{completedOrder.id}</strong> has
                      been confirmed and can be tracked anytime using your Order # and phone number.
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="font-display text-[10px] uppercase tracking-[0.2em] text-[#8E92A4] block">
                    TOTAL COD AMOUNT
                  </span>
                  <span className="font-brand text-xl font-bold text-white">
                    {completedOrder.orderTotal.toLocaleString()} EGP
                  </span>
                </div>
              </div>

              {/* Delivery & Customer Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                  <span className="font-display text-[10px] uppercase tracking-[0.22em] text-[#7D8091] block">
                    RECIPIENT &amp; ACCOUNT DATA
                  </span>
                  <p className="font-brand text-sm font-bold text-white">
                    {completedOrder.customerName}
                  </p>
                  <p className="text-xs text-[#9EA2B3]">{completedOrder.customerEmail}</p>
                  <p className="text-xs text-white font-medium">{completedOrder.customerPhoneNo}</p>
                </div>

                <div className="p-5 bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                  <span className="font-display text-[10px] uppercase tracking-[0.22em] text-[#7D8091] block">
                    DISPATCH DESTINATION
                  </span>
                  <p className="font-brand text-sm font-bold uppercase text-white">
                    {completedOrder.customerCity}
                  </p>
                  <p className="text-xs text-[#D0D3E0] leading-relaxed">
                    {completedOrder.shippingAddress}
                  </p>
                  <p className="font-display text-[10px] uppercase tracking-[0.18em] text-emerald-400">
                    PAYMENT: CASH ON DELIVERY (COD)
                  </p>
                </div>
              </div>

              {/* Ordered Items */}
              <div className="space-y-3">
                <h4 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-[#9EA2B3]">
                  ORDERED ITEMS ({completedOrder.items?.length ?? 1})
                </h4>
                <div className="divide-y divide-white/[0.08] border border-white/[0.08] bg-white/[0.02]">
                  {completedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-4 gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <img
                          src={resolveProductImage(item.productImage, item.productId)}
                          alt={item.productName}
                          className="w-14 h-16 object-cover bg-[#12131A] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-brand text-xs font-bold uppercase text-white truncate">
                            {item.productName}
                          </p>
                          <p className="font-display text-[10px] uppercase tracking-wider text-[#9EA2B3] mt-1">
                            SIZE: <strong className="text-white">{item.size}</strong> •{' '}
                            {item.colour} • QTY: <strong className="text-white">{item.quantity}</strong>
                          </p>
                        </div>
                      </div>
                      <span className="font-brand text-sm font-bold text-white shrink-0">
                        {item.total.toLocaleString()} EGP
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-4 bg-white text-[#060608] font-display text-xs font-bold uppercase tracking-[0.2em] hover:bg-white/90 transition cursor-pointer"
                >
                  CONTINUE SHOPPING
                </button>
              </div>
            </div>
          ) : (
            /* ================================================================
               CHECKOUT FORM & SUMMARY VIEW
               ================================================================ */
            <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Account Details + Detailed Address + Payment */}
              <div className="lg:col-span-7 space-y-6">
                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Free Shipping Progress Banner */}
                <div className="p-3.5 bg-[#11131A] border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-display font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-amber-300" />
                      {pricingPreview.amountNeededForFreeShipping === 0 ||
                      pricingPreview.shippingFee === 0 ? (
                        <span className="text-emerald-300">
                          COMPLIMENTARY EXPRESS DELIVERY UNLOCKED!
                        </span>
                      ) : (
                        <span>
                          ADD{' '}
                          <strong className="text-amber-300">
                            {pricingPreview.amountNeededForFreeShipping.toLocaleString()} EGP
                          </strong>{' '}
                          MORE FOR FREE SHIPPING
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-[10px] text-[#8E92A4]">
                      {Math.min(
                        100,
                        Math.round((subtotal / FREE_SHIPPING_THRESHOLD_EGP) * 100)
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((subtotal / FREE_SHIPPING_THRESHOLD_EGP) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Stored Account Fields */}
                <div className="space-y-4">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#8E92A4]" />
                    <span>1. CUSTOMER CONTACT &amp; REGION</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block font-display text-[10px] uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                        FULL NAME *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-[#686B7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Full Name"
                          className="w-full pl-9 pr-3.5 py-3 bg-[#11131A] border border-white/[0.12] focus:border-white text-xs text-white placeholder-[#5E6272] outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block font-display text-[10px] uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                        ACCOUNT EMAIL
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-[#686B7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          readOnly
                          value={email}
                          className="w-full pl-9 pr-3.5 py-3 bg-white/[0.03] border border-white/[0.08] text-xs text-[#9EA2B3] cursor-not-allowed outline-none"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <label className="block font-display text-[10px] uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                        PHONE NUMBER *
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-[#686B7A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={phoneNo}
                          onChange={(e) => setPhoneNo(e.target.value)}
                          placeholder="+20 10 0000 0000"
                          className="w-full pl-9 pr-3.5 py-3 bg-[#11131A] border border-white/[0.12] focus:border-white text-xs text-white placeholder-[#5E6272] outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Region / Governorate */}
                    <div>
                      <label className="block font-display text-[10px] uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                        GOVERNORATE / CITY *
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-[#686B7A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          list="kf-egypt-regions"
                          required
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          placeholder="e.g. Cairo, Giza, Alexandria"
                          className="w-full pl-9 pr-3.5 py-3 bg-[#11131A] border border-white/[0.12] focus:border-white text-xs text-white placeholder-[#5E6272] outline-none transition"
                        />
                        <datalist id="kf-egypt-regions">
                          {EGYPT_REGIONS.map((r) => (
                            <option key={r} value={r} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Street Address Input */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#8E92A4]" />
                    <span>2. DETAILED DELIVERY ADDRESS</span>
                  </h3>

                  <div>
                    <label className="block font-display text-[10px] uppercase tracking-[0.18em] text-[#9EA2B3] mb-1.5">
                      STREET, BUILDING, FLOOR / APARTMENT &amp; LANDMARK *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={detailedAddress}
                      onChange={(e) => setDetailedAddress(e.target.value)}
                      placeholder="Enter your full street address, building number, floor, apartment number, and any nearby landmark for the courier..."
                      className="w-full p-3.5 bg-[#11131A] border border-white/[0.15] focus:border-white text-xs text-white placeholder-[#5E6272] outline-none transition resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Payment Method: Cash on Delivery Only */}
                <div className="space-y-3 pt-2">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2">
                    <Banknote className="w-3.5 h-3.5 text-[#8E92A4]" />
                    <span>3. PAYMENT METHOD</span>
                  </h3>

                  <div className="p-4 bg-white/[0.08] border border-white text-left flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Banknote className="w-4 h-4 text-white shrink-0 mt-0.5" />
                      <div>
                        <p className="font-display text-[11px] font-bold uppercase tracking-wider text-white">
                          CASH ON DELIVERY (COD)
                        </p>
                        <p className="text-[11px] text-[#9EA2B3] mt-0.5">
                          Pay in EGP upon doorstep inspection &amp; delivery
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-white text-[#060608] font-display text-[9px] font-bold uppercase tracking-[0.18em] shrink-0">
                      SELECTED
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Summary, Promo Code & Finalize Button */}
              <div className="lg:col-span-5 flex flex-col justify-between bg-[#0E1016] border border-white/[0.1] p-5 sm:p-6 space-y-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                    <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
                      ORDER SUMMARY
                    </span>
                    <span className="font-display text-[10px] uppercase tracking-[0.18em] text-[#8E92A4]">
                      {totalItems} {totalItems === 1 ? 'PIECE' : 'PIECES'}
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
                    {bag.map((item) => (
                      <div
                        key={`${item.productId}-${item.size}-${item.colour}`}
                        className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.06]"
                      >
                        <img
                          src={item.image}
                          alt={item.productName}
                          className="w-14 h-16 object-cover bg-[#12131A] shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-brand text-xs font-bold uppercase text-white truncate">
                              {item.productName}
                            </p>
                            {onRemoveItem && (
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.stockId)}
                                className="text-[#7D8091] hover:text-red-400 transition cursor-pointer shrink-0"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="font-display text-[10px] uppercase tracking-wider text-[#8E92A4] mt-0.5">
                            SIZE: <strong className="text-white">{item.size}</strong> •{' '}
                            {item.colour}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            {onUpdateQty ? (
                              <div className="inline-flex items-center bg-black/50 border border-white/10">
                                <button
                                  type="button"
                                  onClick={() => onUpdateQty(item.stockId, -1)}
                                  className="px-2 py-0.5 text-white/80 hover:text-white cursor-pointer"
                                >
                                  <Minus className="w-2.5 h-2.5" />
                                </button>
                                <span className="px-2 font-brand text-[11px] font-bold text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onUpdateQty(item.stockId, 1)}
                                  className="px-2 py-0.5 text-white/80 hover:text-white cursor-pointer"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ) : (
                              <p className="font-display text-[10px] uppercase tracking-wider text-[#9EA2B3]">
                                QTY: {item.quantity} × {item.unitPrice.toLocaleString()} EGP
                              </p>
                            )}
                            <span className="font-brand text-xs font-bold text-white shrink-0">
                              {(item.unitPrice * item.quantity).toLocaleString()} EGP
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Promo Code Box */}
                  <div className="p-3 bg-[#12151E] border border-white/10 space-y-2">
                    <label className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-amber-300" />
                      <span>PROMO / VOUCHER CODE</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={promoCodeInput}
                        onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                        placeholder={
                          activePromoCodes.length > 0
                            ? `e.g. ${activePromoCodes.map((p) => p.code).join(', ')}`
                            : 'Enter promo code'
                        }
                        className="flex-1 bg-[#090A0F] border border-white/15 px-3 py-2 text-xs text-white uppercase outline-none focus:border-amber-300"
                      />
                      <button
                        type="button"
                        onClick={() => setAppliedPromoInput(promoCodeInput)}
                        className="px-3.5 py-2 bg-white hover:bg-amber-300 text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer"
                      >
                        APPLY
                      </button>
                    </div>
                    {activePromoCodes.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {activePromoCodes.map((promo) => (
                          <button
                            key={promo.code}
                            type="button"
                            title={promo.description || promo.code}
                            onClick={() => {
                              setPromoCodeInput(promo.code);
                              setAppliedPromoInput(promo.code);
                            }}
                            className="px-2 py-0.5 bg-white/[0.06] hover:bg-amber-400/20 border border-white/10 text-[9px] font-mono text-amber-300 transition cursor-pointer flex items-center gap-1"
                          >
                            <span className="font-bold">{promo.code}</span>
                            {promo.description && (
                              <span className="text-[#9EA2B3] font-sans">({promo.description})</span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    {pricingPreview.promoMessage && (
                      <p
                        className={`text-[10px] font-medium ${
                          pricingPreview.appliedPromoCode
                            ? 'text-emerald-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {pricingPreview.promoMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/[0.1]">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-[#9EA2B3]">
                      <span>Items Subtotal</span>
                      <span className="text-white font-medium">{subtotal.toLocaleString()} EGP</span>
                    </div>

                    {pricingPreview.discountAmount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Promo Discount ({pricingPreview.appliedPromoCode})</span>
                        <span className="font-bold">
                          -{pricingPreview.discountAmount.toLocaleString()} EGP
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#9EA2B3]">
                      <span>Courier Dispatch ({region || 'Egypt'})</span>
                      {pricingPreview.shippingFee === 0 ? (
                        <span className="text-emerald-400 font-display text-[10px] uppercase tracking-wider font-bold">
                          FREE DELIVERY
                        </span>
                      ) : (
                        <span className="text-white font-medium">
                          +{pricingPreview.shippingFee.toLocaleString()} EGP
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-baseline pt-3 border-t border-white/[0.08]">
                      <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white">
                        TOTAL COD DUE
                      </span>
                      <span className="font-brand text-xl font-bold text-white">
                        {pricingPreview.grandTotal.toLocaleString()} EGP
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loadingProfile}
                    className="w-full py-4 bg-white hover:bg-white/90 disabled:opacity-50 text-[#060608] font-display text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>PLACING YOUR ORDER...</span>
                      </>
                    ) : (
                      <>
                        <span>FINALIZE &amp; PLACE ORDER</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
