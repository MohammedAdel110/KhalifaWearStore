import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  LogOut,
  KeyRound,
  ArrowRight,
  Loader2,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Layers,
  FolderPlus,
  Radio,
  Search,
  RefreshCw,
  TrendingUp,
  Banknote,
  Clock,
  AlertTriangle,
  Plus,
  Upload,
  Save,
  X,
  BellRing,
  Check,
  Pencil,
  Palette,
  MessageSquare,
  Send,
  CheckCheck,
  Sparkles,
  Printer,
  Download,
  Tag,
} from 'lucide-react';
import { loginUser, type AuthResponseDto } from '../services/authApi';
import {
  adminFetchOrders,
  adminFetchOrderDetails,
  adminUpdateOrderPaymentStatus,
  adminUpdateOrderStatus,
  adminFetchAllStocks,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  adminCreateProduct,
  adminUpdateProduct,
  adminDeleteProduct,
  adminUploadColorImage,
  adminCreateStock,
  adminUpdateStock,
  adminDeleteStock,
  adminFetchPromoCodes,
  adminCreatePromoCode,
  adminTogglePromoCode,
  adminFeaturePromoCode,
  adminDeletePromoCode,
  fetchProductDetails,
  fetchStocksByProduct,
  resolveProductImage,
  getProductColorVariants,
  resolveColourHex,
  STREETWEAR_COLOUR_PRESETS,
  type CategoryDto,
  type ProductDto,
  type ProductColorVariantDto,
  type StockDto,
  type OrderDto,
  type OrderDetailsDto,
  type OrderFulfillmentStatus,
  type PromoCodeDto,
} from '../services/storeApi';
import {
  createOrderSignalRConnection,
  type SignalRConnectionStatus,
} from '../services/orderSignalR';
import {
  createAdminChatConnection,
  type ChatMessageDto,
  type ChatThreadSummaryDto,
  type AdminChatSignalRClient,
} from '../services/chatSignalR';

interface AdminPortalViewProps {
  session: AuthResponseDto | null;
  onSessionChange: (session: AuthResponseDto | null) => void;
  categories: CategoryDto[];
  products: ProductDto[];
  onRefreshStoreData: () => void;
  onInspectProduct: (productId: number, initialColour?: string) => void;
}

interface ColorwayDraft {
  id: string;
  colour: string;
  colorHex: string;
  existingImageUrl: string | null;
  imageFile: File | null;
  imagePreview: string | null;
  sizeQuantities: Record<string, number>;
}

function createDefaultColorwayDraft(
  colour = 'Obsidian Black',
  colorHex = '#141519',
  existingImageUrl: string | null = null
): ColorwayDraft {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    colour,
    colorHex,
    existingImageUrl,
    imageFile: null,
    imagePreview: existingImageUrl,
    sizeQuantities: {
      S: 10,
      M: 20,
      L: 25,
      XL: 18,
      XXL: 8,
    },
  };
}

type AdminSection =
  | 'overview'
  | 'orders'
  | 'products'
  | 'inventory'
  | 'categories'
  | 'promos'
  | 'chat';

type OrderFilterStatus = 'all' | 'pending' | 'paid';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const ADMIN_QUICK_REPLIES = [
  'Hello! Welcome to KHALIFA Concierge. How can I assist you today?',
  'Your order is confirmed and being prepared for dispatch via Cash on Delivery.',
  'Our 500GSM heavyweight hoodies feature a relaxed boxy streetwear fit—take your normal size.',
  'Could you please share your Order # or phone number so I can check your shipment right away?',
];

