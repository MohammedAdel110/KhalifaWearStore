import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { isJwtTokenExpired, type AuthResponseDto } from './services/authApi';
import {
  fetchCategories,
  fetchProducts,
  type CategoryDto,
  type ProductDto,
  type BagItem,
} from './services/storeApi';
import { Navbar, type ActivePage } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { ShopCatalogView } from './components/ShopCatalogView';
import { ProductDetailModal } from './components/ProductDetailModal';
import { AuthView } from './components/AuthView';
import { AdminPortalView } from './components/AdminPortalView';
import { OwnerPortalView } from './components/OwnerPortalView';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderTrackerModal } from './components/OrderTrackerModal';
import { CustomerSupportChatWidget } from './components/CustomerSupportChatWidget';

function resolvePageFromPath(pathname: string): ActivePage {
  const clean = pathname.toLowerCase().replace(/\/+$/, '');
  if (clean === '/owner') return 'owner';
  if (clean === '/admin') return 'admin';
  if (clean === '/shop') return 'shop';
  if (clean === '/auth') return 'auth';
  return 'home';
}

export function App() {
  const [activePage, setActivePage] = useState<ActivePage>(() =>
    resolvePageFromPath(window.location.pathname)
  );

  // Sync browser back/forward navigation with activePage
  useEffect(() => {
    const onPopState = () => {
      setActivePage(resolvePageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // 1. Customer Session (Storefront / & /auth)
  const [customerSession, setCustomerSession] = useState<AuthResponseDto | null>(() => {
    const saved = localStorage.getItem('kf_customer_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthResponseDto;
        if (parsed.role === 'Customer' && !isJwtTokenExpired(parsed.token)) {
          return parsed;
        }
        localStorage.removeItem('kf_customer_session');
        return null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // 2. Owner Session (Standalone Owner Portal /owner)
  const [ownerSession, setOwnerSession] = useState<AuthResponseDto | null>(() => {
    const saved = localStorage.getItem('kf_owner_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthResponseDto;
        return parsed.role === 'Owner' ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // 3. Sales Admin Session (Standalone Sales Admin Portal /admin)
  const [adminSession, setAdminSession] = useState<AuthResponseDto | null>(() => {
    const saved = localStorage.getItem('kf_admin_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AuthResponseDto;
        if (parsed.role === 'Admin' && !isJwtTokenExpired(parsed.token)) {
          return parsed;
        }
        localStorage.removeItem('kf_admin_session');
        return null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Storefront & Catalog State
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<ProductDto[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductDto[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loadingHome, setLoadingHome] = useState(true);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Catalog Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState('');

  // Product Detail Modal State
  const [inspectProductId, setInspectProductId] = useState<number | null>(null);
  const [inspectProductColour, setInspectProductColour] = useState<string | null>(null);

  // Shopping Bag & Checkout State
  const [bag, setBag] = useState<BagItem[]>(() => {
    const saved = localStorage.getItem('kf_shopping_bag');
    if (saved) {
      try {
        return JSON.parse(saved) as BagItem[];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isBagOpen, setIsBagOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrderTrackerOpen, setIsOrderTrackerOpen] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(false);
  const [directCheckoutItems, setDirectCheckoutItems] = useState<BagItem[] | null>(null);

  useEffect(() => {
    localStorage.setItem('kf_shopping_bag', JSON.stringify(bag));
  }, [bag]);

  const loadHomeData = useCallback(() => {
    setLoadingHome(true);
    Promise.all([fetchCategories(), fetchProducts({ pageIndex: 1, pageSize: 12 })])
      .then(([cats, prods]) => {
        setCategories(cats);
        setFeaturedProducts(prods.data);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingHome(false);
      });
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const loadCatalog = useCallback(() => {
    setLoadingCatalog(true);
    fetchProducts({
      categoryId: selectedCategoryId,
      search: searchQuery,
      size: selectedSize,
      onlyAvailable: onlyAvailable ? true : undefined,
      sort: sortBy,
      pageIndex: 1,
      pageSize: 24,
    })
      .then((res) => {
        setCatalogProducts(res.data);
        setCatalogTotal(res.totalCount);
      })
      .catch(() => {
        setCatalogProducts([]);
        setCatalogTotal(0);
      })
      .finally(() => {
        setLoadingCatalog(false);
      });
  }, [selectedCategoryId, searchQuery, selectedSize, onlyAvailable, sortBy]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const handleRefreshStoreData = () => {
    loadHomeData();
    loadCatalog();
  };

  const handleNavigate = (page: ActivePage, categoryId?: number | null) => {
    if (categoryId !== undefined) {
      setSelectedCategoryId(categoryId);
    }
    setActivePage(page);
    const targetPath =
      page === 'owner'
        ? '/owner'
        : page === 'admin'
        ? '/admin'
        : page === 'shop'
        ? '/shop'
        : page === 'auth'
        ? '/auth'
        : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleNavigate('shop');
  };

  const handleResetFilters = () => {
    setSelectedCategoryId(null);
    setSearchQuery('');
    setSelectedSize('');
    setOnlyAvailable(false);
    setSortBy('');
  };

  const handleAddToBag = (newItem: BagItem) => {
    setBag((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === newItem.productId &&
          item.size.toLowerCase() === newItem.size.toLowerCase() &&
          item.colour.toLowerCase() === newItem.colour.toLowerCase()
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const current = updated[existingIndex];
        updated[existingIndex] = {
          ...current,
          quantity: Math.min(current.maxStock, current.quantity + newItem.quantity),
        };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateBagQty = (stockId: number, delta: number) => {
    setBag((prev) =>
      prev
        .map((item) =>
          item.stockId === stockId
            ? {
                ...item,
                quantity: Math.min(item.maxStock, Math.max(0, item.quantity + delta)),
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveBagItem = (stockId: number) => {
    setBag((prev) => prev.filter((item) => item.stockId !== stockId));
  };

  const totalBagCount = bag.reduce((sum, i) => sum + i.quantity, 0);
  const bagSubtotal = bag.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

  // 1. Dedicated Standalone Owner Portal (/owner) — completely separate from client storefront & admin portal
  if (activePage === 'owner') {
    return (
      <OwnerPortalView
        session={ownerSession}
        onSessionChange={setOwnerSession}
      />
    );
  }

  // 2. Dedicated Standalone Sales Admin Portal (/admin) — completely separate from client storefront & owner portal
  if (activePage === 'admin') {
    return (
      <>
        <AdminPortalView
          session={adminSession}
          onSessionChange={setAdminSession}
          categories={categories}
          products={catalogProducts}
          onRefreshStoreData={handleRefreshStoreData}
          onInspectProduct={(id, colour) => {
            setInspectProductId(id);
            setInspectProductColour(colour ?? null);
          }}
        />
        <ProductDetailModal
          productId={inspectProductId}
          initialColour={inspectProductColour}
          onClose={() => {
            setInspectProductId(null);
            setInspectProductColour(null);
          }}
          onAddToBag={handleAddToBag}
        />
      </>
    );
  }

  // 3. Public Customer Storefront (/, /shop, /auth) — exclusively for Customers
  return (
    <div className="min-h-screen w-full bg-[#060608] text-[#F4F4F6] flex flex-col justify-between relative">
      {/* Global Streetwear Navigation Bar (Customer Storefront Only) */}
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        session={customerSession}
        bagCount={totalBagCount}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenOrderTracker={() => setIsOrderTrackerOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (activePage !== 'shop') handleNavigate('shop');
        }}
        onSearchSubmit={handleSearchSubmit}
      />

      {/* Active Page Router */}
      <div className="flex-1">
        {activePage === 'home' && (
          <HomeView
            categories={categories}
            featuredProducts={featuredProducts}
            loading={loadingHome}
            onExploreCatalog={(catId) => handleNavigate('shop', catId ?? null)}
            onSelectProduct={(id, colour) => {
              setInspectProductId(id);
              setInspectProductColour(colour ?? null);
            }}
          />
        )}

        {activePage === 'shop' && (
          <ShopCatalogView
            categories={categories}
            products={catalogProducts}
            totalCount={catalogTotal}
            loading={loadingCatalog}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedSize={selectedSize}
            onSelectSize={setSelectedSize}
            onlyAvailable={onlyAvailable}
            onToggleAvailable={() => setOnlyAvailable((v) => !v)}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onResetFilters={handleResetFilters}
            onSelectProduct={(id, colour) => {
              setInspectProductId(id);
              setInspectProductColour(colour ?? null);
            }}
          />
        )}

        {activePage === 'auth' && (
          <AuthView
            session={customerSession}
            onSessionChange={(newSession) => {
              setCustomerSession(newSession);
              if (
                newSession &&
                pendingCheckout &&
                ((directCheckoutItems && directCheckoutItems.length > 0) || bag.length > 0)
              ) {
                setPendingCheckout(false);
                handleNavigate('shop', null);
                setIsCheckoutOpen(true);
              }
            }}
            onGoToShop={() => {
              if (
                customerSession &&
                pendingCheckout &&
                ((directCheckoutItems && directCheckoutItems.length > 0) || bag.length > 0)
              ) {
                setPendingCheckout(false);
                handleNavigate('shop', null);
                setIsCheckoutOpen(true);
                return;
              }
              handleNavigate('shop', null);
            }}
          />
        )}
      </div>

      {/* Product Detail & Size/Color Stock Selector Modal */}
      <ProductDetailModal
        productId={inspectProductId}
        initialColour={inspectProductColour}
        onClose={() => {
          setInspectProductId(null);
          setInspectProductColour(null);
        }}
        onAddToBag={handleAddToBag}
        onCheckOutNow={(item) => {
          setDirectCheckoutItems([item]);
          setInspectProductId(null);
          setInspectProductColour(null);
          if (!customerSession) {
            setPendingCheckout(true);
            handleNavigate('auth');
          } else {
            setIsCheckoutOpen(true);
          }
        }}
      />

      {/* Slide-Out Shopping Bag Preview Drawer */}
      {isBagOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0A0B0F] border-l border-white/[0.12] h-full flex flex-col justify-between p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-white" />
                <h2 className="font-brand text-base font-bold uppercase tracking-wider text-white">
                  YOUR KHALIFA BAG ({totalBagCount})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsBagOpen(false)}
                className="w-9 h-9 rounded-full bg-white/[0.05] hover:bg-white text-white hover:text-[#060608] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bag.length === 0 ? (
              <div className="my-auto text-center space-y-4 py-12">
                <ShoppingBag className="w-12 h-12 text-[#555869] mx-auto" />
                <p className="font-brand text-sm font-bold uppercase tracking-wider text-white">
                  YOUR BAG IS EMPTY
                </p>
                <p className="text-xs text-[#8A8D9F] max-w-xs mx-auto">
                  Explore our 500 GSM heavyweight hoodies and select your size to add pieces to
                  your bag.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsBagOpen(false);
                    handleNavigate('shop', null);
                  }}
                  className="px-6 py-3 bg-white text-[#060608] font-display text-xs font-bold uppercase tracking-[0.18em] cursor-pointer"
                >
                  EXPLORE DROPS
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto py-5 space-y-4">
                  {bag.map((item) => (
                    <div
                      key={`${item.productId}-${item.size}-${item.colour}`}
                      className="flex gap-4 p-3.5 bg-white/[0.03] border border-white/[0.08]"
                    >
                      <img
                        src={item.image}
                        alt={item.productName}
                        className="w-20 h-24 object-cover bg-[#12131A] shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-brand text-xs font-bold uppercase text-white truncate">
                              {item.productName}
                            </h3>
                            <button
                              type="button"
                              onClick={() => handleRemoveBagItem(item.stockId)}
                              className="text-[#7D8091] hover:text-red-400 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="font-display text-[10px] uppercase tracking-wider text-[#9EA2B3] mt-1">
                            SIZE: <strong className="text-white">{item.size}</strong> •{' '}
                            {item.colour}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="inline-flex items-center bg-black/50 border border-white/10">
                            <button
                              type="button"
                              onClick={() => handleUpdateBagQty(item.stockId, -1)}
                              className="px-2 py-1 text-white/80 hover:text-white cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="px-2.5 font-brand text-xs font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateBagQty(item.stockId, 1)}
                              className="px-2 py-1 text-white/80 hover:text-white cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <span className="font-brand text-xs font-bold text-white">
                            {(item.unitPrice * item.quantity).toLocaleString()} EGP
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-5 border-t border-white/[0.1] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-xs uppercase tracking-[0.2em] text-[#9EA2B3]">
                      ESTIMATED SUBTOTAL
                    </span>
                    <span className="font-brand text-lg font-bold text-white">
                      {bagSubtotal.toLocaleString()} EGP
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsBagOpen(false);
                      setDirectCheckoutItems(null);
                      if (!customerSession) {
                        setPendingCheckout(true);
                        handleNavigate('auth');
                      } else {
                        setIsCheckoutOpen(true);
                      }
                    }}
                    className="w-full py-4 bg-white text-[#060608] font-display text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {customerSession ? 'PROCEED TO CHECKOUT' : 'SIGN IN TO CHECKOUT'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <p className="text-[10px] font-display uppercase tracking-[0.18em] text-[#7D8091] text-center flex items-center justify-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    VERIFIED STOCK RESERVATION
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout & Dispatch Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setDirectCheckoutItems(null);
        }}
        session={customerSession}
        bag={directCheckoutItems ?? bag}
        onUpdateQty={(stockId, delta) => {
          if (directCheckoutItems) {
            setDirectCheckoutItems((prev) =>
              prev
                ? prev
                    .map((item) =>
                      item.stockId === stockId
                        ? {
                            ...item,
                            quantity: Math.min(item.maxStock, Math.max(1, item.quantity + delta)),
                          }
                        : item
                    )
                : null
            );
          } else {
            handleUpdateBagQty(stockId, delta);
          }
        }}
        onRemoveItem={(stockId) => {
          if (directCheckoutItems) {
            const next = directCheckoutItems.filter((item) => item.stockId !== stockId);
            setDirectCheckoutItems(next.length > 0 ? next : null);
            if (next.length === 0) setIsCheckoutOpen(false);
          } else {
            handleRemoveBagItem(stockId);
          }
        }}
        onOrderSuccess={() => {
          if (directCheckoutItems) {
            setDirectCheckoutItems(null);
          } else {
            setBag([]);
          }
          handleRefreshStoreData();
        }}
        onRequireAuth={() => {
          setPendingCheckout(true);
          handleNavigate('auth');
        }}
      />

      {/* Live Shipment Tracker & Customer Order History Modal */}
      <OrderTrackerModal
        isOpen={isOrderTrackerOpen}
        onClose={() => setIsOrderTrackerOpen(false)}
        session={customerSession}
      />

      {/* Global Brand Footer */}
      {activePage !== 'auth' && (
        <footer className="border-t border-white/[0.08] bg-[#040406] py-12 px-4 sm:px-8">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <img
                src="/kf-mark.svg"
                alt="KF"
                className="h-7 w-auto object-contain"
              />
              <span className="text-xs font-display uppercase tracking-[0.18em] text-[#7D8091] border-l border-white/10 pl-5">
                MEN&apos;S HEAVYWEIGHT HOODIES &amp; URBAN STREETWEAR
              </span>
            </div>
            <p className="font-display text-[10px] uppercase tracking-[0.24em] text-[#686B7A]">
              KF // KHALIFA WEAR HOUSE © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      )}

      {/* Real-Time SignalR Customer Support Chat Widget */}
      <CustomerSupportChatWidget session={customerSession} />
    </div>
  );
}

export default App;
