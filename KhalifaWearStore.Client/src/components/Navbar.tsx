import React, { useState } from 'react';
import {
  ShoppingBag,
  User,
  Search,
  X,
  Truck,
} from 'lucide-react';
import type { AuthResponseDto } from '../services/authApi';

export type ActivePage = 'home' | 'shop' | 'auth' | 'admin' | 'owner';

interface NavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage, categoryId?: number | null) => void;
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
      {/* Top Minimal Editorial Utility Bar */}
      <div className="w-full bg-[#030304] border-b border-white/[0.06] py-2 px-4 sm:px-8">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between text-[10px] font-display uppercase tracking-[0.22em] text-[#8E91A0]">
          <span>
            FREE EXPRESS DELIVERY ON ORDERS ABOVE 2,500 EGP • CODE:{' '}
            <strong className="text-white">KHALIFA10</strong>
          </span>
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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-20 grid grid-cols-3 items-center">
        {/* Left Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => onNavigate('home', null)}
            className={`relative py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] transition cursor-pointer ${
              activePage === 'home'
                ? 'text-white after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[1.5px] after:bg-white'
                : 'text-[#8E91A0] hover:text-white'
            }`}
          >
            HOME
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop', 1)}
            className="py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E91A0] hover:text-white transition cursor-pointer"
          >
            HOODIES
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop', 2)}
            className="py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E91A0] hover:text-white transition cursor-pointer"
          >
            ZIP &amp; TECH
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop', null)}
            className={`relative py-1 font-display text-[11px] font-semibold uppercase tracking-[0.2em] transition cursor-pointer ${
              activePage === 'shop'
                ? 'text-white after:content-[""] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[1.5px] after:bg-white'
                : 'text-[#8E91A0] hover:text-white'
            }`}
          >
            CATALOG
          </button>
        </nav>

        {/* Mobile Left Menu Shortcut */}
        <div className="flex md:hidden items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home', null)}
            className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white"
          >
            HOME
          </button>
          <button
            type="button"
            onClick={() => onNavigate('shop', null)}
            className="font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8E91A0]"
          >
            SHOP
          </button>
        </div>

        {/* Center: Pure KF Graphic Mark (No Text) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => onNavigate('home', null)}
            className="group cursor-pointer focus:outline-none"
            aria-label="Khalifa Wear House Home"
          >
            <img
              src="/kf-mark.svg"
              alt="KF"
              className="h-9 sm:h-11 w-auto object-contain transition-transform duration-500 group-hover:scale-108"
            />
          </button>
        </div>

        {/* Right: Search, Login, Bag */}
        <div className="flex items-center justify-end gap-6">
          {searchOpen ? (
            <form
              onSubmit={(e) => {
                onSearchSubmit(e);
                setSearchOpen(false);
              }}
              className="flex items-center border-b border-white/60 pb-1 w-36 sm:w-52"
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
          ) : (
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8CAD4] hover:text-white transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">SEARCH</span>
            </button>
          )}

          {onOpenOrderTracker && (
            <button
              type="button"
              onClick={onOpenOrderTracker}
              className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C8CAD4] hover:text-emerald-300 transition cursor-pointer"
              title="Track Order & Order History"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden lg:inline">TRACK</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate('auth')}
            className={`inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] transition cursor-pointer ${
              activePage === 'auth'
                ? 'text-white underline underline-offset-8'
                : 'text-[#C8CAD4] hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {session ? session.fullName.split(' ')[0] : 'LOGIN'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenBag}
            className="inline-flex items-center gap-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-white hover:opacity-80 transition cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>BAG ({bagCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