/** Play a subtle notification chime using Web Audio API when a live order arrives */
function playLiveOrderChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.setValueAtTime(880, now + 0.14);
    osc2.frequency.setValueAtTime(293.66, now);
    osc2.frequency.setValueAtTime(440, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  } catch {
    // Ignore audio context restrictions
  }
}

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  session,
  onSessionChange,
  categories,
  products,
  onRefreshStoreData,
  onInspectProduct,
}) => {
  const isAdminAuthenticated = Boolean(
    session && (session.role === 'Admin' || session.role === 'Owner')
  );

  // Navigation & Global Feedback
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // =========================================================================
  // 1. SALES ADMIN LOGIN STATE
  // =========================================================================
  const [adminLoginEmail, setAdminLoginEmail] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // =========================================================================
  // 2. REAL-TIME SIGNALR & LIVE ORDERS STATE
  // =========================================================================
  const [signalRStatus, setSignalRStatus] =
    useState<SignalRConnectionStatus>('disconnected');
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderFilter, setOrderFilter] = useState<OrderFilterStatus>('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [newOrderIds, setNewOrderIds] = useState<number[]>([]);
  const [liveBannerOrder, setLiveBannerOrder] =
    useState<OrderDetailsDto | null>(null);

  // Selected Order Inspector Drawer
  const [inspectedOrder, setInspectedOrder] = useState<OrderDetailsDto | null>(
    null
  );
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [updatingPaymentOrderId, setUpdatingPaymentOrderId] = useState<
    number | null
  >(null);

  // =========================================================================
  // 3. GLOBAL INVENTORY / STOCK SNAPSHOT STATE
  // =========================================================================
  const [allStocks, setAllStocks] = useState<StockDto[]>([]);
  const [selectedProductIdForStock, setSelectedProductIdForStock] =
    useState<number>(products[0]?.id ?? 1);
  const [productStocks, setProductStocks] = useState<StockDto[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [newVariantColour, setNewVariantColour] = useState('Obsidian Black');
  const [newVariantSize, setNewVariantSize] = useState('L');
  const [newVariantQty, setNewVariantQty] = useState('15');
  const [stockDrafts, setStockDrafts] = useState<Record<number, number>>({});
  const [savingStockId, setSavingStockId] = useState<number | null>(null);

  // =========================================================================
  // 4. CATALOG / DROP PUBLISHER & PRODUCT EDITOR STATE
  // =========================================================================
  const [productSearch, setProductSearch] = useState('');
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [loadingEditProduct, setLoadingEditProduct] = useState(false);
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 1);
  const [unitPrice, setUnitPrice] = useState('1450');
  const [productAvailable, setProductAvailable] = useState(true);
  const [colorwayDrafts, setColorwayDrafts] = useState<ColorwayDraft[]>(() => [
    createDefaultColorwayDraft('Obsidian Black', '#141519'),
  ]);
  const [isPublishingProduct, setIsPublishingProduct] = useState(false);
  const [selectedAdminCardColours, setSelectedAdminCardColours] = useState<
    Record<number, string>
  >({});
  const [importSourceProductId, setImportSourceProductId] =
    useState<string>('');

  // =========================================================================
  // 5. CATEGORY MANAGER STATE
  // =========================================================================
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(
    null
  );
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [newCategoryImageFile, setNewCategoryImageFile] = useState<File | null>(
    null
  );
  const [newCategoryImagePreview, setNewCategoryImagePreview] = useState<
    string | null
  >(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // =========================================================================
  // 5B. PROMO CODE MANAGER STATE
  // =========================================================================
  const [promoCodes, setPromoCodes] = useState<PromoCodeDto[]>([]);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoType, setNewPromoType] = useState<
    'Percentage' | 'FixedAmount' | 'FreeShipping'
  >('Percentage');
  const [newPromoValue, setNewPromoValue] = useState('15');
  const [newPromoMinSubtotal, setNewPromoMinSubtotal] = useState('0');
  const [newPromoDesc, setNewPromoDesc] = useState('');
  const [newPromoFeaturedOnBanner, setNewPromoFeaturedOnBanner] =
    useState(true);
  const [isSavingPromo, setIsSavingPromo] = useState(false);

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (
      products.length > 0 &&
      !products.some((p) => p.id === selectedProductIdForStock)
    ) {
      setSelectedProductIdForStock(products[0].id);
    }
  }, [products, selectedProductIdForStock]);

  const loadOrders = useCallback(async () => {
    if (!session || !isAdminAuthenticated) return;
    setLoadingOrders(true);
    try {
      const res = await adminFetchOrders(
        { pageIndex: 1, pageSize: 50 },
        session.token
      );
      setOrders(res.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load orders.');
    } finally {
      setLoadingOrders(false);
    }
  }, [session, isAdminAuthenticated]);

  const loadAllStocksSnapshot = useCallback(async () => {
    if (!session || !isAdminAuthenticated) return;
    try {
      const res = await adminFetchAllStocks(session.token, 50);
      setAllStocks(res.data);
    } catch {
      // Non-blocking snapshot
    }
  }, [session, isAdminAuthenticated]);

  const loadPromoCodes = useCallback(async () => {
    if (!session || !isAdminAuthenticated) return;
    setLoadingPromos(true);
    try {
      const list = await adminFetchPromoCodes(session.token);
      setPromoCodes(list);
    } catch {
      // Non-blocking
    } finally {
      setLoadingPromos(false);
    }
  }, [session, isAdminAuthenticated]);

  const handleCreatePromoCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const normalized = newPromoCode.trim().toUpperCase().replace(/\s+/g, '');
    if (!normalized) {
      setErrorMsg('Please enter a Promo Code (e.g., VIP20, EID25, DROP300).');
      return;
    }

    const val =
      newPromoType === 'FreeShipping' ? 0 : Math.max(0, Number(newPromoValue));
    const minSub = Math.max(0, Number(newPromoMinSubtotal));

    setIsSavingPromo(true);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await adminCreatePromoCode(
        {
          code: normalized,
          discountType: newPromoType,
          discountValue: val,
          minOrderSubtotal: minSub,
          isActive: true,
          isFeaturedOnBanner: newPromoFeaturedOnBanner,
          description:
            newPromoDesc.trim() ||
            (newPromoType === 'Percentage'
              ? `${val}% OFF` +
                (minSub > 0
                  ? ` on orders above ${minSub.toLocaleString()} EGP`
                  : ' on all orders')
              : newPromoType === 'FixedAmount'
              ? `${val.toLocaleString()} EGP OFF` +
                (minSub > 0
                  ? ` on orders above ${minSub.toLocaleString()} EGP`
                  : ' on all orders')
              : 'Free Express Delivery across Egypt'),
        },
        session.token
      );
      setNewPromoCode('');
      setNewPromoDesc('');
      setStatusMsg(
        `Promo code "${normalized}" saved${
          newPromoFeaturedOnBanner
            ? ' and featured on the landing page banner!'
            : ' and immediately live at checkout!'
        }`
      );
      await loadPromoCodes();
      onRefreshStoreData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to create promo code.'
      );
    } finally {
      setIsSavingPromo(false);
    }
  };

  const handleTogglePromoCode = async (id: number) => {
    if (!session) return;
    setErrorMsg(null);
    try {
      const updated = await adminTogglePromoCode(id, session.token);
      setPromoCodes((prev) =>
        prev.map((p) => (p.id === id ? updated : p))
      );
      setStatusMsg(
        `Promo code ${updated.code} is now ${
          updated.isActive ? 'ACTIVE' : 'PAUSED'
        }.`
      );
      onRefreshStoreData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to toggle promo code.'
      );
    }
  };

  const handleFeaturePromoCode = async (id: number) => {
    if (!session) return;
    setErrorMsg(null);
    try {
      const updated = await adminFeaturePromoCode(id, session.token);
      await loadPromoCodes();
      onRefreshStoreData();
      setStatusMsg(
        updated.isFeaturedOnBanner
          ? `Promo code "${updated.code}" (${updated.description}) is now displayed on the Landing Page banner!`
          : `Removed "${updated.code}" from the Landing Page banner.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to update landing page promo banner.'
      );
    }
  };

  const handleDeletePromoCode = async (id: number, code: string) => {
    if (!session) return;
    setErrorMsg(null);
    try {
      await adminDeletePromoCode(id, session.token);
      setPromoCodes((prev) => prev.filter((p) => p.id !== id));
      setStatusMsg(`Promo code "${code}" deleted.`);
      onRefreshStoreData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to delete promo code.'
      );
    }
  };

  const loadStocksForProduct = useCallback(async (prodId: number) => {
    setLoadingStocks(true);
    try {
      const list = await fetchStocksByProduct(prodId);
      setProductStocks(list);
      const drafts: Record<number, number> = {};
      list.forEach((s) => {
        drafts[s.id] = s.quantityInStock;
      });
      setStockDrafts(drafts);
    } catch {
      setProductStocks([]);
    } finally {
      setLoadingStocks(false);
    }
  }, []);

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadOrders();
      loadAllStocksSnapshot();
      loadPromoCodes();
    }
  }, [isAdminAuthenticated, loadOrders, loadAllStocksSnapshot, loadPromoCodes]);

  useEffect(() => {
    if (isAdminAuthenticated && selectedProductIdForStock) {
      loadStocksForProduct(selectedProductIdForStock);
    }
  }, [isAdminAuthenticated, selectedProductIdForStock, loadStocksForProduct]);

  // =========================================================================
  // REAL-TIME SIGNALR CONNECTION HOOK
  // =========================================================================
  useEffect(() => {
    if (!isAdminAuthenticated || !session?.token) {
      setSignalRStatus('disconnected');
      return;
    }

    const disconnect = createOrderSignalRConnection(session.token, {
      onStatusChange: (st) => setSignalRStatus(st),
      onNewOrder: (incomingOrder) => {
        playLiveOrderChime();
        setLiveBannerOrder(incomingOrder);
        setNewOrderIds((prev) =>
          prev.includes(incomingOrder.id) ? prev : [incomingOrder.id, ...prev]
        );

        const summaryRow: OrderDto = {
          id: incomingOrder.id,
          orderDate: incomingOrder.orderDate,
          paid: incomingOrder.paid,
          paymentDate: incomingOrder.paymentDate,
          customerId: incomingOrder.customerId,
          customerName: incomingOrder.customerName,
          customerEmail: incomingOrder.customerEmail,
          customerPhoneNo: incomingOrder.customerPhoneNo,
          customerCity: incomingOrder.customerCity,
          shippingAddress: incomingOrder.shippingAddress,
          paymentId: incomingOrder.paymentId,
          paymentType: incomingOrder.paymentType,
          totalItemsCount:
            incomingOrder.items?.reduce((s, i) => s + i.quantity, 0) ??
            incomingOrder.totalItemsCount ??
            1,
          orderTotal: incomingOrder.orderTotal,
        };

        setOrders((prev) => {
          const filtered = prev.filter((o) => o.id !== summaryRow.id);
          return [summaryRow, ...filtered];
        });

        onRefreshStoreData();
        loadAllStocksSnapshot();
        if (selectedProductIdForStock) {
          loadStocksForProduct(selectedProductIdForStock);
        }
      },
      onOrderPaymentUpdated: (updatedOrder) => {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === updatedOrder.id
              ? {
                  ...o,
                  paid: updatedOrder.paid,
                  paymentDate: updatedOrder.paymentDate,
                }
              : o
          )
        );
        setInspectedOrder((prev) =>
          prev && prev.id === updatedOrder.id ? updatedOrder : prev
        );
      },
    });

    return () => {
      disconnect();
    };
  }, [
    isAdminAuthenticated,
    session?.token,
    selectedProductIdForStock,
    onRefreshStoreData,
    loadAllStocksSnapshot,
    loadStocksForProduct,
  ]);

  // =========================================================================
  // 6. REAL-TIME SIGNALR SUPPORT CHAT STATE & HOOK
  // =========================================================================
  const [chatConnectionStatus, setChatConnectionStatus] =
    useState<SignalRConnectionStatus>('disconnected');
  const [chatThreads, setChatThreads] = useState<ChatThreadSummaryDto[]>([]);
  const [selectedChatThreadId, setSelectedChatThreadId] = useState<
    string | null
  >(null);
  const [chatSearch, setChatSearch] = useState('');
  const [chatReplyInput, setChatReplyInput] = useState('');
  const [sendingChatReply, setSendingChatReply] = useState(false);
  const [typingByThread, setTypingByThread] = useState<Record<string, boolean>>(
    {}
  );
  const [liveBannerChatMsg, setLiveBannerChatMsg] =
    useState<ChatMessageDto | null>(null);

  const chatClientRef = useRef<AdminChatSignalRClient | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);
  const activeSectionRef = useRef<AdminSection>(activeSection);
  const selectedChatThreadIdRef = useRef<string | null>(selectedChatThreadId);
  const adminTypingTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    activeSectionRef.current = activeSection;
    if (activeSection === 'chat' && selectedChatThreadIdRef.current) {
      chatClientRef.current?.markThreadRead(selectedChatThreadIdRef.current);
      setLiveBannerChatMsg(null);
    }
  }, [activeSection]);

  useEffect(() => {
    selectedChatThreadIdRef.current = selectedChatThreadId;
    if (activeSectionRef.current === 'chat' && selectedChatThreadId) {
      chatClientRef.current?.markThreadRead(selectedChatThreadId);
    }
  }, [selectedChatThreadId]);

  useEffect(() => {
    if (!isAdminAuthenticated || !session?.token) {
      setChatConnectionStatus('disconnected');
      return;
    }

    const client = createAdminChatConnection(session.token, {
      onStatusChange: (st) => setChatConnectionStatus(st),
      onAllThreadsSnapshot: (threads) => {
        setChatThreads(threads);
        if (threads.length > 0 && !selectedChatThreadIdRef.current) {
          setSelectedChatThreadId(threads[0].threadId);
        }
      },
      onReceiveMessage: (msg) => {
        if (msg.senderRole === 'Customer') {
          playLiveOrderChime();
          setTypingByThread((prev) => ({ ...prev, [msg.threadId]: false }));

          const isViewingThisThread =
            activeSectionRef.current === 'chat' &&
            selectedChatThreadIdRef.current?.toLowerCase() ===
              msg.threadId.toLowerCase();

          if (isViewingThisThread) {
            client.markThreadRead(msg.threadId);
          } else {
            setLiveBannerChatMsg(msg);
          }
        }
      },
      onThreadUpdated: (updatedThread) => {
        setChatThreads((prev) => {
          const exists = prev.some(
            (t) =>
              t.threadId.toLowerCase() === updatedThread.threadId.toLowerCase()
          );
          const next = exists
            ? prev.map((t) =>
                t.threadId.toLowerCase() ===
                updatedThread.threadId.toLowerCase()
                  ? updatedThread
                  : t
              )
            : [updatedThread, ...prev];
          return [...next].sort(
            (a, b) =>
              new Date(b.lastMessageAt).getTime() -
              new Date(a.lastMessageAt).getTime()
          );
        });

        if (!selectedChatThreadIdRef.current) {
          setSelectedChatThreadId(updatedThread.threadId);
        }
      },
      onTyping: (typing) => {
        if (typing.senderRole === 'Customer') {
          setTypingByThread((prev) => ({
            ...prev,
            [typing.threadId]: typing.isTyping,
          }));
        }
      },
    });

    chatClientRef.current = client;
    return () => {
      client.dispose();
      chatClientRef.current = null;
    };
  }, [isAdminAuthenticated, session?.token]);

  const activeChatThread = useMemo(() => {
    if (!selectedChatThreadId) return chatThreads[0] ?? null;
    return (
      chatThreads.find(
        (t) => t.threadId.toLowerCase() === selectedChatThreadId.toLowerCase()
      ) ??
      chatThreads[0] ??
      null
    );
  }, [chatThreads, selectedChatThreadId]);

  useEffect(() => {
    if (activeSection === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeSection, activeChatThread?.messages.length, typingByThread]);

  const totalUnreadChats = useMemo(
    () => chatThreads.reduce((sum, t) => sum + (t.unreadForAdminCount || 0), 0),
    [chatThreads]
  );

  const filteredChatThreads = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    if (!q) return chatThreads;
    return chatThreads.filter(
      (t) =>
        t.customerName.toLowerCase().includes(q) ||
        (t.customerEmail || '').toLowerCase().includes(q) ||
        t.lastMessageText.toLowerCase().includes(q)
    );
  }, [chatThreads, chatSearch]);

  const handleSelectChatThread = (threadId: string) => {
    setSelectedChatThreadId(threadId);
    chatClientRef.current?.markThreadRead(threadId);
  };

  const handleAdminTypingChange = (val: string) => {
    setChatReplyInput(val);
    if (!activeChatThread) return;
    const adminDisplayName = session?.fullName || 'KHALIFA ADMIN';
    chatClientRef.current?.sendTyping(
      activeChatThread.threadId,
      adminDisplayName,
      val.trim().length > 0
    );
    if (adminTypingTimeoutRef.current) {
      window.clearTimeout(adminTypingTimeoutRef.current);
    }
    adminTypingTimeoutRef.current = window.setTimeout(() => {
      if (activeChatThread) {
        chatClientRef.current?.sendTyping(
          activeChatThread.threadId,
          adminDisplayName,
          false
        );
      }
    }, 2000);
  };

  const handleSendAdminChatReply = async (textOverride?: string) => {
    const text = (textOverride ?? chatReplyInput).trim();
    if (!text || !activeChatThread || sendingChatReply) return;

    setSendingChatReply(true);
    if (!textOverride) {
      setChatReplyInput('');
    }
    const adminDisplayName = session?.fullName || 'KHALIFA ADMIN';
    chatClientRef.current?.sendTyping(
      activeChatThread.threadId,
      adminDisplayName,
      false
    );

    try {
      await chatClientRef.current?.sendAdminReply(
        activeChatThread.threadId,
        adminDisplayName,
        text
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to send chat reply.'
      );
      if (!textOverride) setChatReplyInput(text);
    } finally {
      setSendingChatReply(false);
    }
  };

  // =========================================================================
  // COMPUTED ANALYTICS & TELEMETRY
  // =========================================================================
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (o.orderTotal || 0), 0);
    const collectedRevenue = orders
      .filter((o) => o.paid)
      .reduce((sum, o) => sum + (o.orderTotal || 0), 0);
    const pendingCodRevenue = totalRevenue - collectedRevenue;
    const paidOrdersCount = orders.filter((o) => o.paid).length;
    const pendingOrdersCount = totalOrders - paidOrdersCount;
    const totalUnitsOrdered = orders.reduce(
      (sum, o) => sum + (o.totalItemsCount ?? o.itemsCount ?? 1),
      0
    );

    const totalStockUnits = allStocks.reduce(
      (sum, s) => sum + s.quantityInStock,
      0
    );
    const lowStockVariants = allStocks.filter(
      (s) => s.quantityInStock > 0 && s.quantityInStock <= 5
    );
    const outOfStockVariants = allStocks.filter((s) => s.quantityInStock === 0);

    const cityMap = new Map<string, { count: number; revenue: number }>();
    orders.forEach((o) => {
      const cityKey = (o.customerCity || 'Cairo').trim();
      const existing = cityMap.get(cityKey) ?? { count: 0, revenue: 0 };
      cityMap.set(cityKey, {
        count: existing.count + 1,
        revenue: existing.revenue + (o.orderTotal || 0),
      });
    });
    const topCities = Array.from(cityMap.entries())
      .map(([city, stats]) => ({ city, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      collectedRevenue,
      pendingCodRevenue,
      paidOrdersCount,
      pendingOrdersCount,
      totalUnitsOrdered,
      totalStockUnits,
      lowStockVariants,
      outOfStockVariants,
      topCities,
    };
  }, [orders, allStocks]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter === 'paid' && !o.paid) return false;
      if (orderFilter === 'pending' && o.paid) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        const matchId = String(o.id).includes(q);
        const matchName = o.customerName?.toLowerCase().includes(q);
        const matchEmail = o.customerEmail?.toLowerCase().includes(q);
        const matchPhone = o.customerPhoneNo?.toLowerCase().includes(q);
        const matchCity = o.customerCity?.toLowerCase().includes(q);
        const matchAddress = o.shippingAddress?.toLowerCase().includes(q);
        return (
          matchId ||
          matchName ||
          matchEmail ||
          matchPhone ||
          matchCity ||
          matchAddress
        );
      }
      return true;
    });
  }, [orders, orderFilter, orderSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.productName.toLowerCase().includes(q) ||
        (p.categoryName ?? '').toLowerCase().includes(q) ||
        (p.colour ?? '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // =========================================================================
  // ACTION HANDLERS
  // =========================================================================
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const data = await loginUser({
        email: adminLoginEmail.trim(),
        password: adminLoginPassword,
      });

      if (data.role !== 'Admin' && data.role !== 'Owner') {
        setAuthError(
          'Access Denied: This portal is restricted to authorized Sales Administrators.'
        );
        return;
      }

      onSessionChange(data);
      localStorage.setItem('kf_admin_session', JSON.stringify(data));
      setAdminLoginPassword('');
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Invalid Administrator credentials.'
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAdminLogout = () => {
    onSessionChange(null);
    localStorage.removeItem('kf_admin_session');
    setAdminLoginEmail('');
    setAdminLoginPassword('');
  };

  const handleInspectOrder = async (orderId: number) => {
    if (!session) return;
    setLoadingOrderDetail(true);
    setErrorMsg(null);
    try {
      const detail = await adminFetchOrderDetails(orderId, session.token);
      setInspectedOrder(detail);
      setNewOrderIds((prev) => prev.filter((id) => id !== orderId));
      if (liveBannerOrder?.id === orderId) {
        setLiveBannerOrder(null);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to load order details.'
      );
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleToggleOrderPaid = async (orderId: number, targetPaid: boolean) => {
    if (!session) return;
    setUpdatingPaymentOrderId(orderId);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const updated = await adminUpdateOrderPaymentStatus(
        orderId,
        targetPaid,
        session.token
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? { ...o, paid: updated.paid, paymentDate: updated.paymentDate }
            : o
        )
      );
      if (inspectedOrder?.id === orderId) {
        setInspectedOrder(updated);
      }
      setStatusMsg(
        `Order #${orderId} marked as ${
          updated.paid ? 'PAID (COD Collected)' : 'PENDING COD'
        }.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to update payment status.'
      );
    } finally {
      setUpdatingPaymentOrderId(null);
    }
  };

  const handleUpdateOrderStatus = async (
    orderId: number,
    targetStatus: OrderFulfillmentStatus
  ) => {
    if (!session) return;
    setUpdatingPaymentOrderId(orderId);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const updated = await adminUpdateOrderStatus(
        orderId,
        targetStatus,
        session.token
      );
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                orderStatus: updated.orderStatus,
                paid: updated.paid,
                paymentDate: updated.paymentDate,
              }
            : o
        )
      );
      if (inspectedOrder?.id === orderId) {
        setInspectedOrder(updated);
      }
      if (targetStatus === 'Cancelled') {
        loadAllStocksSnapshot();
        onRefreshStoreData();
      }
      setStatusMsg(
        `Order #${orderId} status updated to ${(
          updated.orderStatus || targetStatus
        ).toUpperCase()}${
          targetStatus === 'Cancelled'
            ? ' (Items automatically restored to live stock)'
            : ''
        }.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to update order status.'
      );
    } finally {
      setUpdatingPaymentOrderId(null);
    }
  };

  const handleExportOrdersCsv = () => {
    if (orders.length === 0) return;
    const headers = [
      'Order ID',
      'Order Date',
      'Status',
      'COD Paid',
      'Customer Name',
      'Customer Email',
      'Phone',
      'City',
      'Shipping Address',
      'Items Count',
      'Promo Code',
      'Discount (EGP)',
      'Shipping Fee (EGP)',
      'Total COD (EGP)',
    ];
    const rows = orders.map((o) => [
      o.id,
      new Date(o.orderDate).toISOString(),
      o.orderStatus || (o.paid ? 'Delivered' : 'Pending'),
      o.paid ? 'YES' : 'NO',
      `"${(o.customerName || '').replace(/"/g, '""')}"`,
      `"${(o.customerEmail || '').replace(/"/g, '""')}"`,
      `"${(o.customerPhoneNo || '').replace(/"/g, '""')}"`,
      `"${(o.customerCity || '').replace(/"/g, '""')}"`,
      `"${(o.shippingAddress || '').replace(/"/g, '""')}"`,
      o.totalItemsCount ?? o.itemsCount ?? 1,
      o.promoCode || '',
      o.discountAmount ?? 0,
      o.shippingFee ?? 0,
      o.orderTotal,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `khalifa-orders-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintOrderWaybill = (order: OrderDetailsDto) => {
    const win = window.open('', '_blank', 'width=780,height=900');
    if (!win) return;
    const itemsRows = (order.items || [])
      .map(
        (i) => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #ddd;font-weight:bold;">${i.productName}</td>
          <td style="padding:8px;border-bottom:1px solid #ddd;">${i.size} / ${i.colour}</td>
          <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">${i.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">${i.total.toLocaleString()} EGP</td>
        </tr>`
      )
      .join('');

    win.document.write(`
      <html>
        <head>
          <title>KHALIFA WEAR HOUSE - COD WAYBILL #${order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; padding: 28px; }
            .box { border: 2px solid #000; padding: 20px; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 14px; margin-bottom: 16px; }
            .badge { background: #000; color: #fff; padding: 6px 12px; font-weight: bold; font-size: 13px; letter-spacing: 1px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
            th { text-align: left; background: #f2f2f2; padding: 8px; border-bottom: 2px solid #000; text-transform: uppercase; font-size: 11px; }
            .cod-box { margin-top: 18px; border: 2px solid #000; padding: 14px; display: flex; justify-content: space-between; align-items: center; background: #fafafa; }
          </style>
        </head>
        <body>
          <div class="box">
            <div class="header">
              <div>
                <h1 style="margin:0;font-size:22px;letter-spacing:2px;">KHALIFA WEAR HOUSE // CAIRO</h1>
                <p style="margin:4px 0 0;font-size:11px;color:#555;">500GSM HEAVYWEIGHT STREETWEAR • COURIER DISPATCH WAYBILL</p>
              </div>
              <div class="badge">ORDER #${order.id} • ${(order.orderStatus || 'Pending').toUpperCase()}</div>
            </div>
            <div class="grid">
              <div>
                <strong>RECIPIENT:</strong> ${order.customerName}<br/>
                <strong>PHONE:</strong> ${order.customerPhoneNo || '—'}<br/>
                <strong>EMAIL:</strong> ${order.customerEmail}
              </div>
              <div>
                <strong>CITY / GOVERNORATE:</strong> ${order.customerCity || 'Cairo'}<br/>
                <strong>ORDER DATE:</strong> ${new Date(order.orderDate).toLocaleString()}<br/>
                <strong>PAYMENT METHOD:</strong> CASH ON DELIVERY (COD)
              </div>
            </div>
            <div style="padding:10px;border:1px dashed #000;margin-bottom:16px;font-size:13px;">
              <strong>DELIVERY ADDRESS:</strong><br/>
              ${order.shippingAddress || '—'}
            </div>
            <table>
              <thead>
                <tr>
                  <th>ITEM</th>
                  <th>SIZE / COLORWAY</th>
                  <th style="text-align:center;">QTY</th>
                  <th style="text-align:right;">LINE TOTAL</th>
                </tr>
              </thead>
              <tbody>${itemsRows}</tbody>
            </table>
            <div class="cod-box">
              <div>
                <div style="font-size:12px;color:#444;">
                  Shipping Fee: ${(order.shippingFee ?? 0) === 0 ? 'FREE' : `${order.shippingFee} EGP`}
                  ${order.promoCode ? ` • Promo (${order.promoCode}): -${order.discountAmount ?? 0} EGP` : ''}
                </div>
                <strong style="font-size:14px;">AMOUNT TO COLLECT FROM CUSTOMER (COD):</strong>
              </div>
              <div style="font-size:24px;font-weight:900;">
                ${order.paid ? '0 EGP (ALREADY PAID)' : `${order.orderTotal.toLocaleString()} EGP`}
              </div>
            </div>
          </div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const handleResetProductForm = () => {
    setEditingProductId(null);
    setProductName('');
    setProductDescription('');
    setCategoryId(categories[0]?.id ?? 1);
    setUnitPrice('1450');
    setProductAvailable(true);
    setColorwayDrafts([createDefaultColorwayDraft('Obsidian Black', '#141519')]);
    setImportSourceProductId('');
  };

  const handleStartEditProduct = async (prod: ProductDto) => {
    setErrorMsg(null);
    setStatusMsg(null);
    setEditingProductId(prod.id);
    setProductName(prod.productName);
    setProductDescription(prod.productDescription ?? '');
    setCategoryId(prod.categoryId);
    setUnitPrice(String(prod.unitPrice));
    setProductAvailable(prod.productAvailable);
    setLoadingEditProduct(true);

    try {
      const [details, stockList] = await Promise.all([
        fetchProductDetails(prod.id),
        fetchStocksByProduct(prod.id),
      ]);
      const mergedStocks =
        stockList.length > 0 ? stockList : details.stocks ?? [];
      const variants = getProductColorVariants({
        ...details,
        stocks: mergedStocks,
      });

      const drafts: ColorwayDraft[] = variants.map((v) => {
        const sizeMap: Record<string, number> = {
          S: 0,
          M: 0,
          L: 0,
          XL: 0,
          XXL: 0,
        };
        mergedStocks
          .filter((s) => s.colour.toLowerCase() === v.colour.toLowerCase())
          .forEach((s) => {
            sizeMap[s.size.toUpperCase()] = s.quantityInStock;
          });

        return {
          id: `${v.colour}-${Math.random().toString(36).slice(2, 7)}`,
          colour: v.colour,
          colorHex: resolveColourHex(v.colour, v.colorHex),
          existingImageUrl: v.image || details.image || null,
          imageFile: null,
          imagePreview: v.image || details.image || null,
          sizeQuantities: sizeMap,
        };
      });

      setColorwayDrafts(
        drafts.length > 0
          ? drafts
          : [
              createDefaultColorwayDraft(
                prod.colour || 'Obsidian Black',
                resolveColourHex(prod.colour),
                prod.image
              ),
            ]
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Unable to load product details for editing.'
      );
    } finally {
      setLoadingEditProduct(false);
    }
  };

  const handleAddColorwayDraft = () => {
    const usedNames = new Set(
      colorwayDrafts.map((d) => d.colour.toLowerCase())
    );
    const nextPreset =
      STREETWEAR_COLOUR_PRESETS.find(
        (p) => !usedNames.has(p.name.toLowerCase())
      ) ?? { name: `Colorway #${colorwayDrafts.length + 1}`, hex: '#3B82F6' };

    setColorwayDrafts((prev) => [
      ...prev,
      createDefaultColorwayDraft(nextPreset.name, nextPreset.hex),
    ]);
  };

  const handleRemoveColorwayDraft = (draftId: string) => {
    setColorwayDrafts((prev) =>
      prev.length > 1 ? prev.filter((d) => d.id !== draftId) : prev
    );
  };

  const handleColorwayNameChange = (draftId: string, newColour: string) => {
    setColorwayDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              colour: newColour,
              colorHex: resolveColourHex(newColour),
            }
          : d
      )
    );
  };

  const handleColorwayHexChange = (draftId: string, newHex: string) => {
    setColorwayDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, colorHex: newHex } : d))
    );
  };

  const handleColorwayImageSelect = (
    draftId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setColorwayDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              imageFile: file,
              imagePreview: previewUrl,
            }
          : d
      )
    );
  };

  const handleColorwaySizeQtyChange = (
    draftId: string,
    sizeKey: string,
    qty: number
  ) => {
    setColorwayDrafts((prev) =>
      prev.map((d) =>
        d.id === draftId
          ? {
              ...d,
              sizeQuantities: {
                ...d.sizeQuantities,
                [sizeKey]: Math.max(0, qty),
              },
            }
          : d
      )
    );
  };

  const handleImportColorwayFromProduct = async (
    deleteSourceAfterImport: boolean
  ) => {
    if (!importSourceProductId || !session) return;
    const sourceId = Number(importSourceProductId);
    if (!sourceId || sourceId === editingProductId) return;

    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const [srcDetails, srcStocks] = await Promise.all([
        fetchProductDetails(sourceId),
        fetchStocksByProduct(sourceId),
      ]);
      const mergedStocks =
        srcStocks.length > 0 ? srcStocks : srcDetails.stocks ?? [];
      const srcVariants = getProductColorVariants({
        ...srcDetails,
        stocks: mergedStocks,
      });

      const importedDrafts: ColorwayDraft[] = srcVariants.map((v) => {
        const sizeMap: Record<string, number> = {
          S: 0,
          M: 0,
          L: 0,
          XL: 0,
          XXL: 0,
        };
        mergedStocks
          .filter((s) => s.colour.toLowerCase() === v.colour.toLowerCase())
          .forEach((s) => {
            sizeMap[s.size.toUpperCase()] = s.quantityInStock;
          });

        return {
          id: `${v.colour}-${Math.random().toString(36).slice(2, 7)}`,
          colour: v.colour,
          colorHex: resolveColourHex(v.colour, v.colorHex),
          existingImageUrl: v.image || srcDetails.image || null,
          imageFile: null,
          imagePreview: v.image || srcDetails.image || null,
          sizeQuantities: sizeMap,
        };
      });

      setColorwayDrafts((prev) => {
        const next = [...prev];
        for (const imp of importedDrafts) {
          const existingIdx = next.findIndex(
            (x) => x.colour.toLowerCase() === imp.colour.toLowerCase()
          );
          if (existingIdx >= 0) {
            next[existingIdx] = imp;
          } else {
            next.push(imp);
          }
        }
        return next;
      });

      if (deleteSourceAfterImport) {
        await adminDeleteProduct(sourceId, session.token);
        onRefreshStoreData();
      }

      setImportSourceProductId('');
      setStatusMsg(
        `Imported colorway(s) and image from "${srcDetails.productName}"${
          deleteSourceAfterImport ? ' and removed separate duplicate card' : ''
        }. Click SAVE CHANGES to apply!`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Failed to import colorway from product.'
      );
    }
  };

  const handlePublishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setIsPublishingProduct(true);

    try {
      const validDrafts = colorwayDrafts.filter(
        (d) => d.colour.trim().length > 0
      );
      if (validDrafts.length === 0) {
        setErrorMsg('Please add at least one colorway for this product.');
        setIsPublishingProduct(false);
        return;
      }

      // 1. Upload any new colorway image files to get their permanent URLs
      const resolvedColorVariants: ProductColorVariantDto[] = [];
      for (const draft of validDrafts) {
        let imageUrl = draft.existingImageUrl;
        if (draft.imageFile) {
          const uploaded = await adminUploadColorImage(
            draft.imageFile,
            draft.colour.trim(),
            draft.colorHex,
            session.token
          );
          imageUrl = uploaded.image;
        }
        resolvedColorVariants.push({
          colour: draft.colour.trim(),
          colorHex: resolveColourHex(draft.colour.trim(), draft.colorHex),
          image: imageUrl,
        });
      }

      const firstDraft = validDrafts[0];
      const firstActiveSize =
        STANDARD_SIZES.find(
          (sz) => (firstDraft.sizeQuantities[sz] ?? 0) > 0
        ) ?? 'L';
      const colorVariantsJson = JSON.stringify(resolvedColorVariants);

      if (editingProductId !== null) {
        // UPDATE EXISTING PRODUCT
        const updatedProduct = await adminUpdateProduct(
          editingProductId,
          {
            productName: productName.trim(),
            productDescription: productDescription.trim(),
            categoryId,
            unitPrice: Number(unitPrice) || 1000,
            colour: firstDraft.colour.trim(),
            size: firstActiveSize,
            productAvailable,
            colorVariantsJson,
          },
          session.token
        );

        // Sync stocks across all colorways and sizes
        const existingStocks = await fetchStocksByProduct(editingProductId);
        const activeColourSet = new Set(
          validDrafts.map((d) => d.colour.trim().toLowerCase())
        );

        // Remove stocks for colorways that were deleted from the product
        for (const oldSt of existingStocks) {
          if (!activeColourSet.has(oldSt.colour.trim().toLowerCase())) {
            await adminDeleteStock(oldSt.id, session.token);
          }
        }

        // Upsert size quantities for each active colorway
        for (const draft of validDrafts) {
          const cleanColour = draft.colour.trim();
          for (const sz of STANDARD_SIZES) {
            const targetQty = Math.max(0, draft.sizeQuantities[sz] ?? 0);
            const match = existingStocks.find(
              (s) =>
                s.colour.trim().toLowerCase() === cleanColour.toLowerCase() &&
                s.size.trim().toUpperCase() === sz
            );
            if (match) {
              if (match.quantityInStock !== targetQty) {
                await adminUpdateStock(
                  match.id,
                  {
                    size: sz,
                    colour: cleanColour,
                    quantityInStock: targetQty,
                  },
                  session.token
                );
              }
            } else if (targetQty > 0) {
              await adminCreateStock(
                {
                  productId: editingProductId,
                  size: sz,
                  colour: cleanColour,
                  quantityInStock: targetQty,
                },
                session.token
              );
            }
          }
        }

        setStatusMsg(
          `Updated "${updatedProduct.productName}" (${resolvedColorVariants.length} colorway${
            resolvedColorVariants.length === 1 ? '' : 's'
          }, ${updatedProduct.unitPrice.toLocaleString()} EGP)!`
        );
        handleResetProductForm();
      } else {
        // CREATE NEW PRODUCT
        const createdProduct = await adminCreateProduct(
          {
            productName: productName.trim(),
            productDescription: productDescription.trim(),
            categoryId,
            unitPrice: Number(unitPrice) || 1000,
            colour: firstDraft.colour.trim(),
            size: firstActiveSize,
            productAvailable,
            colorVariantsJson,
          },
          session.token
        );

        for (const draft of validDrafts) {
          const cleanColour = draft.colour.trim();
          for (const sz of STANDARD_SIZES) {
            const qty = Math.max(0, draft.sizeQuantities[sz] ?? 0);
            if (qty > 0) {
              await adminCreateStock(
                {
                  productId: createdProduct.id,
                  size: sz,
                  colour: cleanColour,
                  quantityInStock: qty,
                },
                session.token
              );
            }
          }
        }

        setStatusMsg(
          `Published "${createdProduct.productName}" with ${resolvedColorVariants.length} colorway(s)!`
        );
        handleResetProductForm();
      }

      onRefreshStoreData();
      loadAllStocksSnapshot();
      if (selectedProductIdForStock) {
        loadStocksForProduct(selectedProductIdForStock);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to save product.'
      );
    } finally {
      setIsPublishingProduct(false);
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    if (!session) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await adminDeleteProduct(id, session.token);
      setStatusMsg(`Deleted product "${name}".`);
      onRefreshStoreData();
      loadAllStocksSnapshot();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to delete product.'
      );
    }
  };

  const handleSaveStockRow = async (stock: StockDto, newQty: number) => {
    if (!session) return;
    setSavingStockId(stock.id);
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const clamped = Math.max(0, newQty);
      await adminUpdateStock(
        stock.id,
        {
          size: stock.size,
          colour: stock.colour,
          quantityInStock: clamped,
        },
        session.token
      );
      setStockDrafts((prev) => ({ ...prev, [stock.id]: clamped }));
      await loadStocksForProduct(selectedProductIdForStock);
      await loadAllStocksSnapshot();
      onRefreshStoreData();
      setStatusMsg(
        `Updated ${stock.productName} (${stock.size} / ${stock.colour}) stock to ${clamped}.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to update stock.'
      );
    } finally {
      setSavingStockId(null);
    }
  };

  const handleAddStockVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await adminCreateStock(
        {
          productId: selectedProductIdForStock,
          size: newVariantSize.trim().toUpperCase(),
          colour: newVariantColour.trim(),
          quantityInStock: Math.max(0, Number(newVariantQty) || 0),
        },
        session.token
      );
      setStatusMsg(
        `Added ${newVariantColour} (${newVariantSize}) — ${newVariantQty} units in stock.`
      );
      await loadStocksForProduct(selectedProductIdForStock);
      await loadAllStocksSnapshot();
      onRefreshStoreData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to add stock variant.'
      );
    }
  };

  const handleDeleteStockVariant = async (stockId: number) => {
    if (!session) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await adminDeleteStock(stockId, session.token);
      setStatusMsg('Removed stock variant.');
      await loadStocksForProduct(selectedProductIdForStock);
      await loadAllStocksSnapshot();
      onRefreshStoreData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to delete stock variant.'
      );
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    setErrorMsg(null);
    setStatusMsg(null);
    setIsCreatingCategory(true);
    try {
      if (editingCategoryId !== null) {
        const updated = await adminUpdateCategory(
          editingCategoryId,
          {
            categoryName: newCategoryName.trim(),
            categoryDescription: newCategoryDesc.trim(),
            imageFile: newCategoryImageFile,
          },
          session.token
        );
        setStatusMsg(`Updated category "${updated.categoryName}".`);
        setEditingCategoryId(null);
      } else {
        const created = await adminCreateCategory(
          {
            categoryName: newCategoryName.trim(),
            categoryDescription: newCategoryDesc.trim(),
            imageFile: newCategoryImageFile,
          },
          session.token
        );
        setStatusMsg(`Created category "${created.categoryName}".`);
      }
      setNewCategoryName('');
      setNewCategoryDesc('');
      setNewCategoryImageFile(null);
      setNewCategoryImagePreview(null);
      onRefreshStoreData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : editingCategoryId !== null
          ? 'Failed to update category.'
          : 'Failed to create category.'
      );
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!session) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      await adminDeleteCategory(id, session.token);
      setStatusMsg(`Deleted category "${name}".`);
      onRefreshStoreData();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Cannot delete category with active products.'
      );
    }
  };

  /* =========================================================================
     VIEW 1: DEDICATED SALES ADMIN LOGIN PORTAL (/admin)
     ========================================================================= */
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-[#050507] text-[#F4F4F6] flex items-center justify-center p-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <img
          src="/kf-mark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute w-[540px] max-w-[85vw] opacity-[0.03] object-contain"
        />

        <div className="relative z-10 w-full max-w-md bg-[#0A0B0F] border border-white/[0.15] p-8 sm:p-10 shadow-[0_30px_90px_rgba(0,0,0,0.95)] space-y-7">
          <div className="space-y-3 text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/[0.07] border border-white/20 text-white font-display text-[10px] font-bold uppercase tracking-[0.24em]">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>SALES &amp; OPERATIONS PORTAL</span>
            </div>

            <div className="pt-2 flex justify-center">
              <img
                src="/kf-mark.svg"
                alt="KF"
                className="h-10 w-auto object-contain"
              />
            </div>

            <h1 className="font-brand text-2xl font-extrabold uppercase tracking-wider text-white pt-1">
              SALES ADMIN LOGIN
            </h1>
            <p className="text-xs text-[#8E92A4] leading-relaxed">
              Sign in with your Sales Administrator account to manage live
              customer orders, COD dispatch, products, and inventory.
            </p>
          </div>

          {authError && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-2">
                ADMIN EMAIL ADDRESS
              </label>
              <div className="relative flex items-center bg-[#11131A] border border-white/[0.14] focus-within:border-white transition">
                <Mail className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                <input
                  type="email"
                  required
                  value={adminLoginEmail}
                  onChange={(e) => setAdminLoginEmail(e.target.value)}
                  placeholder="admin@khalifawear.com"
                  className="w-full bg-transparent px-3.5 py-3.5 text-xs sm:text-sm text-white placeholder-[#555869] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-2">
                PASSWORD
              </label>
              <div className="relative flex items-center bg-[#11131A] border border-white/[0.14] focus-within:border-white transition">
                <Lock className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  required
                  value={adminLoginPassword}
                  onChange={(e) => setAdminLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-transparent px-3.5 py-3.5 text-xs sm:text-sm text-white placeholder-[#555869] outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((v) => !v)}
                  className="px-3.5 text-[#7D8091] hover:text-white transition cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-4 bg-white hover:bg-white/90 disabled:opacity-50 text-[#060608] font-display text-xs font-extrabold uppercase tracking-[0.22em] flex items-center justify-center gap-2.5 transition cursor-pointer"
            >
              {authLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING ADMIN...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>ENTER ADMIN DASHBOARD</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-display uppercase tracking-[0.18em] text-[#686B7A]">
            <span>ADMIN ACCESS POINT // /admin</span>
            <span>REAL-TIME SIGNALR</span>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================================================
     VIEW 2: AUTHENTICATED SALES ADMIN — REAL-TIME COMMAND DASHBOARD (/admin)
     ========================================================================= */
  const navItems: {
    id: AdminSection;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
  }[] = [
    {
      id: 'overview',
      label: 'SALES OVERVIEW',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'orders',
      label: 'LIVE ORDERS & COD',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge:
        newOrderIds.length > 0
          ? `${newOrderIds.length} NEW`
          : metrics.pendingOrdersCount > 0
          ? metrics.pendingOrdersCount
          : undefined,
    },
    {
      id: 'products',
      label: 'PRODUCTS & DROPS',
      icon: <Package className="w-4 h-4" />,
      badge: products.length,
    },
    {
      id: 'inventory',
      label: 'INVENTORY MATRIX',
      icon: <Layers className="w-4 h-4" />,
      badge:
        metrics.lowStockVariants.length > 0
          ? `${metrics.lowStockVariants.length} LOW`
          : undefined,
    },
    {
      id: 'categories',
      label: 'CATEGORIES',
      icon: <FolderPlus className="w-4 h-4" />,
      badge: categories.length,
    },
    {
      id: 'promos',
      label: 'PROMO CODES',
      icon: <Tag className="w-4 h-4" />,
      badge: promoCodes.filter((p) => p.isActive).length || undefined,
    },
    {
      id: 'chat',
      label: 'LIVE SUPPORT CHAT',
      icon: <MessageSquare className="w-4 h-4" />,
      badge:
        totalUnreadChats > 0
          ? `${totalUnreadChats} NEW`
          : chatThreads.length > 0
          ? chatThreads.length
          : undefined,
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#050507] text-[#F4F4F6] flex flex-col lg:flex-row">
      {/* =====================================================================
          LEFT SALES ADMIN SIDEBAR
          ===================================================================== */}
      <aside className="w-full lg:w-72 xl:w-80 bg-[#090A0F] border-b lg:border-b-0 lg:border-r border-white/[0.1] flex flex-col justify-between shrink-0 lg:sticky lg:top-0 lg:h-screen">
        <div>
          <div className="p-6 border-b border-white/[0.08] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/kf-mark.svg"
                  alt="KF"
                  className="h-7 w-auto object-contain"
                />
                <div>
                  <span className="font-brand text-xs font-extrabold uppercase tracking-[0.2em] text-white block">
                    KHALIFA WEAR
                  </span>
                  <span className="font-display text-[9px] uppercase tracking-[0.24em] text-emerald-400 font-bold block">
                    SALES ADMIN PORTAL
                  </span>
                </div>
              </div>

              {/* Live SignalR Telemetry Pill */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 border text-[9px] font-display font-bold uppercase tracking-[0.18em] ${
                  signalRStatus === 'connected'
                    ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                    : signalRStatus === 'connecting' ||
                      signalRStatus === 'reconnecting'
                    ? 'bg-amber-500/10 border-amber-500/35 text-amber-300'
                    : 'bg-white/[0.05] border-white/15 text-[#8E92A4]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    signalRStatus === 'connected'
                      ? 'bg-emerald-400 animate-pulse'
                      : signalRStatus === 'connecting' ||
                        signalRStatus === 'reconnecting'
                      ? 'bg-amber-400 animate-ping'
                      : 'bg-zinc-500'
                  }`}
                />
                <span>
                  {signalRStatus === 'connected'
                    ? 'SIGNALR LIVE'
                    : signalRStatus === 'reconnecting'
                    ? 'SYNCING...'
                    : 'LIVE FEED'}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-white/[0.03] border border-white/[0.08] space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-display font-bold uppercase tracking-[0.18em] text-emerald-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>SALES ADMINISTRATOR</span>
              </div>
              <p className="font-brand text-xs font-bold text-white uppercase tracking-wider truncate">
                {session?.fullName}
              </p>
              <p className="text-[11px] text-[#8E92A4] truncate">
                {session?.email}
              </p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setErrorMsg(null);
                    setStatusMsg(null);
                  }}
                  className={`w-full px-4 py-3.5 flex items-center justify-between text-left font-display text-[11px] font-bold uppercase tracking-[0.18em] transition cursor-pointer ${
                    isActive
                      ? 'bg-white text-[#060608] shadow-[0_8px_25px_rgba(255,255,255,0.12)]'
                      : 'text-[#9EA2B3] hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-[#060608] text-white'
                          : String(item.badge).includes('NEW')
                          ? 'bg-emerald-500 text-[#060608] animate-pulse'
                          : String(item.badge).includes('LOW')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                          : 'bg-white/[0.08] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={handleAdminLogout}
            className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-200 font-display text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>SIGN OUT OF ADMIN</span>
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MAIN INTERACTIVE WORKSPACE
          ===================================================================== */}
      <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 space-y-8 overflow-y-auto">
        {/* REAL-TIME SIGNALR INCOMING ORDER TOAST BANNER */}
        {liveBannerOrder && (
          <div className="p-5 bg-emerald-500/15 border-2 border-emerald-400/60 text-white shadow-[0_20px_50px_rgba(16,185,129,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 bg-emerald-400 text-[#060608] flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-400 text-[#060608] font-display text-[9px] font-extrabold uppercase tracking-[0.2em]">
                    LIVE SIGNALR ORDER ARRIVED
                  </span>
                  <span className="font-mono text-xs text-emerald-200">
                    ORDER #{liveBannerOrder.id}
                  </span>
                </div>
                <p className="font-brand text-sm sm:text-base font-bold uppercase tracking-wide text-white mt-1">
                  {liveBannerOrder.customerName} ({liveBannerOrder.customerCity}) —{' '}
                  {liveBannerOrder.orderTotal.toLocaleString()} EGP
                </p>
                <p className="text-xs text-emerald-100/80 mt-0.5">
                  Phone: {liveBannerOrder.customerPhoneNo} • Address:{' '}
                  {liveBannerOrder.shippingAddress}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveSection('orders');
                  handleInspectOrder(liveBannerOrder.id);
                }}
                className="px-4 py-2.5 bg-white text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-[0.2em] cursor-pointer"
              >
                INSPECT ORDER #{liveBannerOrder.id}
              </button>
              <button
                type="button"
                onClick={() => setLiveBannerOrder(null)}
                className="p-2 text-emerald-200 hover:text-white cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* REAL-TIME SIGNALR INCOMING CUSTOMER CHAT MESSAGE BANNER */}
        {liveBannerChatMsg && (
          <div className="p-4 bg-amber-500/15 border-2 border-amber-400/60 text-white shadow-[0_16px_40px_rgba(245,158,11,0.2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 bg-amber-400 text-[#060608] flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-400 text-[#060608] font-display text-[9px] font-extrabold uppercase tracking-[0.2em]">
                    LIVE CUSTOMER CHAT MESSAGE
                  </span>
                  <span className="font-display text-xs font-bold text-amber-200">
                    {liveBannerChatMsg.senderName}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-white mt-1 line-clamp-2">
                  &ldquo;{liveBannerChatMsg.text}&rdquo;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedChatThreadId(liveBannerChatMsg.threadId);
                  setActiveSection('chat');
                  setLiveBannerChatMsg(null);
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-[0.2em] cursor-pointer"
              >
                OPEN CHAT &amp; REPLY
              </button>
              <button
                type="button"
                onClick={() => setLiveBannerChatMsg(null)}
                className="p-2 text-amber-200 hover:text-white cursor-pointer"
                aria-label="Dismiss chat notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Bar: Active Section Header + Instant Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-display font-bold uppercase tracking-[0.24em] text-[#8E92A4]">
              <Radio
                className={`w-3.5 h-3.5 ${
                  signalRStatus === 'connected'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              />
              <span>
                REAL-TIME STORE TELEMETRY //{' '}
                {signalRStatus === 'connected'
                  ? 'INSTANT SIGNALR PUSH ACTIVE'
                  : 'LIVE SYNC'}
              </span>
            </div>
            <h1 className="font-brand text-2xl sm:text-3xl font-extrabold uppercase tracking-wider text-white mt-1">
              {activeSection === 'overview' && 'SALES & DISPATCH OVERVIEW'}
              {activeSection === 'orders' && 'LIVE ORDERS & COD DISPATCH'}
              {activeSection === 'products' && 'CATALOG & DROP PUBLISHER'}
              {activeSection === 'inventory' && 'INVENTORY & SIZE MATRIX'}
              {activeSection === 'categories' && 'STOREFRONT CATEGORIES'}
              {activeSection === 'promos' && 'PROMO CODES & DISCOUNTS'}
              {activeSection === 'chat' && 'LIVE CUSTOMER SUPPORT CONCIERGE'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                loadOrders();
                loadPromoCodes();
                loadAllStocksSnapshot();
                onRefreshStoreData();
                if (selectedProductIdForStock) {
                  loadStocksForProduct(selectedProductIdForStock);
                }
              }}
              className="px-4 py-2.5 bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.14] text-white font-display text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 transition cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingOrders ? 'animate-spin' : ''}`}
              />
              <span>SYNC DATA</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-red-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {statusMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{statusMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMsg(null)}
              className="text-emerald-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ===================================================================
            MODULE 1: SALES OVERVIEW & REAL-TIME ANALYTICS
            =================================================================== */}
        {activeSection === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
              <div className="p-6 bg-[#0A0B0F] border border-white/[0.12] flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E92A4]">
                    TOTAL ORDER VOLUME
                  </span>
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="font-brand text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {metrics.totalRevenue.toLocaleString()}{' '}
                    <span className="text-xs font-display text-[#8E92A4]">
                      EGP
                    </span>
                  </p>
                  <p className="text-[11px] text-[#8E92A4] mt-1">
                    Collected COD:{' '}
                    <strong className="text-emerald-300">
                      {metrics.collectedRevenue.toLocaleString()} EGP
                    </strong>
                  </p>
                </div>
              </div>

              <div className="p-6 bg-[#0A0B0F] border border-white/[0.12] flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E92A4]">
                    PENDING COD PIPELINE
                  </span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="font-brand text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">
                    {metrics.pendingCodRevenue.toLocaleString()}{' '}
                    <span className="text-xs font-display text-[#8E92A4]">
                      EGP
                    </span>
                  </p>
                  <p className="text-[11px] text-[#8E92A4] mt-1">
                    <strong className="text-white">
                      {metrics.pendingOrdersCount}
                    </strong>{' '}
                    awaiting cash collection •{' '}
                    <strong className="text-emerald-300">
                      {metrics.paidOrdersCount}
                    </strong>{' '}
                    paid
                  </p>
                </div>
              </div>

              <div className="p-6 bg-[#0A0B0F] border border-white/[0.12] flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E92A4]">
                    TOTAL ORDERS &amp; UNITS
                  </span>
                  <ShoppingBag className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-brand text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {metrics.totalOrders}{' '}
                    <span className="text-xs font-display text-[#8E92A4]">
                      ORDERS
                    </span>
                  </p>
                  <p className="text-[11px] text-[#8E92A4] mt-1">
                    <strong className="text-white">
                      {metrics.totalUnitsOrdered}
                    </strong>{' '}
                    streetwear pieces ordered
                  </p>
                </div>
              </div>

              <div className="p-6 bg-[#0A0B0F] border border-white/[0.12] flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E92A4]">
                    LIVE INVENTORY HEALTH
                  </span>
                  <AlertTriangle
                    className={`w-4 h-4 ${
                      metrics.lowStockVariants.length > 0
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="font-brand text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {metrics.totalStockUnits.toLocaleString()}{' '}
                    <span className="text-xs font-display text-[#8E92A4]">
                      IN STOCK
                    </span>
                  </p>
                  <p className="text-[11px] text-[#8E92A4] mt-1">
                    <strong className="text-amber-300">
                      {metrics.lowStockVariants.length}
                    </strong>{' '}
                    low stock •{' '}
                    <strong className="text-red-400">
                      {metrics.outOfStockVariants.length}
                    </strong>{' '}
                    sold out
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8 bg-[#0A0B0F] border border-white/[0.12] p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h2 className="font-brand text-base font-bold uppercase tracking-wider text-white">
                      LIVE INCOMING ORDER STREAM
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSection('orders')}
                    className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 hover:text-white transition cursor-pointer"
                  >
                    VIEW ALL ({orders.length}) →
                  </button>
                </div>

                {orders.length === 0 ? (
                  <div className="py-14 text-center space-y-2">
                    <ShoppingBag className="w-8 h-8 text-[#5E6170] mx-auto" />
                    <p className="font-brand text-xs uppercase tracking-wider text-white">
                      WAITING FOR CUSTOMER ORDERS
                    </p>
                    <p className="text-xs text-[#7D8091]">
                      As soon as a customer places an order, it will appear here
                      instantly via SignalR.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] text-[10px] font-display uppercase tracking-[0.2em] text-[#7D8091]">
                          <th className="py-3 pr-4">ORDER</th>
                          <th className="py-3 pr-4">CUSTOMER &amp; CITY</th>
                          <th className="py-3 pr-4">ITEMS</th>
                          <th className="py-3 pr-4">TOTAL</th>
                          <th className="py-3 pr-4">COD STATUS</th>
                          <th className="py-3 text-right">ACTION</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {orders.slice(0, 8).map((order) => {
                          const isNew = newOrderIds.includes(order.id);
                          return (
                            <tr
                              key={order.id}
                              className={`transition ${
                                isNew
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                                  : 'hover:bg-white/[0.02]'
                              }`}
                            >
                              <td className="py-3.5 pr-4 font-mono font-bold text-white">
                                <div className="flex items-center gap-2">
                                  <span>#{order.id}</span>
                                  {isNew && (
                                    <span className="px-1.5 py-0.5 bg-emerald-400 text-[#060608] font-display text-[8px] font-extrabold uppercase tracking-wider">
                                      NEW LIVE
                                    </span>
                                  )}
                                </div>
                                <span className="block text-[10px] text-[#7D8091] font-sans font-normal">
                                  {new Date(order.orderDate).toLocaleString()}
                                </span>
                              </td>
                              <td className="py-3.5 pr-4">
                                <p className="font-semibold text-white">
                                  {order.customerName}
                                </p>
                                <p className="text-[11px] text-[#8E92A4]">
                                  {order.customerCity} • {order.customerPhoneNo}
                                </p>
                              </td>
                              <td className="py-3.5 pr-4 font-display text-white">
                                {order.totalItemsCount ?? order.itemsCount ?? 1}{' '}
                                pcs
                              </td>
                              <td className="py-3.5 pr-4 font-display font-bold text-white">
                                {order.orderTotal.toLocaleString()} EGP
                              </td>
                              <td className="py-3.5 pr-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-display font-bold uppercase tracking-[0.18em] border ${
                                    order.paid
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                                  }`}
                                >
                                  {order.paid ? 'PAID (COD)' : 'PENDING COD'}
                                </span>
                              </td>
                              <td className="py-3.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleInspectOrder(order.id)}
                                  className="px-3 py-1.5 bg-white/[0.07] hover:bg-white hover:text-[#060608] text-white font-display text-[10px] font-bold uppercase tracking-[0.16em] transition cursor-pointer"
                                >
                                  INSPECT
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="xl:col-span-4 space-y-6">
                <div className="bg-[#0A0B0F] border border-white/[0.12] p-6 space-y-4">
                  <h3 className="font-brand text-sm font-bold uppercase tracking-wider text-white border-b border-white/[0.08] pb-3">
                    REGIONAL DEMAND BY CITY
                  </h3>
                  {metrics.topCities.length === 0 ? (
                    <p className="text-xs text-[#7D8091]">
                      Regional order distribution will populate as orders arrive.
                    </p>
                  ) : (
                    <div className="space-y-3.5">
                      {metrics.topCities.map((c) => {
                        const pct =
                          metrics.totalRevenue > 0
                            ? Math.round(
                                (c.revenue / metrics.totalRevenue) * 100
                              )
                            : 0;
                        return (
                          <div key={c.city} className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-display font-bold uppercase tracking-wider text-white">
                                {c.city} ({c.count} orders)
                              </span>
                              <span className="text-[#9EA2B3]">
                                {c.revenue.toLocaleString()} EGP ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full bg-white transition-all duration-500"
                                style={{ width: `${Math.max(8, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-[#0A0B0F] border border-white/[0.12] p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                    <h3 className="font-brand text-sm font-bold uppercase tracking-wider text-white">
                      LOW-STOCK RADAR (≤ 5 UNITS)
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection('inventory')}
                      className="text-[10px] font-display font-bold uppercase tracking-wider text-amber-300 hover:text-white cursor-pointer"
                    >
                      MATRIX →
                    </button>
                  </div>

                  {metrics.lowStockVariants.length === 0 &&
                  metrics.outOfStockVariants.length === 0 ? (
                    <p className="text-xs text-emerald-300">
                      All size variants across the store are well stocked.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {[
                        ...metrics.outOfStockVariants,
                        ...metrics.lowStockVariants,
                      ]
                        .slice(0, 8)
                        .map((st) => (
                          <div
                            key={st.id}
                            className="p-3 bg-[#11131A] border border-white/[0.08] flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-white truncate">
                                {st.productName}
                              </p>
                              <p className="text-[10px] font-display uppercase tracking-wider text-[#8E92A4]">
                                SIZE: {st.size} • {st.colour}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedProductIdForStock(st.productId);
                                setActiveSection('inventory');
                              }}
                              className={`px-2.5 py-1 text-[10px] font-display font-bold uppercase tracking-wider shrink-0 cursor-pointer ${
                                st.quantityInStock === 0
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                              }`}
                            >
                              {st.quantityInStock === 0
                                ? 'SOLD OUT'
                                : `${st.quantityInStock} LEFT`}
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 2: LIVE ORDERS & COD DISPATCH CENTER
            =================================================================== */}
        {activeSection === 'orders' && (
          <div className="space-y-6">
            <div className="p-5 bg-[#0A0B0F] border border-white/[0.12] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { id: 'all', label: `ALL ORDERS (${orders.length})` },
                    {
                      id: 'pending',
                      label: `PENDING COD (${metrics.pendingOrdersCount})`,
                    },
                    {
                      id: 'paid',
                      label: `PAID / COLLECTED (${metrics.paidOrdersCount})`,
                    },
                  ] as { id: OrderFilterStatus; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setOrderFilter(tab.id)}
                    className={`px-4 py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] transition cursor-pointer ${
                      orderFilter === tab.id
                        ? 'bg-white text-[#060608]'
                        : 'bg-white/[0.04] text-[#9EA2B3] hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex items-center bg-[#11131A] border border-white/[0.14] focus-within:border-white min-w-[240px] sm:min-w-[300px]">
                  <Search className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search Order #, Customer, Phone, City..."
                    className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-[#5E6170] outline-none"
                  />
                  {orderSearch && (
                    <button
                      type="button"
                      onClick={() => setOrderSearch('')}
                      className="px-3 text-[#7D8091] hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={orders.length === 0}
                  onClick={handleExportOrdersCsv}
                  className="px-4 py-2.5 bg-white/[0.06] hover:bg-white hover:text-[#060608] disabled:opacity-40 border border-white/[0.14] text-white font-display text-[10px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-2 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT CSV</span>
                </button>
              </div>
            </div>

            <div className="bg-[#0A0B0F] border border-white/[0.12] overflow-hidden">
              {loadingOrders && orders.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#8E92A4] flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>LOADING STORE ORDERS...</span>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <ShoppingBag className="w-8 h-8 text-[#5E6170] mx-auto" />
                  <p className="font-brand text-sm uppercase tracking-wider text-white">
                    NO MATCHING ORDERS FOUND
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/[0.1] bg-[#0D0F15] text-[10px] font-display uppercase tracking-[0.2em] text-[#8E92A4]">
                        <th className="py-4 px-5">ORDER ID &amp; DATE</th>
                        <th className="py-4 px-5">CUSTOMER</th>
                        <th className="py-4 px-5">PHONE &amp; CITY</th>
                        <th className="py-4 px-5">DELIVERY ADDRESS</th>
                        <th className="py-4 px-5">ITEMS</th>
                        <th className="py-4 px-5">TOTAL (COD)</th>
                        <th className="py-4 px-5">STAGE &amp; COD</th>
                        <th className="py-4 px-5 text-right">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06] text-xs">
                      {filteredOrders.map((order) => {
                        const isNew = newOrderIds.includes(order.id);
                        const currentStage =
                          order.orderStatus ||
                          (order.paid ? 'Delivered' : 'Pending');
                        return (
                          <tr
                            key={order.id}
                            className={`transition ${
                              isNew
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                                : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <td className="py-4 px-5 font-mono font-bold text-white">
                              <div className="flex items-center gap-2">
                                <span>#{order.id}</span>
                                {isNew && (
                                  <span className="px-1.5 py-0.5 bg-emerald-400 text-[#060608] font-display text-[8px] font-extrabold uppercase tracking-wider">
                                    NEW LIVE
                                  </span>
                                )}
                              </div>
                              <span className="block text-[10px] text-[#7D8091] font-sans font-normal mt-0.5">
                                {new Date(order.orderDate).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-4 px-5">
                              <p className="font-bold text-white">
                                {order.customerName}
                              </p>
                              <p className="text-[11px] text-[#8E92A4]">
                                {order.customerEmail}
                              </p>
                            </td>
                            <td className="py-4 px-5">
                              <p className="text-white font-medium">
                                {order.customerPhoneNo || '—'}
                              </p>
                              <p className="text-[11px] text-amber-300 font-display uppercase tracking-wider">
                                {order.customerCity || 'Cairo'}
                              </p>
                            </td>
                            <td className="py-4 px-5 max-w-[240px]">
                              <p className="text-xs text-[#D0D3E0] line-clamp-2">
                                {order.shippingAddress || '—'}
                              </p>
                            </td>
                            <td className="py-4 px-5 font-display text-white">
                              {order.totalItemsCount ?? order.itemsCount ?? 1} pcs
                            </td>
                            <td className="py-4 px-5 font-display font-bold text-white">
                              <div>{order.orderTotal.toLocaleString()} EGP</div>
                              {order.promoCode && (
                                <span className="text-[9px] text-emerald-400 uppercase">
                                  PROMO: {order.promoCode}
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-5">
                              <div className="flex flex-col gap-1.5">
                                <select
                                  value={currentStage}
                                  disabled={updatingPaymentOrderId === order.id}
                                  onChange={(e) =>
                                    handleUpdateOrderStatus(
                                      order.id,
                                      e.target.value as OrderFulfillmentStatus
                                    )
                                  }
                                  className="bg-[#11131A] border border-white/20 px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-wider text-white outline-none cursor-pointer"
                                >
                                  <option value="Pending">PENDING</option>
                                  <option value="Confirmed">CONFIRMED</option>
                                  <option value="Shipped">SHIPPED</option>
                                  <option value="Delivered">DELIVERED (PAID)</option>
                                  <option value="Cancelled">CANCELLED (RESTOCK)</option>
                                </select>
                                <button
                                  type="button"
                                  disabled={updatingPaymentOrderId === order.id}
                                  onClick={() =>
                                    handleToggleOrderPaid(order.id, !order.paid)
                                  }
                                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[9px] font-display font-bold uppercase tracking-[0.16em] border transition cursor-pointer ${
                                    order.paid
                                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25'
                                      : 'bg-amber-500/15 text-amber-300 border-amber-400/35 hover:bg-amber-500/25'
                                  }`}
                                >
                                  {updatingPaymentOrderId === order.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : order.paid ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Banknote className="w-3 h-3" />
                                  )}
                                  <span>
                                    {order.paid ? 'PAID (COD)' : 'PENDING COD'}
                                  </span>
                                </button>
                              </div>
                            </td>
                            <td className="py-4 px-5 text-right">
                              <button
                                type="button"
                                onClick={() => handleInspectOrder(order.id)}
                                className="px-3.5 py-2 bg-white text-[#060608] hover:bg-white/90 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] transition cursor-pointer"
                              >
                                VIEW ITEMS
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 3: CATALOG & MULTI-SIZE DROP PUBLISHER
            =================================================================== */}
        {activeSection === 'products' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-6 bg-[#0A0B0F] border border-white/[0.12] p-6 sm:p-8 space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] pb-4">
                <div>
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300 block">
                    {editingProductId !== null
                      ? `EDITING PRODUCT #${editingProductId}`
                      : 'NEW STREETWEAR DROP'}
                  </span>
                  <h2 className="font-brand text-lg font-bold uppercase tracking-wider text-white mt-1">
                    {editingProductId !== null
                      ? 'UPDATE PRODUCT, COLORWAYS & STOCK'
                      : 'PUBLISH PRODUCT, COLORWAYS & STOCK'}
                  </h2>
                </div>

                {editingProductId !== null && (
                  <button
                    type="button"
                    onClick={handleResetProductForm}
                    className="px-3 py-1.5 bg-white/[0.07] hover:bg-red-500/20 border border-white/15 hover:border-red-400/50 text-white hover:text-red-300 font-display text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {loadingEditProduct ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                    <span>CANCEL EDIT</span>
                  </button>
                )}
              </div>

              <form onSubmit={handlePublishProduct} className="space-y-4">
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                    BASE PRODUCT NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. KF Signature 500GSM Hoodie"
                    className="w-full bg-[#11131A] border border-white/[0.14] focus:border-white px-3.5 py-3 text-xs text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                    SPECIFICATIONS &amp; FABRIC DETAILS
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="500 GSM 100% Egyptian combed cotton fleece..."
                    className="w-full bg-[#11131A] border border-white/[0.14] focus:border-white px-3.5 py-3 text-xs text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                      CATEGORY
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(Number(e.target.value))}
                      className="w-full bg-[#11131A] border border-white/[0.14] focus:border-white px-3.5 py-3 text-xs text-white outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-[#0A0B0F]">
                          {c.categoryName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                      UNIT PRICE (EGP)
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/[0.14] focus:border-white px-3.5 py-3 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                      STOREFRONT STATUS
                    </label>
                    <button
                      type="button"
                      onClick={() => setProductAvailable((prev) => !prev)}
                      className={`w-full px-3.5 py-3 border font-display text-[10px] font-extrabold uppercase tracking-[0.18em] transition cursor-pointer ${
                        productAvailable
                          ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
                          : 'bg-red-500/15 border-red-400/50 text-red-300'
                      }`}
                    >
                      {productAvailable ? 'AVAILABLE IN STORE' : 'HIDDEN / UNAVAILABLE'}
                    </button>
                  </div>
                </div>

                {/* MULTI-COLORWAY & MULTI-IMAGE BUILDER */}
                <div className="space-y-4 pt-2 border-t border-white/[0.08]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5" />
                        <span>COLORWAYS, SWATCH CIRCLES &amp; IMAGES ({colorwayDrafts.length})</span>
                      </span>
                      <p className="text-[11px] text-[#8E92A4] mt-0.5">
                        Add every available color for this product. Each color renders as a clickable circle on the storefront and switches the product photo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddColorwayDraft}
                      className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-[0.18em] flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ ADD COLORWAY &amp; IMAGE</span>
                    </button>
                  </div>

                  {/* Quick Import / Merge from another single-color product card */}
                  {products.length > 1 && (
                    <div className="p-3 bg-[#11131A]/90 border border-amber-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="min-w-0">
                        <span className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-amber-300 block">
                          MERGE EXISTING COLOR PRODUCT INTO THIS ITEM
                        </span>
                        <p className="text-[10px] text-[#9EA2B3]">
                          Import another product card&apos;s color, photo &amp; size stocks as a colorway here.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={importSourceProductId}
                          onChange={(e) =>
                            setImportSourceProductId(e.target.value)
                          }
                          className="bg-[#0A0B0F] border border-white/15 px-2.5 py-1.5 text-[11px] text-white outline-none max-w-[200px]"
                        >
                          <option value="">Select product to import...</option>
                          {products
                            .filter((p) => p.id !== editingProductId)
                            .map((p) => (
                              <option key={p.id} value={p.id} className="bg-[#0A0B0F]">
                                #{p.id} {p.productName} ({p.colour})
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          disabled={!importSourceProductId}
                          onClick={() => handleImportColorwayFromProduct(false)}
                          className="px-2.5 py-1.5 bg-white/10 hover:bg-white hover:text-[#060608] disabled:opacity-40 text-white font-display text-[9px] font-bold uppercase tracking-wider transition cursor-pointer"
                          title="Copy colorway & image into this product"
                        >
                          IMPORT
                        </button>
                        <button
                          type="button"
                          disabled={!importSourceProductId}
                          onClick={() => handleImportColorwayFromProduct(true)}
                          className="px-2.5 py-1.5 bg-amber-400/20 hover:bg-amber-400 hover:text-[#060608] disabled:opacity-40 text-amber-300 border border-amber-400/40 font-display text-[9px] font-bold uppercase tracking-wider transition cursor-pointer"
                          title="Import colorway & delete the separate product card"
                        >
                          MERGE &amp; REMOVE OLD
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
                    {colorwayDrafts.map((draft, idx) => (
                      <div
                        key={draft.id}
                        className="p-4 bg-[#11131A] border border-white/[0.12] space-y-3.5"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-white/[0.07] pb-2.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-5 h-5 rounded-full border border-white/40 shrink-0 shadow-sm"
                              style={{ backgroundColor: draft.colorHex }}
                            />
                            <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.2em] text-white">
                              COLORWAY #{idx + 1} {idx === 0 ? '(PRIMARY DEFAULT)' : ''}
                            </span>
                          </div>
                          {colorwayDrafts.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveColorwayDraft(draft.id)}
                              className="px-2 py-1 text-[9px] font-display font-bold uppercase tracking-wider text-red-300 hover:text-white hover:bg-red-500/30 border border-red-400/30 transition cursor-pointer"
                            >
                              REMOVE COLOR
                            </button>
                          )}
                        </div>

                        {/* Color Name + Circle Swatch Hex Picker */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                          <div className="sm:col-span-8">
                            <label className="block font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                              COLOR NAME
                            </label>
                            <input
                              type="text"
                              required
                              value={draft.colour}
                              onChange={(e) =>
                                handleColorwayNameChange(draft.id, e.target.value)
                              }
                              placeholder="e.g. Obsidian Black, Heather Grey, Baby Blue"
                              className="w-full bg-[#0A0B0F] border border-white/15 focus:border-white px-3 py-2 text-xs text-white outline-none"
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                              CIRCLE SWATCH COLOR
                            </label>
                            <div className="flex items-center gap-2 bg-[#0A0B0F] border border-white/15 px-2.5 py-1.5">
                              <input
                                type="color"
                                value={draft.colorHex}
                                onChange={(e) =>
                                  handleColorwayHexChange(draft.id, e.target.value)
                                }
                                className="w-6 h-6 rounded-full border-0 bg-transparent cursor-pointer p-0"
                                title="Pick swatch circle color"
                              />
                              <input
                                type="text"
                                value={draft.colorHex}
                                onChange={(e) =>
                                  handleColorwayHexChange(draft.id, e.target.value)
                                }
                                className="w-full bg-transparent text-[11px] font-mono text-white outline-none uppercase"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Quick Streetwear Swatch Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[9px] font-display font-bold uppercase tracking-wider text-[#7D8091] mr-1">
                            PRESETS:
                          </span>
                          {STREETWEAR_COLOUR_PRESETS.map((preset) => (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => {
                                handleColorwayNameChange(draft.id, preset.name);
                                handleColorwayHexChange(draft.id, preset.hex);
                              }}
                              className="px-2 py-0.5 bg-[#0A0B0F] hover:bg-white/10 border border-white/10 text-[9px] text-[#C8CAD8] flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-white/30"
                                style={{ backgroundColor: preset.hex }}
                              />
                              <span>{preset.name}</span>
                            </button>
                          ))}
                        </div>

                        {/* Image Upload + Per-Size Stock Matrix for this Colorway */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                          <div className="sm:col-span-5">
                            <label className="block font-display text-[9px] font-bold uppercase tracking-[0.18em] text-[#9EA2B3] mb-1">
                              IMAGE FOR {draft.colour || `COLOR #${idx + 1}`}
                            </label>
                            <label className="flex flex-col items-center justify-center p-3 border border-dashed border-white/25 hover:border-amber-300 bg-[#0A0B0F] cursor-pointer transition min-h-[116px]">
                              {draft.imagePreview ? (
                                <img
                                  src={draft.imagePreview}
                                  alt={draft.colour}
                                  className="h-20 w-auto object-contain mb-1.5"
                                />
                              ) : (
                                <Upload className="w-5 h-5 text-[#8E92A4] mb-1.5" />
                              )}
                              <span className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-amber-300 text-center line-clamp-1">
                                {draft.imageFile
                                  ? draft.imageFile.name
                                  : draft.existingImageUrl
                                  ? 'CHANGE COLOR IMAGE'
                                  : 'UPLOAD COLOR IMAGE'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleColorwayImageSelect(draft.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>

                          <div className="sm:col-span-7 flex flex-col justify-between bg-[#0A0B0F] border border-white/10 p-3">
                            <span className="font-display text-[9px] font-bold uppercase tracking-[0.18em] text-white block mb-2">
                              STOCK QUANTITY PER SIZE ({draft.colour || 'COLOR'})
                            </span>
                            <div className="grid grid-cols-5 gap-1.5">
                              {STANDARD_SIZES.map((sz) => (
                                <div key={sz} className="text-center">
                                  <label className="block font-display text-[9px] font-bold text-[#9EA2B3] mb-1">
                                    {sz}
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={draft.sizeQuantities[sz] ?? 0}
                                    onChange={(e) =>
                                      handleColorwaySizeQtyChange(
                                        draft.id,
                                        sz,
                                        Number(e.target.value) || 0
                                      )
                                    }
                                    className="w-full bg-[#11131A] border border-white/15 focus:border-amber-300 py-1.5 text-center text-xs font-bold text-white outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] text-[#8E92A4] mt-2 block text-right">
                              Subtotal:{' '}
                              <strong className="text-white">
                                {STANDARD_SIZES.reduce(
                                  (acc, sz) => acc + (draft.sizeQuantities[sz] ?? 0),
                                  0
                                )}{' '}
                                units
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPublishingProduct}
                  className="w-full py-4 bg-white hover:bg-amber-300 disabled:opacity-50 text-[#060608] font-display text-xs font-extrabold uppercase tracking-[0.22em] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isPublishingProduct ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {editingProductId !== null
                          ? 'SAVING PRODUCT & COLORWAYS...'
                          : 'PUBLISHING DROP...'}
                      </span>
                    </>
                  ) : editingProductId !== null ? (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE PRODUCT CHANGES &amp; COLORWAYS</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>PUBLISH PRODUCT &amp; COLORWAYS</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="xl:col-span-6 bg-[#0A0B0F] border border-white/[0.12] p-6 sm:p-8 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-[#8E92A4] block">
                    LIVE STOREFRONT CATALOG
                  </span>
                  <h2 className="font-brand text-lg font-bold uppercase tracking-wider text-white mt-0.5">
                    ACTIVE PRODUCTS ({filteredProducts.length})
                  </h2>
                </div>

                <div className="relative flex items-center bg-[#11131A] border border-white/[0.14] focus-within:border-white min-w-[220px]">
                  <Search className="w-3.5 h-3.5 text-[#7D8091] ml-3 shrink-0" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Filter products..."
                    className="w-full bg-transparent px-2.5 py-2 text-xs text-white placeholder-[#5E6170] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[780px] overflow-y-auto pr-1">
                {filteredProducts.map((prod) => {
                  const variants = getProductColorVariants(prod);
                  const activeColourName =
                    selectedAdminCardColours[prod.id] ||
                    variants[0]?.colour ||
                    prod.colour ||
                    '';
                  const activeVariant =
                    variants.find(
                      (v) =>
                        v.colour.toLowerCase() === activeColourName.toLowerCase()
                    ) || variants[0];
                  const cardImg = resolveProductImage(
                    activeVariant?.image || prod.image,
                    prod.id
                  );
                  const isBeingEdited = editingProductId === prod.id;

                  return (
                    <div
                      key={prod.id}
                      className={`bg-[#11131A] border transition flex flex-col justify-between overflow-hidden ${
                        isBeingEdited
                          ? 'border-amber-400 ring-1 ring-amber-400/40'
                          : 'border-white/[0.09] hover:border-white/25'
                      }`}
                    >
                      <div className="flex gap-4 p-4">
                        <img
                          src={cardImg}
                          alt={prod.productName}
                          className="w-20 h-24 object-cover bg-[#060608] border border-white/10 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[9px] font-display font-bold uppercase tracking-[0.2em] text-[#8E92A4] truncate">
                              {prod.categoryName}
                            </span>
                            {isBeingEdited && (
                              <span className="px-1.5 py-0.5 bg-amber-400/20 text-amber-300 font-display text-[8px] font-bold uppercase">
                                EDITING
                              </span>
                            )}
                          </div>
                          <h3 className="font-brand text-xs font-bold uppercase tracking-wide text-white truncate">
                            {prod.productName}
                          </h3>
                          <p className="font-display text-xs font-extrabold text-amber-300">
                            {prod.unitPrice.toLocaleString()} EGP
                          </p>

                          {/* Interactive Colored Circle Swatches */}
                          <div className="pt-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {variants.map((v) => {
                                const isSel =
                                  v.colour.toLowerCase() ===
                                  activeColourName.toLowerCase();
                                return (
                                  <button
                                    key={v.colour}
                                    type="button"
                                    onClick={() =>
                                      setSelectedAdminCardColours((prev) => ({
                                        ...prev,
                                        [prod.id]: v.colour,
                                      }))
                                    }
                                    title={v.colour}
                                    className={`w-4 h-4 rounded-full transition-transform cursor-pointer ${
                                      isSel
                                        ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#11131A] scale-110'
                                        : 'opacity-80 hover:opacity-100 hover:scale-105 border border-white/30'
                                    }`}
                                    style={{
                                      backgroundColor:
                                        v.colorHex || resolveColourHex(v.colour),
                                    }}
                                  />
                                );
                              })}
                            </div>
                            <p className="text-[10px] text-[#9EA2B3] truncate">
                              {activeVariant?.colour || prod.colour}
                              {variants.length > 1
                                ? ` • ${variants.length} colors`
                                : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="px-3.5 py-2.5 bg-[#0B0C11] border-t border-white/[0.06] flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleStartEditProduct(prod)}
                            className="px-2.5 py-1 bg-amber-400 text-[#060608] hover:bg-amber-300 font-display text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>EDIT</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onInspectProduct(prod.id, activeVariant?.colour)
                            }
                            className="px-2.5 py-1 bg-white/[0.06] hover:bg-white hover:text-[#060608] text-white font-display text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>PREVIEW</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductIdForStock(prod.id);
                              setActiveSection('inventory');
                            }}
                            className="px-2.5 py-1 bg-white/[0.06] hover:bg-amber-400 hover:text-[#060608] text-amber-300 font-display text-[9px] font-bold uppercase tracking-wider transition cursor-pointer"
                          >
                            STOCK
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteProduct(prod.id, prod.productName)
                          }
                          className="p-1.5 text-[#8E92A4] hover:text-red-400 transition cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 4: INVENTORY & SIZE MATRIX
            =================================================================== */}
        {activeSection === 'inventory' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-4 bg-[#0A0B0F] border border-white/[0.12] p-6 space-y-4">
              <h2 className="font-brand text-sm font-bold uppercase tracking-wider text-white border-b border-white/[0.08] pb-3">
                SELECT PRODUCT TO MANAGE STOCK
              </h2>
              <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {products.map((prod) => {
                  const isSelected = prod.id === selectedProductIdForStock;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setSelectedProductIdForStock(prod.id)}
                      className={`w-full p-3 flex items-center gap-3 text-left border transition cursor-pointer ${
                        isSelected
                          ? 'bg-white text-[#060608] border-white'
                          : 'bg-[#11131A] text-white border-white/[0.08] hover:border-white/30'
                      }`}
                    >
                      <img
                        src={resolveProductImage(prod.image, prod.id)}
                        alt={prod.productName}
                        className="w-11 h-12 object-cover bg-[#060608] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-brand text-xs font-bold uppercase tracking-wide truncate">
                          {prod.productName}
                        </p>
                        <p
                          className={`text-[10px] font-display uppercase tracking-wider ${
                            isSelected ? 'text-[#060608]/70' : 'text-[#8E92A4]'
                          }`}
                        >
                          {prod.categoryName} • {prod.unitPrice.toLocaleString()}{' '}
                          EGP
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="xl:col-span-8 space-y-6">
              <div className="bg-[#0A0B0F] border border-white/[0.12] p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300 block">
                      LIVE DATABASE STOCK MATRIX
                    </span>
                    <h2 className="font-brand text-lg font-bold uppercase tracking-wider text-white mt-0.5">
                      {products.find((p) => p.id === selectedProductIdForStock)
                        ?.productName || 'SELECTED PRODUCT'}
                    </h2>
                  </div>
                </div>

                {loadingStocks ? (
                  <div className="py-12 text-center text-xs text-[#8E92A4]">
                    LOADING SIZE VARIANTS...
                  </div>
                ) : productStocks.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#8E92A4]">
                    No size variants registered for this product yet. Add one
                    below.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productStocks.map((st) => {
                      const draftQty =
                        stockDrafts[st.id] ?? st.quantityInStock;
                      return (
                        <div
                          key={st.id}
                          className="p-4 bg-[#11131A] border border-white/[0.1] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white text-[#060608] font-brand text-sm font-extrabold flex items-center justify-center shrink-0">
                              {st.size}
                            </div>
                            <div>
                              <p className="font-brand text-xs font-bold uppercase tracking-wider text-white">
                                SIZE {st.size} — {st.colour}
                              </p>
                              <p className="text-[11px] text-[#8E92A4] mt-0.5">
                                Database Stock:{' '}
                                <strong
                                  className={
                                    st.quantityInStock === 0
                                      ? 'text-red-400'
                                      : st.quantityInStock <= 5
                                      ? 'text-amber-300'
                                      : 'text-emerald-300'
                                  }
                                >
                                  {st.quantityInStock} units
                                </strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveStockRow(st, draftQty - 1)
                              }
                              disabled={savingStockId === st.id || draftQty <= 0}
                              className="w-9 h-9 bg-white/[0.06] hover:bg-white hover:text-[#060608] text-white font-bold text-sm transition cursor-pointer disabled:opacity-40"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={draftQty}
                              onChange={(e) =>
                                setStockDrafts((prev) => ({
                                  ...prev,
                                  [st.id]: Math.max(
                                    0,
                                    Number(e.target.value) || 0
                                  ),
                                }))
                              }
                              className="w-20 bg-[#060608] border border-white/20 py-2 text-center text-xs font-bold text-white outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                handleSaveStockRow(st, draftQty + 1)
                              }
                              disabled={savingStockId === st.id}
                              className="w-9 h-9 bg-white/[0.06] hover:bg-white hover:text-[#060608] text-white font-bold text-sm transition cursor-pointer disabled:opacity-40"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveStockRow(st, draftQty)}
                              disabled={savingStockId === st.id}
                              className="px-3.5 py-2 bg-white text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>SAVE</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStockVariant(st.id)}
                              className="p-2 text-[#8E92A4] hover:text-red-400 transition cursor-pointer"
                              title="Remove variant"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form
                  onSubmit={handleAddStockVariant}
                  className="pt-5 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
                >
                  <div>
                    <label className="block font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] mb-1">
                      SIZE
                    </label>
                    <select
                      value={newVariantSize}
                      onChange={(e) => setNewVariantSize(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 px-3 py-2.5 text-xs text-white outline-none"
                    >
                      {STANDARD_SIZES.map((sz) => (
                        <option key={sz} value={sz} className="bg-[#0A0B0F]">
                          {sz}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] mb-1">
                      COLOUR
                    </label>
                    <input
                      type="text"
                      required
                      value={newVariantColour}
                      onChange={(e) => setNewVariantColour(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-display text-[9px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] mb-1">
                      QUANTITY
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newVariantQty}
                      onChange={(e) => setNewVariantQty(e.target.value)}
                      className="w-full bg-[#11131A] border border-white/15 px-3 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="py-2.5 px-4 bg-white text-[#060608] font-display text-[10px] font-extrabold uppercase tracking-[0.2em] cursor-pointer"
                  >
                    + ADD VARIANT
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 5: STOREFRONT CATEGORIES
            =================================================================== */}
        {activeSection === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-[#0A0B0F] border border-white/[0.12] p-6 sm:p-8 space-y-5">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h2 className="font-brand text-lg font-bold uppercase tracking-wider text-white">
                  {editingCategoryId !== null
                    ? `EDIT CATEGORY #${editingCategoryId}`
                    : 'CREATE NEW CATEGORY'}
                </h2>
                {editingCategoryId !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategoryId(null);
                      setNewCategoryName('');
                      setNewCategoryDesc('');
                      setNewCategoryImageFile(null);
                      setNewCategoryImagePreview(null);
                    }}
                    className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-[10px] font-display font-bold uppercase tracking-wider text-white transition cursor-pointer"
                  >
                    CANCEL
                  </button>
                )}
              </div>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                    CATEGORY NAME
                  </label>
                  <input
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. JACKETS"
                    className="w-full bg-[#11131A] border border-white/15 px-3.5 py-3 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                    DESCRIPTION
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    placeholder="Category description..."
                    className="w-full bg-[#11131A] border border-white/15 px-3.5 py-3 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-1.5">
                    CATEGORY COVER IMAGE (SAVED IN DATABASE)
                  </label>
                  <div className="flex items-center gap-4 p-3 bg-[#11131A] border border-white/15">
                    <div className="w-16 h-20 bg-[#08090C] border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {newCategoryImagePreview ? (
                        <img
                          src={newCategoryImagePreview}
                          alt="Category preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src="/product-placeholder.svg"
                          alt="Placeholder"
                          className="w-full h-full object-cover opacity-50"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/[0.08] hover:bg-white hover:text-[#060608] text-white font-display text-[10px] font-bold uppercase tracking-[0.18em] transition cursor-pointer">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {newCategoryImagePreview
                            ? 'CHANGE IMAGE'
                            : 'UPLOAD IMAGE'}
                        </span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            if (!file) return;
                            setNewCategoryImageFile(file);
                            setNewCategoryImagePreview(
                              URL.createObjectURL(file)
                            );
                          }}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[10px] text-[#7D8091] truncate">
                        {newCategoryImageFile
                          ? newCategoryImageFile.name
                          : 'JPG, PNG, or WEBP (Max 8MB) • Stored in SQL Server'}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isCreatingCategory}
                  className="w-full py-3.5 bg-white text-[#060608] font-display text-xs font-extrabold uppercase tracking-[0.2em] cursor-pointer"
                >
                  {isCreatingCategory
                    ? 'SAVING...'
                    : editingCategoryId !== null
                    ? 'SAVE CATEGORY CHANGES'
                    : '+ CREATE CATEGORY'}
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 bg-[#0A0B0F] border border-white/[0.12] p-6 sm:p-8 space-y-4">
              <h2 className="font-brand text-lg font-bold uppercase tracking-wider text-white border-b border-white/[0.08] pb-3">
                ACTIVE CATEGORIES ({categories.length})
              </h2>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const catImg = cat.image
                    ? resolveProductImage(cat.image, cat.id)
                    : '/product-placeholder.svg';
                  return (
                    <div
                      key={cat.id}
                      className="p-4 bg-[#11131A] border border-white/[0.09] flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-16 bg-[#08090C] border border-white/10 overflow-hidden shrink-0">
                          <img
                            src={catImg}
                            alt={cat.categoryName}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                '/product-placeholder.svg';
                            }}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[10px] font-mono text-[#7D8091]">
                            ID #{cat.id}
                          </span>
                          <h3 className="font-brand text-sm font-bold uppercase tracking-wider text-white truncate">
                            {cat.categoryName}
                          </h3>
                          {cat.categoryDescription && (
                            <p className="text-xs text-[#8E92A4] mt-0.5 line-clamp-2">
                              {cat.categoryDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(cat.id);
                            setNewCategoryName(cat.categoryName);
                            setNewCategoryDesc(cat.categoryDescription || '');
                            setNewCategoryImageFile(null);
                            setNewCategoryImagePreview(
                              cat.image
                                ? resolveProductImage(cat.image, cat.id)
                                : null
                            );
                          }}
                          className="p-2 text-[#8E92A4] hover:text-white transition cursor-pointer"
                          title="Edit Category & Upload Image"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteCategory(cat.id, cat.categoryName)
                          }
                          className="p-2 text-[#8E92A4] hover:text-red-400 transition cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            MODULE 6: REAL-TIME SIGNALR CUSTOMER SUPPORT CHAT CONSOLE
            =================================================================== */}
        {activeSection === 'chat' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-[680px]">
            {/* Left Sidebar: Active Customer Threads */}
            <div className="xl:col-span-4 bg-[#0A0B0F] border border-white/[0.12] flex flex-col overflow-hidden">
              <div className="p-5 border-b border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300 block">
                      SIGNALR SUPPORT HUB
                    </span>
                    <h2 className="font-brand text-sm font-bold uppercase tracking-wider text-white mt-0.5">
                      CUSTOMER THREADS ({chatThreads.length})
                    </h2>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-[9px] font-display font-bold uppercase tracking-wider border ${
                      chatConnectionStatus === 'connected'
                        ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-400/35 text-amber-300'
                    }`}
                  >
                    {chatConnectionStatus === 'connected'
                      ? 'HUB LIVE'
                      : 'CONNECTING'}
                  </span>
                </div>

                <div className="relative flex items-center bg-[#11131A] border border-white/[0.14] focus-within:border-white">
                  <Search className="w-3.5 h-3.5 text-[#7D8091] ml-3 shrink-0" />
                  <input
                    type="text"
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search customer or message..."
                    className="w-full bg-transparent px-2.5 py-2 text-xs text-white placeholder-[#5E6170] outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/[0.06] max-h-[560px]">
                {filteredChatThreads.length === 0 ? (
                  <div className="p-10 text-center space-y-2">
                    <MessageSquare className="w-7 h-7 text-[#5E6170] mx-auto" />
                    <p className="font-brand text-xs uppercase tracking-wider text-white">
                      NO ACTIVE CONVERSATIONS YET
                    </p>
                    <p className="text-[11px] text-[#7D8091]">
                      When a shopper opens the Live Support widget on the
                      storefront, their conversation appears here in real time.
                    </p>
                  </div>
                ) : (
                  filteredChatThreads.map((thread) => {
                    const isSelected =
                      activeChatThread?.threadId.toLowerCase() ===
                      thread.threadId.toLowerCase();
                    const isTyping = Boolean(typingByThread[thread.threadId]);
                    return (
                      <button
                        key={thread.threadId}
                        type="button"
                        onClick={() => handleSelectChatThread(thread.threadId)}
                        className={`w-full p-4 text-left transition flex items-start justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-white/[0.09] border-l-2 border-l-amber-400'
                            : 'hover:bg-white/[0.03]'
                        }`}
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                thread.isCustomerOnline
                                  ? 'bg-emerald-400'
                                  : 'bg-[#5E6170]'
                              }`}
                              title={
                                thread.isCustomerOnline
                                  ? 'Customer Online'
                                  : 'Offline'
                              }
                            />
                            <span className="font-brand text-xs font-bold uppercase tracking-wide text-white truncate">
                              {thread.customerName}
                            </span>
                          </div>

                          {thread.customerEmail && (
                            <p className="text-[10px] text-amber-300/90 truncate">
                              {thread.customerEmail}
                            </p>
                          )}

                          <p className="text-xs text-[#9EA2B3] truncate">
                            {isTyping ? (
                              <span className="text-amber-300 font-semibold">
                                Customer is typing...
                              </span>
                            ) : (
                              thread.lastMessageText
                            )}
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[10px] text-[#6E7180]">
                            {new Date(thread.lastMessageAt).toLocaleTimeString(
                              [],
                              {
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                          {thread.unreadForAdminCount > 0 && (
                            <span className="px-2 py-0.5 bg-red-500 text-white font-display text-[9px] font-extrabold rounded-full">
                              {thread.unreadForAdminCount} NEW
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Active Conversation Stream & Instant Reply */}
            <div className="xl:col-span-8 bg-[#0A0B0F] border border-white/[0.12] flex flex-col justify-between overflow-hidden">
              {!activeChatThread ? (
                <div className="my-auto p-12 text-center space-y-3">
                  <MessageSquare className="w-10 h-10 text-[#5E6170] mx-auto" />
                  <h3 className="font-brand text-sm font-bold uppercase tracking-wider text-white">
                    SELECT A CUSTOMER CONVERSATION
                  </h3>
                  <p className="text-xs text-[#8E92A4] max-w-md mx-auto">
                    Choose a customer thread from the left panel to view their
                    questions and reply in real time via SignalR.
                  </p>
                </div>
              ) : (
                <>
                  {/* Conversation Header */}
                  <div className="p-5 bg-[#11131A] border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white text-[#060608] font-brand text-xs font-extrabold flex items-center justify-center uppercase">
                        {activeChatThread.customerName.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-brand text-sm font-bold uppercase tracking-wider text-white">
                            {activeChatThread.customerName}
                          </h3>
                          <span
                            className={`px-2 py-0.5 text-[8px] font-display font-bold uppercase tracking-widest border ${
                              activeChatThread.isCustomerOnline
                                ? 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300'
                                : 'bg-white/5 border-white/15 text-[#8E92A4]'
                            }`}
                          >
                            {activeChatThread.isCustomerOnline
                              ? 'ONLINE NOW'
                              : 'OFFLINE'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8E92A4]">
                          {activeChatThread.customerEmail
                            ? `Registered Account: ${activeChatThread.customerEmail}`
                            : `Session ID: ${activeChatThread.threadId}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => chatClientRef.current?.refreshThreads()}
                      className="px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-[10px] font-display font-bold uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>SYNC THREAD</span>
                    </button>
                  </div>

                  {/* Message History */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[430px] bg-[#08090D]">
                    {activeChatThread.messages.map((msg) => {
                      const isAdmin = msg.senderRole === 'Admin';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${
                            isAdmin ? 'items-end' : 'items-start'
                          }`}
                        >
                          <span className="font-display text-[9px] font-bold uppercase tracking-wider text-[#7D8091] mb-1 px-1">
                            {isAdmin
                              ? `${msg.senderName} (ADMIN)`
                              : `${msg.senderName} (CUSTOMER)`}
                          </span>
                          <div
                            className={`max-w-[78%] px-4 py-3 text-xs leading-relaxed ${
                              isAdmin
                                ? 'bg-amber-400 text-[#060608] font-medium'
                                : 'bg-[#141722] text-white border border-white/15'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">
                              {msg.text}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 px-1 text-[10px] text-[#6E7180]">
                            <span>
                              {new Date(msg.sentAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isAdmin && (
                              <CheckCheck
                                className={`w-3.5 h-3.5 ${
                                  msg.isReadByCustomer
                                    ? 'text-emerald-400'
                                    : 'text-[#6E7180]'
                                }`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {typingByThread[activeChatThread.threadId] && (
                      <div className="flex items-center gap-2 text-xs text-amber-300 bg-[#141722] border border-amber-400/25 px-3.5 py-2 w-fit">
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                        <span>
                          {activeChatThread.customerName} is typing...
                        </span>
                      </div>
                    )}

                    <div ref={chatMessagesEndRef} />
                  </div>

                  {/* Quick Replies + Input Form */}
                  <div className="p-4 bg-[#11131A] border-t border-white/[0.08] space-y-3">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <span className="font-display text-[9px] font-bold uppercase tracking-wider text-amber-300 shrink-0 mr-1">
                        QUICK REPLIES:
                      </span>
                      {ADMIN_QUICK_REPLIES.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleSendAdminChatReply(preset)}
                          className="px-2.5 py-1 bg-[#0A0B0F] hover:bg-white hover:text-[#060608] border border-white/15 text-[10px] text-[#D0D3E0] whitespace-nowrap transition cursor-pointer shrink-0"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendAdminChatReply();
                      }}
                      className="flex items-center gap-2.5"
                    >
                      <input
                        type="text"
                        value={chatReplyInput}
                        onChange={(e) =>
                          handleAdminTypingChange(e.target.value)
                        }
                        placeholder={`Reply to ${activeChatThread.customerName}...`}
                        className="flex-1 bg-[#0A0B0F] border border-white/15 focus:border-amber-300 px-4 py-3 text-xs text-white placeholder-[#666A7A] outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!chatReplyInput.trim() || sendingChatReply}
                        className="px-5 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-[#060608] font-display text-xs font-extrabold uppercase tracking-[0.2em] flex items-center gap-2 transition cursor-pointer shrink-0"
                      >
                        {sendingChatReply ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        <span>SEND REPLY</span>
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            SECTION 5B: PROMO CODES & DISCOUNT CAMPAIGNS MANAGER
            =================================================================== */}
        {activeSection === 'promos' && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            {/* LEFT: CREATE / UPDATE PROMO CODE FORM */}
            <div className="xl:col-span-5 bg-[#0C0D12] border border-white/[0.1] p-6 sm:p-8 space-y-6">
              <div>
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300 block">
                  INSTANT CHECKOUT PROMO ENGINE
                </span>
                <h2 className="font-brand text-xl font-extrabold uppercase tracking-wider text-white mt-1">
                  CREATE OR UPDATE PROMO CODE
                </h2>
                <p className="text-xs text-[#8E92A4] mt-1">
                  Create percentage discounts, fixed EGP coupons, or free
                  governorate delivery codes. Active codes appear immediately in
                  the customer checkout drawer.
                </p>
              </div>

              <form onSubmit={handleCreatePromoCode} className="space-y-4">
                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8BCCB] mb-2">
                    PROMO CODE (NO SPACES)
                  </label>
                  <input
                    type="text"
                    required
                    value={newPromoCode}
                    onChange={(e) =>
                      setNewPromoCode(
                        e.target.value.toUpperCase().replace(/\s+/g, '')
                      )
                    }
                    placeholder="e.g. VIP20, RAMADAN15, DROP300"
                    className="w-full bg-[#12141C] border border-white/15 focus:border-amber-300 px-4 py-3 text-sm font-mono font-bold text-white uppercase tracking-wider outline-none"
                  />
                </div>

                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8BCCB] mb-2">
                    DISCOUNT TYPE
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'Percentage', label: '% PERCENTAGE' },
                        { id: 'FixedAmount', label: 'FIXED EGP' },
                        { id: 'FreeShipping', label: 'FREE SHIPPING' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setNewPromoType(opt.id);
                          if (opt.id === 'Percentage') setNewPromoValue('15');
                          if (opt.id === 'FixedAmount') setNewPromoValue('200');
                          if (opt.id === 'FreeShipping') setNewPromoValue('0');
                        }}
                        className={`py-2.5 px-2 font-display text-[10px] font-extrabold uppercase tracking-wider border transition cursor-pointer ${
                          newPromoType === opt.id
                            ? 'bg-amber-400 text-[#060608] border-amber-300'
                            : 'bg-[#12141C] text-[#9EA2B3] border-white/15 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {newPromoType !== 'FreeShipping' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8BCCB] mb-2">
                        {newPromoType === 'Percentage'
                          ? 'DISCOUNT PERCENTAGE (%)'
                          : 'DISCOUNT AMOUNT (EGP)'}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={newPromoType === 'Percentage' ? 95 : 10000}
                        required
                        value={newPromoValue}
                        onChange={(e) => setNewPromoValue(e.target.value)}
                        className="w-full bg-[#12141C] border border-white/15 focus:border-amber-300 px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8BCCB] mb-2">
                        MIN. ORDER SUBTOTAL (EGP)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newPromoMinSubtotal}
                        onChange={(e) => setNewPromoMinSubtotal(e.target.value)}
                        placeholder="0 for no minimum"
                        className="w-full bg-[#12141C] border border-white/15 focus:border-amber-300 px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                  </div>
                )}

                {newPromoType === 'FreeShipping' && (
                  <div>
                    <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8BCCB] mb-2">
                      MIN. ORDER SUBTOTAL FOR FREE DELIVERY (EGP)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newPromoMinSubtotal}
                      onChange={(e) => setNewPromoMinSubtotal(e.target.value)}
                      placeholder="0 for any order"
                      className="w-full bg-[#12141C] border border-white/15 focus:border-amber-300 px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#B8BCCB] mb-2">
                    OFFER DESCRIPTION (SHOWN ON LANDING PAGE &amp; CHECKOUT)
                  </label>
                  <input
                    type="text"
                    value={newPromoDesc}
                    onChange={(e) => setNewPromoDesc(e.target.value)}
                    placeholder="e.g. 10% OFF ALL HOODIES, FREE EXPRESS DELIVERY, 200 EGP OFF ORDERS ABOVE 2,000 EGP"
                    className="w-full bg-[#12141C] border border-white/15 focus:border-amber-300 px-4 py-3 text-xs text-white outline-none"
                  />
                </div>

                <label className="flex items-center justify-between gap-3 p-3.5 bg-[#12141C] border border-amber-400/30 cursor-pointer">
                  <div>
                    <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-300 block">
                      DISPLAY ON LANDING PAGE BANNER
                    </span>
                    <span className="text-[11px] text-[#8E92A4] block mt-0.5">
                      Show this offer description and code in the top announcement bar on the storefront
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newPromoFeaturedOnBanner}
                    onChange={(e) =>
                      setNewPromoFeaturedOnBanner(e.target.checked)
                    }
                    className="w-4 h-4 accent-amber-400 cursor-pointer shrink-0"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSavingPromo}
                  className="w-full py-4 bg-white hover:bg-amber-300 text-[#060608] font-display text-xs font-extrabold uppercase tracking-[0.22em] flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {isSavingPromo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SAVING PROMO CODE...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>SAVE &amp; PUBLISH PROMO CODE</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* RIGHT: EXISTING PROMO CODES TABLE */}
            <div className="xl:col-span-7 bg-[#0C0D12] border border-white/[0.1] p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400 block">
                    ACTIVE &amp; PAUSED COUPONS • LANDING PAGE BANNER CONTROL
                  </span>
                  <h2 className="font-brand text-xl font-extrabold uppercase tracking-wider text-white mt-1">
                    STOREFRONT PROMO CODES ({promoCodes.length})
                  </h2>
                </div>
              </div>

              {loadingPromos ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-[#8E92A4]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading promo codes...</span>
                </div>
              ) : promoCodes.length === 0 ? (
                <div className="p-8 border border-white/[0.08] text-center text-xs text-[#8E92A4]">
                  No promo codes found. Create your first code on the left!
                </div>
              ) : (
                <div className="space-y-3">
                  {promoCodes.map((p) => (
                    <div
                      key={p.id}
                      className={`p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        p.isFeaturedOnBanner && p.isActive
                          ? 'bg-[#151722] border-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.08)]'
                          : p.isActive
                          ? 'bg-[#12141C] border-white/[0.12]'
                          : 'bg-white/[0.02] border-white/[0.06] opacity-60'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-amber-400/15 border border-amber-400/40 font-mono text-sm font-extrabold text-amber-300 tracking-wider">
                            {p.code}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[9px] font-display font-extrabold uppercase tracking-wider ${
                              p.isActive
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/30'
                                : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                            }`}
                          >
                            {p.isActive ? 'ACTIVE AT CHECKOUT' : 'PAUSED'}
                          </span>
                          {p.isFeaturedOnBanner && p.isActive && (
                            <span className="px-2.5 py-0.5 bg-amber-400 text-[#060608] text-[9px] font-display font-extrabold uppercase tracking-wider">
                              ★ DISPLAYED ON LANDING PAGE
                            </span>
                          )}
                          <span className="text-xs font-display font-bold text-white">
                            {p.discountType === 'Percentage'
                              ? `${p.discountValue}% OFF`
                              : p.discountType === 'FixedAmount'
                              ? `${p.discountValue.toLocaleString()} EGP OFF`
                              : 'FREE SHIPPING'}
                          </span>
                        </div>
                        <p className="text-xs text-[#D0D3E0]">
                          <strong className="text-white/70 font-display text-[10px] uppercase tracking-wider mr-1.5">
                            OFFER TEXT:
                          </strong>
                          {p.description || 'Storefront promo code'}
                          {p.minOrderSubtotal > 0
                            ? ` • Min. Subtotal: ${p.minOrderSubtotal.toLocaleString()} EGP`
                            : ' • No minimum order'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <button
                          type="button"
                          onClick={() => handleFeaturePromoCode(p.id)}
                          className={`px-3 py-2 font-display text-[10px] font-extrabold uppercase tracking-wider border transition cursor-pointer ${
                            p.isFeaturedOnBanner && p.isActive
                              ? 'bg-amber-400 text-[#060608] border-amber-300 hover:bg-amber-300'
                              : 'bg-white/[0.06] hover:bg-amber-400/20 text-amber-300 border-amber-400/35'
                          }`}
                          title="Choose whether this promo code and its description appear in the top banner on the landing page"
                        >
                          {p.isFeaturedOnBanner && p.isActive
                            ? '★ ON LANDING PAGE'
                            : 'SHOW ON LANDING'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewPromoCode(p.code);
                            setNewPromoType(
                              (p.discountType as
                                | 'Percentage'
                                | 'FixedAmount'
                                | 'FreeShipping') || 'Percentage'
                            );
                            setNewPromoValue(String(p.discountValue));
                            setNewPromoMinSubtotal(String(p.minOrderSubtotal));
                            setNewPromoDesc(p.description || '');
                            setNewPromoFeaturedOnBanner(
                              Boolean(p.isFeaturedOnBanner)
                            );
                          }}
                          className="p-2 bg-white/[0.05] hover:bg-white/15 border border-white/15 text-[#D0D3E0] hover:text-white transition cursor-pointer"
                          title="Edit Promo Code & Description"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePromoCode(p.id)}
                          className={`px-3 py-2 font-display text-[10px] font-bold uppercase tracking-wider border transition cursor-pointer ${
                            p.isActive
                              ? 'bg-white/[0.05] hover:bg-amber-500/20 text-[#D0D3E0] hover:text-amber-200 border-white/15'
                              : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-400/30'
                          }`}
                        >
                          {p.isActive ? 'PAUSE' : 'ACTIVATE'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePromoCode(p.id, p.code)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-300 transition cursor-pointer"
                          title="Delete Promo Code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          SLIDE-OVER ORDER INSPECTOR & COD DISPATCH DRAWER
          ===================================================================== */}
      {(inspectedOrder || loadingOrderDetail) && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl bg-[#0A0B0F] border-l border-white/[0.15] h-full flex flex-col justify-between p-6 sm:p-8 overflow-y-auto shadow-2xl">
            {loadingOrderDetail || !inspectedOrder ? (
              <div className="my-auto flex flex-col items-center justify-center gap-3 text-xs text-[#9EA2B3]">
                <Loader2 className="w-6 h-6 animate-spin text-white" />
                <span>LOADING ORDER DISPATCH SHEET...</span>
              </div>
            ) : (
              <>
                <div className="space-y-6">
                  <div className="flex items-start justify-between pb-5 border-b border-white/[0.1]">
                    <div>
                      <span className="font-display text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300 block">
                        CASH ON DELIVERY DISPATCH SHEET
                      </span>
                      <h2 className="font-brand text-xl font-extrabold uppercase tracking-wider text-white mt-1">
                        ORDER #{inspectedOrder.id}
                      </h2>
                      <p className="text-xs text-[#8E92A4] mt-0.5">
                        Placed on{' '}
                        {new Date(inspectedOrder.orderDate).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInspectedOrder(null)}
                      className="w-9 h-9 bg-white/[0.06] hover:bg-white text-white hover:text-[#060608] flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 bg-[#11131A] border border-white/[0.1] space-y-3">
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] block">
                      CUSTOMER &amp; SHIPPING DESTINATION
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[#7D8091] block text-[10px] uppercase">
                          RECIPIENT NAME
                        </span>
                        <strong className="text-white text-sm">
                          {inspectedOrder.customerName}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#7D8091] block text-[10px] uppercase">
                          PHONE NUMBER
                        </span>
                        <strong className="text-amber-300 text-sm">
                          {inspectedOrder.customerPhoneNo || '—'}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[#7D8091] block text-[10px] uppercase">
                          EMAIL
                        </span>
                        <span className="text-white">
                          {inspectedOrder.customerEmail}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#7D8091] block text-[10px] uppercase">
                          CITY / REGION
                        </span>
                        <strong className="text-white uppercase">
                          {inspectedOrder.customerCity || 'Cairo'}
                        </strong>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-white/[0.08]">
                      <span className="text-[#7D8091] block text-[10px] uppercase mb-1">
                        DETAILED DELIVERY ADDRESS
                      </span>
                      <p className="text-xs sm:text-sm text-white font-medium leading-relaxed">
                        {inspectedOrder.shippingAddress || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-[#8E92A4] block">
                      ORDERED ITEMS ({inspectedOrder.items?.length ?? 0})
                    </span>
                    <div className="space-y-2.5">
                      {inspectedOrder.items?.map((item) => (
                        <div
                          key={item.id}
                          className="p-3.5 bg-[#11131A] border border-white/[0.09] flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={resolveProductImage(
                                item.productImage ?? item.pictureUrl ?? null,
                                item.productId
                              )}
                              alt={item.productName}
                              className="w-14 h-16 object-cover bg-[#060608] border border-white/10 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-brand text-xs font-bold uppercase tracking-wide text-white truncate">
                                {item.productName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="px-2 py-0.5 bg-white text-[#060608] font-display text-[10px] font-extrabold uppercase">
                                  SIZE {item.size}
                                </span>
                                <span className="text-[11px] text-[#9EA2B3]">
                                  {item.colour}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#7D8091] mt-1">
                                {item.quantity} ×{' '}
                                {item.unitPrice.toLocaleString()} EGP
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-display text-xs font-bold text-white">
                              {item.total.toLocaleString()} EGP
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.12] space-y-4 mt-6">
                  {/* 5-Stage Fulfillment Status Selector */}
                  <div className="p-4 bg-[#11131A] border border-white/[0.1] space-y-2.5">
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300 block">
                      FULFILLMENT PIPELINE STAGE (CANCELLING AUTO-RESTOCKS INVENTORY)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(
                        [
                          'Pending',
                          'Confirmed',
                          'Shipped',
                          'Delivered',
                          'Cancelled',
                        ] as OrderFulfillmentStatus[]
                      ).map((st) => {
                        const active =
                          (inspectedOrder.orderStatus ||
                            (inspectedOrder.paid ? 'Delivered' : 'Pending')) ===
                          st;
                        return (
                          <button
                            key={st}
                            type="button"
                            disabled={updatingPaymentOrderId === inspectedOrder.id}
                            onClick={() =>
                              handleUpdateOrderStatus(inspectedOrder.id, st)
                            }
                            className={`py-2 px-2 font-display text-[10px] font-extrabold uppercase tracking-wider border transition cursor-pointer ${
                              active
                                ? st === 'Cancelled'
                                  ? 'bg-red-500 text-white border-red-400'
                                  : st === 'Delivered'
                                  ? 'bg-emerald-400 text-[#060608] border-emerald-300'
                                  : 'bg-white text-[#060608] border-white'
                                : 'bg-white/[0.04] text-[#9EA2B3] border-white/15 hover:text-white'
                            }`}
                          >
                            {st}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Subtotal, Promo Discount & Governorate Shipping Breakdown */}
                  <div className="space-y-1.5 text-xs">
                    {typeof inspectedOrder.shippingFee === 'number' && (
                      <div className="flex items-center justify-between text-[#9EA2B3]">
                        <span>
                          DELIVERY FEE ({inspectedOrder.customerCity || 'CAIRO'})
                        </span>
                        <span className="text-white font-display">
                          {inspectedOrder.shippingFee === 0
                            ? 'FREE'
                            : `${inspectedOrder.shippingFee} EGP`}
                        </span>
                      </div>
                    )}
                    {inspectedOrder.promoCode && (
                      <div className="flex items-center justify-between text-emerald-400">
                        <span>PROMO APPLIED ({inspectedOrder.promoCode})</span>
                        <span className="font-display font-bold">
                          -{(inspectedOrder.discountAmount ?? 0).toLocaleString()} EGP
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
                      <span className="font-display text-xs uppercase tracking-[0.2em] text-[#9EA2B3]">
                        CASH ON DELIVERY TOTAL
                      </span>
                      <span className="font-brand text-2xl font-extrabold text-white">
                        {inspectedOrder.orderTotal.toLocaleString()} EGP
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={updatingPaymentOrderId === inspectedOrder.id}
                      onClick={() =>
                        handleToggleOrderPaid(
                          inspectedOrder.id,
                          !inspectedOrder.paid
                        )
                      }
                      className={`py-3.5 px-3 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        inspectedOrder.paid
                          ? 'bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200'
                          : 'bg-emerald-400 hover:bg-emerald-300 text-[#060608]'
                      }`}
                    >
                      {updatingPaymentOrderId === inspectedOrder.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>
                        {inspectedOrder.paid ? 'MARK UNPAID' : 'MARK COD PAID'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintOrderWaybill(inspectedOrder)}
                      className="py-3.5 px-3 bg-white text-[#060608] hover:bg-white/90 font-display text-[10px] font-extrabold uppercase tracking-[0.18em] flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>PRINT WAYBILL</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInspectedOrder(null)}
                      className="py-3.5 px-3 bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white font-display text-[10px] font-bold uppercase tracking-[0.18em] transition cursor-pointer"
                    >
                      CLOSE SHEET
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
