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
import type { AuthResponseDto } from './services/authApi';
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

export function App() {
  const [activePage, setActivePage] = useState<ActivePage>('home');

  // Auth Session
  const [session, setSession] = useState<AuthResponseDto | null>(() => {
    const saved = localStorage.getItem('kf_auth_session');
    if (saved) {
      try {
        return JSON.parse(saved) as AuthResponseDto;
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

  // Shopping Bag State
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActivePage('shop');
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

  return (
    <div className="min-h-screen w-full bg-[#060608] text-[#F4F4F6] flex flex-col justify-between relative">
      {/* Global Streetwear Navigation Bar */}
      <Navbar
        activePage={activePage}
        onNavigate={handleNavigate}
        session={session}
        bagCount={totalBagCount}
        onOpenBag={() => setIsBagOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (activePage !== 'shop') setActivePage('shop');
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
            onSelectProduct={(id) => setInspectProductId(id)}
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
            onSelectProduct={(id) => setInspectProductId(id)}
          />
        )}

        {activePage === 'admin' && (
          <AdminPortalView
            session={session}
            categories={categories}
            products={catalogProducts}
            onRefreshStoreData={handleRefreshStoreData}
            onInspectProduct={(id) => setInspectProductId(id)}
            onGoToLogin={() => handleNavigate('auth')}
          />
        )}

        {activePage === 'auth' && (
          <AuthView
            session={session}
            onSessionChange={setSession}
            onGoToShop={() =>
              session?.role === 'Admin'
                ? handleNavigate('admin')
                : handleNavigate('shop', null)
            }
          />
        )}
      </div>

      {/* Product Detail & Size/Color Stock Selector Modal */}
      <ProductDetailModal
        productId={inspectProductId}
        onClose={() => setInspectProductId(null)}
        onAddToBag={handleAddToBag}
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
                      if (!session) {
                        handleNavigate('auth');
                      }
                    }}
                    className="w-full py-4 bg-white text-[#060608] font-display text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>
                      {session ? 'PROCEED TO CHECKOUT' : 'SIGN IN TO CHECKOUT'}
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

      {/* Global Brand Footer */}
      {activePage !== 'auth' && (
        <footer className="border-t border-white/[0.08] bg-[#040406] py-12 px-4 sm:px-8">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <img
                src="/kf-mark.png"
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
    </div>
  );
}

export default App;
