import React, { useState } from 'react';
import {
  ShoppingBag,
  User,
  Search,
  X,
  Truck,
} from 'lucide-react';
import type { AuthResponseDto } from '../services/authApi';
import type { CategoryDto, PromoCodeDto } from '../services/storeApi';

export type ActivePage = 'home' | 'shop' | 'auth' | 'admin' | 'owner';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage, categoryId?: number | null) => void;
  categories: CategoryDto[];
  selectedCategoryId: number | null;
  featuredPromo?: PromoCodeDto | null;
  session: AuthResponseDto | null;
  bagCount: number;
  onOpenBag: () => void;
  onOpenOrderTracker?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  categories,
  selectedCategoryId,
  featuredPromo,
  session,
  bagCount,
  onOpenBag,
  onOpenOrderTracker,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#060608]/90 backdrop-blur-xl border-b border-white/[0.08]">
      {/* Top Minimal Editorial Utility Bar — Dynamically synced with Admin-selected Promo Code */}
      <div className="w-full bg-[#030304] border-b border-white/[0.06] py-2 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-[10px] font-display uppercase tracking-[0.22em] text-[#8E91A0]">
          {featuredPromo && featuredPromo.isActive ? (
            <span>
              {featuredPromo.description ||
                (featuredPromo.discountType === 'Percentage'
                  ? `${featuredPromo.discountValue}% OFF`
                  : featuredPromo.discountType === 'FixedAmount'
                  ? `${featuredPromo.discountValue.toLocaleString()} EGP OFF`
                  : 'FREE EXPRESS DELIVERY')}{' '}
              • CODE: <strong className="text-amber-300">{featuredPromo.code}</strong>
            </span>
          ) : (
            <span>
              FREE EXPRESS DELIVERY ON ORDERS ABOVE 2,500 EGP • CAIRO ATELIER
            </span>
          )}
          <div className="hidden sm:flex items-center gap-5">
            {onOpenOrderTracker && (
              <>
                <button
                  type="button"
                  onClick={onOpenOrderTracker}
                  className="text-emerald-400 hover:text-white transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Truck className="w-3 h-3" />
                  <span>TRACK ORDER</span>
                </button>
                <span className="text-white/20">|</span>
              </>
            )}
            <button
              type="button"
              onClick={() => onNavigate('shop', null)}
              className="hover:text-white transition cursor-pointer"
            >
              ARCHIVE 2026
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={() => onNavigate('auth')}
              className="hover:text-white transition cursor-pointer"
            >
              MEMBER ACCESS
            </button>
            <span className="text-white/20">|</span>
            <span className="text-white">CAIRO, EG</span>
          </div>
        </div>
      </div>

      {/* Main Centered-Logo Editorial Navbar */}
      <div className="max-w-[1400px] mx-auto px-3.5 sm:px-8 h-16 sm:h-20 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
        {/* Left Navigation Links — Dynamically synced with Admin-managed Categories */}
        <nav className="hidden md:flex items-center gap-6 overflow-x-auto no-scrollbar min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home', null)}
            className={`relative py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] transition cursor-pointer shrink-0 ${
              activePage === 'home'
                ? 'text-white after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[1.5px] after:bg-white'
                : 'text-[#8E91A0] hover:text-white'
            }`}
          >
            HOME
          </button>
          {categories.slice(0, 4).map((cat) => {
            const isActiveCat =
              activePage === 'shop' && selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onNavigate('shop', cat.id)}
                className={`relative py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] transition cursor-pointer shrink-0 ${
                  isActiveCat
                    ? 'text-white after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[1.5px] after:bg-white'
                    : 'text-[#8E91A0] hover:text-white'
                }`}
              >
                {cat.categoryName}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onNavigate('shop', null)}
            className={`relative py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] transition cursor-pointer shrink-0 ${
              activePage === 'shop' && selectedCategoryId === null
                ? 'text-white after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[1.5px] after:bg-white'
                : 'text-[#8E91A0] hover:text-white'
            }`}
          >
            CATALOG
          </button>
        </nav>

        {/* Mobile Left Menu Shortcut */}
        <div className="flex md:hidden items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => onNavigate('home', null)}
            className={`font-display text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.18em] shrink-0 ${
              activePage === 'home' ? 'text-white' : 'text-[#8E91A0]'
            }`}
          >
            HOME
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop', null)}
            className={`font-display text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.15em] sm:tracking-[0.18em] shrink-0 ${
              activePage === 'shop' ? 'text-white' : 'text-[#8E91A0]'
            }`}
          >
            SHOP
          </button>
        </div>

        {/* Center: Pure KF Graphic Mark (No Text) */}
        <div className="flex items-center justify-center shrink-0 px-1">
          <button
            type="button"
            onClick={() => onNavigate('home', null)}
            className="group cursor-pointer focus:outline-none"
            aria-label="Khalifa Wear House Home"
          >
            <img
              src="/kf-mark.svg"
              alt="KF"
              className="h-7 sm:h-11 w-auto object-contain transition-transform duration-500 group-hover:scale-108"
            />
          </button>
        </div>

        {/* Right: Search, Track, Login, Bag */}
        <div className="flex items-center justify-end gap-2.5 sm:gap-5 lg:gap-6 min-w-0">
          {/* Desktop / Tablet inline search */}
          {searchOpen ? (
            <>
              <form
                onSubmit={(e) => {
                  onSearchSubmit(e);
                  setSearchOpen(false);
                }}
                className="hidden sm:flex items-center border-b border-white/60 pb-1 w-44 lg:w-52"
              >
                <Search className="w-3.5 h-3.5 text-white mr-2 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="SEARCH..."
                  className="bg-transparent text-[11px] font-display uppercase tracking-[0.18em] text-white placeholder-[#686B7A] focus:outline-none w-full"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className="text-[#8E91A0] hover:text-white ml-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </form>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="sm:hidden inline-flex items-center justify-center p-1 text-white hover:opacity-80 transition cursor-pointer shrink-0"
                aria-label="Close Search"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8CAD4] hover:text-white transition cursor-pointer shrink-0 p-1 sm:p-0"
              aria-label="Search"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SEARCH</span>
            </button>
          )}

          {onOpenOrderTracker && (
            <button
              type="button"
              onClick={onOpenOrderTracker}
              className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8CAD4] hover:text-emerald-300 transition cursor-pointer shrink-0 p-1 sm:p-0"
              title="Track Order & Order History"
              aria-label="Track Order"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">TRACK</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className={`inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] transition cursor-pointer shrink-0 p-1 sm:p-0 ${
              activePage === 'auth'
                ? 'text-white underline underline-offset-8'
                : 'text-[#C8CAD4] hover:text-white'
            }`}
            aria-label="Account"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {session ? session.fullName.split(' ')[0] : 'LOGIN'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenBag}
            className="inline-flex items-center gap-1 sm:gap-2 font-display text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-white hover:opacity-80 transition cursor-pointer shrink-0 whitespace-nowrap p-1 sm:p-0"
            aria-label="Shopping Bag"
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">BAG</span>
            <span>({bagCount})</span>
          </button>
        </div>
      </div>

      {/* Mobile Full-Width Search Drawer (prevents overlapping logo on narrow screens) */}
      {searchOpen && (
        <div className="sm:hidden border-t border-white/[0.08] bg-[#090A0E] px-4 py-2.5">
          <form
            onSubmit={(e) => {
              onSearchSubmit(e);
              setSearchOpen(false);
            }}
            className="flex items-center gap-2.5"
          >
            <Search className="w-3.5 h-3.5 text-white/70 shrink-0" />
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="SEARCH PRODUCTS..."
              className="bg-transparent text-xs font-display uppercase tracking-[0.16em] text-white placeholder-[#686B7A] focus:outline-none w-full"
            />
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="text-[#8E91A0] hover:text-white p-1 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </header>
  );
};
