import React, { useState } from 'react';
import {
  Search,
  SlidersHorizontal,
  Eye,
  RotateCcw,
  Sparkles,
  Check,
} from 'lucide-react';
import {
  resolveProductImage,
  getProductColorVariants,
  resolveColourHex,
  type CategoryDto,
  type ProductDto,
} from '../services/storeApi';

interface ShopCatalogViewProps {
  categories: CategoryDto[];
  products: ProductDto[];
  totalCount: number;
  loading: boolean;
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedSize: string;
  onSelectSize: (size: string) => void;
  onlyAvailable: boolean;
  onToggleAvailable: () => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onResetFilters: () => void;
  onSelectProduct: (productId: number, initialColour?: string) => void;
}

const SIZES = ['', 'S', 'M', 'L', 'XL', 'XXL'];

export const ShopCatalogView: React.FC<ShopCatalogViewProps> = ({
  categories,
  products,
  totalCount,
  loading,
  selectedCategoryId,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  selectedSize,
  onSelectSize,
  onlyAvailable,
  onToggleAvailable,
  sortBy,
  onSortChange,
  onResetFilters,
  onSelectProduct,
}) => {
  const [selectedCardColours, setSelectedCardColours] = useState<
    Record<number, string>
  >({});
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-24">
      {/* Page Header Banner */}
      <div className="glass-panel rounded-3xl border border-white/[0.1] p-6 sm:p-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.24em] text-[#9EA2B3] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-white" />
            KHALIFA WEAR HOUSE // OFFICIAL CATALOG
          </span>
          <h1 className="font-brand text-2xl sm:text-4xl font-extrabold uppercase tracking-wide text-white mt-1.5">
            MEN&apos;S HEAVYWEIGHT HOODIES &amp; STREETWEAR
          </h1>
          <p className="text-xs sm:text-sm text-[#9EA2B3] mt-2 max-w-2xl">
            Filter by division, oversized fit size, or availability. Select any piece to inspect
            live size &amp; colorway stock quantities.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-end">
          <div className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] font-brand text-xs font-bold uppercase tracking-wider text-white">
            {totalCount} {totalCount === 1 ? 'RELEASE' : 'RELEASES'}
          </div>
          {(selectedCategoryId !== null ||
            searchQuery !== '' ||
            selectedSize !== '' ||
            onlyAvailable ||
            sortBy !== '') && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-display font-bold uppercase tracking-wider text-white transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Filter & Search Studio Bar */}
      <div className="glass-panel rounded-3xl border border-white/[0.09] p-5 space-y-5">
        {/* Top Row: Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className={`px-4 py-2.5 rounded-xl font-brand text-[11px] font-bold uppercase tracking-[0.18em] transition cursor-pointer ${
              selectedCategoryId === null
                ? 'bg-white text-[#060608] shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                : 'bg-white/[0.04] text-[#9EA2B3] hover:text-white border border-white/[0.08]'
            }`}
          >
            ALL RELEASES
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl font-brand text-[11px] font-bold uppercase tracking-[0.18em] transition cursor-pointer ${
                selectedCategoryId === cat.id
                  ? 'bg-white text-[#060608] shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                  : 'bg-white/[0.04] text-[#9EA2B3] hover:text-white border border-white/[0.08]'
              }`}
            >
              {cat.categoryName}
            </button>
          ))}
        </div>

        {/* Bottom Row: Search Input + Size Pills + Availability + Sort */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-white/[0.07] items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative flex items-center rounded-xl bg-white/[0.03] border border-white/[0.1] silver-border-glow">
            <Search className="w-4 h-4 text-[#7D8091] ml-3.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search hoodie name, colour, 500 GSM..."
              className="w-full bg-transparent px-3 py-2.5 text-xs text-white placeholder-[#686B7A] focus:outline-none"
            />
          </div>

          {/* Size Filter Pills */}
          <div className="md:col-span-4 flex items-center gap-1.5 flex-wrap">
            <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[#7D8091] mr-1">
              SIZE:
            </span>
            {SIZES.map((sz) => (
              <button
                key={sz || 'ALL'}
                type="button"
                onClick={() => onSelectSize(sz)}
                className={`px-2.5 py-1.5 rounded-lg font-brand text-[10px] font-bold uppercase transition cursor-pointer ${
                  selectedSize === sz
                    ? 'bg-white text-[#060608]'
                    : 'bg-white/[0.04] text-[#9EA2B3] hover:text-white border border-white/[0.07]'
                }`}
              >
                {sz || 'ALL'}
              </button>
            ))}
          </div>

          {/* In-Stock Toggle & Sort Dropdown */}
          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-3">
            <button
              type="button"
              onClick={onToggleAvailable}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-display font-bold uppercase tracking-wider transition cursor-pointer ${
                onlyAvailable
                  ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300'
                  : 'bg-white/[0.03] border-white/[0.1] text-[#9EA2B3] hover:text-white'
              }`}
            >
              <Check className={`w-3.5 h-3.5 ${onlyAvailable ? 'opacity-100' : 'opacity-30'}`} />
              <span>IN STOCK ONLY</span>
            </button>

            <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.1] rounded-xl px-3 py-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#9EA2B3]" />
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-transparent text-xs font-display font-semibold uppercase tracking-wider text-white focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-[#0B0C10] text-white">
                  SORT: FEATURED
                </option>
                <option value="PriceAsc" className="bg-[#0B0C10] text-white">
                  PRICE: LOW → HIGH
                </option>
                <option value="PriceDesc" className="bg-[#0B0C10] text-white">
                  PRICE: HIGH → LOW
                </option>
                <option value="NameAsc" className="bg-[#0B0C10] text-white">
                  NAME: A → Z
                </option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-[430px] rounded-3xl bg-white/[0.03] border border-white/[0.07] animate-pulse"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="glass-panel rounded-3xl border border-white/[0.09] py-20 px-6 text-center space-y-4">
          <p className="font-brand text-lg font-bold uppercase text-white">
            NO STREETWEAR RELEASES MATCH YOUR FILTER
          </p>
          <p className="text-xs text-[#9EA2B3] max-w-md mx-auto">
            Try clearing your search query or switching to another category division.
          </p>
          <button
            type="button"
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-xl bg-white text-[#060608] font-brand text-xs font-extrabold uppercase tracking-[0.18em] cursor-pointer"
          >
            RESET ALL FILTERS
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {products.map((product) => {
            const variants = getProductColorVariants(product);
            const activeColour =
              selectedCardColours[product.id] ??
              variants[0]?.colour ??
              product.colour ??
              'Obsidian Black';
            const activeVariant =
              variants.find(
                (v) => v.colour.toLowerCase() === activeColour.toLowerCase()
              ) ?? variants[0];
            const displayImage =
              activeVariant?.image ||
              resolveProductImage(product.image, product.id);

            return (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product.id, activeColour)}
                className="group glass-panel rounded-3xl border border-white/[0.09] hover:border-white/35 overflow-hidden transition-all duration-300 flex flex-col justify-between cursor-pointer shadow-[0_18px_50px_rgba(0,0,0,0.75)]"
              >
                <div>
                  <div className="relative h-80 bg-[#0D0E13] overflow-hidden">
                    <img
                      key={displayImage}
                      src={displayImage}
                      alt={`${product.productName} - ${activeColour}`}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src =
                          '/product-placeholder.svg';
                      }}
                      className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-black/25" />

                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 backdrop-blur-md font-display text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                        {product.categoryName || 'HOODIES'}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-md font-brand text-[10px] font-extrabold uppercase tracking-wider ${
                          product.productAvailable
                            ? 'bg-white text-[#060608]'
                            : 'bg-red-500/80 text-white'
                        }`}
                      >
                        {product.productAvailable ? 'AVAILABLE' : 'SOLD OUT'}
                      </span>
                    </div>

                    <div className="absolute inset-x-4 bottom-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      <div className="w-full py-2.5 rounded-xl bg-white/95 text-[#060608] font-brand text-[11px] font-extrabold uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl">
                        <Eye className="w-3.5 h-3.5" />
                        <span>SELECT SIZE &amp; VIEW STOCK</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-center justify-between text-[11px] font-display uppercase tracking-[0.18em] text-[#8A8D9F] mb-2">
                      <span>COLOR: {activeColour}</span>
                      <span>DEFAULT SIZE: {product.size || 'L'}</span>
                    </div>

                    {/* Small Colored Circles (Swatches) */}
                    {variants.length > 0 && (
                      <div
                        className="flex items-center gap-2 mb-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {variants.map((variant) => {
                          const isSelected =
                            variant.colour.toLowerCase() ===
                            activeColour.toLowerCase();
                          return (
                            <button
                              key={variant.colour}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCardColours((prev) => ({
                                  ...prev,
                                  [product.id]: variant.colour,
                                }));
                              }}
                              title={variant.colour}
                              aria-label={`Preview ${product.productName} in ${variant.colour}`}
                              className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                                isSelected
                                  ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0D0E13] scale-110'
                                  : 'opacity-75 hover:opacity-100 hover:scale-110 border border-white/30'
                              }`}
                              style={{
                                backgroundColor: resolveColourHex(
                                  variant.colour,
                                  variant.colorHex
                                ),
                              }}
                            />
                          );
                        })}
                        {variants.length > 1 && (
                          <span className="text-[10px] font-display uppercase tracking-wider text-[#9EA2B3] ml-1">
                            {variants.length} COLORS
                          </span>
                        )}
                      </div>
                    )}

                    <h3 className="font-brand text-base font-bold text-white uppercase tracking-wide group-hover:text-[#E2E4E9] transition line-clamp-1">
                      {product.productName}
                    </h3>
                    <p className="text-xs text-[#9EA2B3] line-clamp-2 mt-1.5 leading-relaxed">
                      {product.productDescription}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-white/[0.07] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-display uppercase tracking-[0.2em] text-[#7D8091] block">
                      PRICE
                    </span>
                    <span className="font-brand text-lg font-extrabold text-white">
                      {product.unitPrice.toLocaleString()} EGP
                    </span>
                  </div>

                  <span className="px-3.5 py-2 rounded-xl bg-white/[0.06] group-hover:bg-white text-white group-hover:text-[#060608] font-brand text-[10px] font-bold uppercase tracking-[0.18em] transition">
                    VIEW STOCK →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
