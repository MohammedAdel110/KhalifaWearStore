import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Check,
  Sparkles,
  Minus,
  Plus,
  AlertCircle,
  ArrowRight,
  Ruler,
  Flame,
} from 'lucide-react';
import {
  fetchProductDetails,
  fetchStocksByProduct,
  resolveProductImage,
  getProductColorVariants,
  resolveColourHex,
  type ProductDetailsDto,
  type StockDto,
  type BagItem,
} from '../services/storeApi';

const KHALIFA_SIZE_CHART = [
  { size: 'S', chest: '58 cm', length: '68 cm', shoulder: '56 cm', fit: '160–170 cm / 55–68 kg' },
  { size: 'M', chest: '61 cm', length: '71 cm', shoulder: '59 cm', fit: '168–178 cm / 65–78 kg' },
  { size: 'L', chest: '64 cm', length: '74 cm', shoulder: '62 cm', fit: '175–185 cm / 75–90 kg' },
  { size: 'XL', chest: '67 cm', length: '77 cm', shoulder: '65 cm', fit: '182–192 cm / 88–105 kg' },
  { size: 'XXL', chest: '70 cm', length: '79 cm', shoulder: '68 cm', fit: '188+ cm / 100–120 kg' },
];

interface ProductDetailModalProps {
  productId: number | null;
  initialColour?: string | null;
  onClose: () => void;
  onAddToBag: (item: BagItem) => void;
  onCheckOutNow?: (item: BagItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  initialColour,
  onClose,
  onAddToBag,
  onCheckOutNow,
}) => {
  const [product, setProduct] = useState<ProductDetailsDto | null>(null);
  const [stocks, setStocks] = useState<StockDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedColour, setSelectedColour] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    setAddedFeedback(false);

    Promise.all([fetchProductDetails(productId), fetchStocksByProduct(productId)])
      .then(([prodData, stockList]) => {
        if (!isMounted) return;
        const mergedStocks =
          stockList.length > 0 ? stockList : prodData.stocks ?? [];
        const enrichedProd: ProductDetailsDto = {
          ...prodData,
          stocks: mergedStocks,
        };
        setProduct(enrichedProd);
        setStocks(mergedStocks);

        const variants = getProductColorVariants(enrichedProd);
        const preferredColour =
          (initialColour &&
            variants.find(
              (v) => v.colour.toLowerCase() === initialColour.toLowerCase()
            )?.colour) ||
          variants[0]?.colour ||
          prodData.colour ||
          'Obsidian Black';

        setSelectedColour(preferredColour);

        const stocksForPreferred = mergedStocks.filter(
          (s) => s.colour.toLowerCase() === preferredColour.toLowerCase()
        );
        if (stocksForPreferred.length > 0) {
          const firstAvailable =
            stocksForPreferred.find((s) => s.quantityInStock > 0) ??
            stocksForPreferred[0];
          setSelectedSize(firstAvailable.size);
        } else if (mergedStocks.length > 0) {
          const firstAvailable =
            mergedStocks.find((s) => s.quantityInStock > 0) ?? mergedStocks[0];
          setSelectedSize(firstAvailable.size);
        } else {
          setSelectedSize(prodData.size ?? 'L');
        }
        setQuantity(1);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load product');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId, initialColour]);

  const colorVariants = useMemo(() => {
    if (!product) return [];
    return getProductColorVariants({ ...product, stocks });
  }, [product, stocks]);

  const activeColorVariant = useMemo(() => {
    return (
      colorVariants.find(
        (v) => v.colour.toLowerCase() === selectedColour.toLowerCase()
      ) ?? colorVariants[0]
    );
  }, [colorVariants, selectedColour]);

  const activeDisplayImage = useMemo(() => {
    if (activeColorVariant?.image) {
      return activeColorVariant.image;
    }
    return resolveProductImage(product?.image, product?.id);
  }, [activeColorVariant, product]);

  const sizesForColour = useMemo(() => {
    const filtered = stocks.filter(
      (s) => s.colour.toLowerCase() === selectedColour.toLowerCase()
    );
    return filtered;
  }, [stocks, selectedColour]);

  const activeStockVariant = useMemo(() => {
    return stocks.find(
      (s) =>
        s.colour.toLowerCase() === selectedColour.toLowerCase() &&
        s.size.toLowerCase() === selectedSize.toLowerCase()
    );
  }, [stocks, selectedColour, selectedSize]);

  if (!productId) return null;

  const maxAvailable = activeStockVariant
    ? activeStockVariant.quantityInStock
    : product?.productAvailable
    ? 10
    : 0;

  const handleColourChange = (colour: string) => {
    setSelectedColour(colour);
    const matchingSizes = stocks.filter(
      (s) => s.colour.toLowerCase() === colour.toLowerCase()
    );
    if (matchingSizes.length > 0) {
      const inStock =
        matchingSizes.find((s) => s.quantityInStock > 0) ?? matchingSizes[0];
      setSelectedSize(inStock.size);
    }
    setQuantity(1);
  };

  const buildBagItem = (): BagItem | null => {
    if (!product || maxAvailable <= 0) return null;
    return {
      stockId: activeStockVariant?.id ?? product.id * 100,
      productId: product.id,
      productName: product.productName,
      categoryName: product.categoryName ?? "Men's Streetwear",
      image: activeDisplayImage,
      size: selectedSize,
      colour: selectedColour,
      unitPrice: product.unitPrice,
      quantity,
      maxStock: maxAvailable,
    };
  };

  const handleAdd = () => {
    const item = buildBagItem();
    if (!item) return;
    onAddToBag(item);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
  };

  const handleCheckOutNowClick = () => {
    const item = buildBagItem();
    if (!item) return;
    if (onCheckOutNow) {
      onCheckOutNow(item);
    } else {
      onAddToBag(item);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-4xl rounded-3xl glass-panel border border-white/[0.14] shadow-[0_30px_90px_rgba(0,0,0,0.95)] overflow-hidden max-h-[92vh] flex flex-col md:flex-row">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-white text-white hover:text-[#060608] border border-white/20 flex items-center justify-center transition cursor-pointer"
          aria-label="Close product detail modal"
        >
          <X className="w-4 h-4" />
        </button>

        {loading ? (
          <div className="w-full py-28 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            <p className="font-brand text-xs uppercase tracking-[0.22em] text-[#9EA2B3]">
              LOADING ARCHIVE SPECS...
            </p>
          </div>
        ) : error || !product ? (
          <div className="w-full py-24 px-8 flex flex-col items-center justify-center text-center gap-3">
            <AlertCircle className="w-8 h-8 text-red-400" />
            <p className="text-sm text-red-200">{error || 'Product unavailable'}</p>
          </div>
        ) : (
          <>
            {/* Left Column: High-Contrast Streetwear Product Visual */}
            <div className="md:w-[48%] relative bg-[#0B0C10] min-h-[320px] md:min-h-[520px] overflow-hidden flex items-center justify-center">
              <img
                key={activeDisplayImage}
                src={activeDisplayImage}
                alt={`${product.productName} - ${selectedColour}`}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    '/product-placeholder.svg';
                }}
                className="w-full h-full object-cover object-center transition-all duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-black/30" />

              {/* Top-left Category & GSM Tag */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="px-3 py-1 rounded-lg bg-black/75 border border-white/20 backdrop-blur-md font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  {product.categoryName || "MEN'S HOODIES"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white text-[#060608] font-brand text-[10px] font-extrabold uppercase tracking-[0.18em] w-fit">
                  {selectedColour}
                </span>
              </div>

              {/* Bottom Brand Watermark & Quick Color Circles */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                <img
                  src="/logo.png"
                  alt="KF"
                  className="h-6 w-auto object-contain brightness-125 opacity-90"
                />
                {colorVariants.length > 1 && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20">
                    {colorVariants.map((variant) => {
                      const active =
                        variant.colour.toLowerCase() ===
                        selectedColour.toLowerCase();
                      return (
                        <button
                          key={variant.colour}
                          type="button"
                          onClick={() => handleColourChange(variant.colour)}
                          title={variant.colour}
                          aria-label={`Select color ${variant.colour}`}
                          className={`w-5 h-5 rounded-full transition-all cursor-pointer ${
                            active
                              ? 'ring-2 ring-white ring-offset-2 ring-offset-[#060608] scale-110'
                              : 'opacity-75 hover:opacity-100 hover:scale-105 border border-white/30'
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
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Specs, Size/Color Matrix & Add to Bag */}
            <div className="md:w-[52%] p-6 sm:p-8 overflow-y-auto space-y-6 flex flex-col justify-between">
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-display font-semibold uppercase tracking-[0.22em] text-[#9EA2B3] mb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>KHALIFA WEAR HOUSE // OFFICIAL RELEASE</span>
                  </div>
                  <h2 className="font-brand text-xl sm:text-2xl font-extrabold uppercase tracking-wide text-white leading-snug">
                    {product.productName}
                  </h2>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className="font-brand text-2xl sm:text-3xl font-extrabold text-white">
                      {product.unitPrice.toLocaleString()} EGP
                    </span>
                    <span className="text-[11px] font-display uppercase tracking-[0.18em] text-emerald-400">
                      • VAT INCLUDED
                    </span>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#B4B6C2] leading-relaxed border-y border-white/[0.08] py-4">
                  {product.productDescription ||
                    'Engineered with heavyweight brushed Egyptian fleece, drop-shoulder boxy streetwear proportions, and reinforced twin-needle stitching.'}
                </p>

                {/* 1. COLORWAY SELECTOR WITH COLORED CIRCLES */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#B4B6C2]">
                      SELECT COLORWAY ({colorVariants.length})
                    </span>
                    <span className="inline-flex items-center gap-2 font-brand text-[11px] font-bold uppercase text-white">
                      <span
                        className="w-3 h-3 rounded-full border border-white/40 inline-block"
                        style={{
                          backgroundColor: resolveColourHex(
                            selectedColour,
                            activeColorVariant?.colorHex
                          ),
                        }}
                      />
                      {selectedColour}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {colorVariants.map((variant) => {
                      const active =
                        variant.colour.toLowerCase() ===
                        selectedColour.toLowerCase();
                      const swatchHex = resolveColourHex(
                        variant.colour,
                        variant.colorHex
                      );
                      return (
                        <button
                          key={variant.colour}
                          type="button"
                          onClick={() => handleColourChange(variant.colour)}
                          title={variant.colour}
                          className={`group flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full font-display text-xs font-bold uppercase tracking-[0.12em] border transition-all cursor-pointer ${
                            active
                              ? 'bg-white text-[#060608] border-white shadow-[0_0_20px_rgba(255,255,255,0.28)]'
                              : 'bg-white/[0.04] text-[#B4B6C2] border-white/[0.14] hover:border-white/45 hover:text-white'
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full shrink-0 transition-transform ${
                              active
                                ? 'ring-2 ring-[#060608] scale-105'
                                : 'border border-white/30 group-hover:scale-110'
                            }`}
                            style={{ backgroundColor: swatchHex }}
                          />
                          <span>{variant.colour}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SIZE & LIVE STOCK MATRIX */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-3">
                      <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#B4B6C2]">
                        SELECT SIZE (OVERSIZED FIT)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSizeGuide((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-[0.16em] text-amber-300 hover:text-white underline underline-offset-4 transition cursor-pointer"
                      >
                        <Ruler className="w-3 h-3" />
                        <span>{showSizeGuide ? 'HIDE SIZE GUIDE' : '500GSM SIZE GUIDE'}</span>
                      </button>
                    </div>
                    <span
                      className={`font-display text-[11px] font-bold uppercase tracking-wider ${
                        maxAvailable > 5
                          ? 'text-emerald-400'
                          : maxAvailable > 0
                          ? 'text-amber-300'
                          : 'text-red-400'
                      }`}
                    >
                      {maxAvailable > 0
                        ? `${maxAvailable} UNITS IN STOCK`
                        : 'OUT OF STOCK'}
                    </span>
                  </div>

                  {showSizeGuide && (
                    <div className="mb-3 p-3.5 rounded-xl bg-black/60 border border-white/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-[10px] font-extrabold uppercase tracking-[0.18em] text-white">
                          500GSM BOXY DROP-SHOULDER FIT SPECS
                        </span>
                        <span className="text-[10px] text-[#9EA2B3]">
                          True to streetwear size
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-[10px] border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-[#8A8D9F] font-display uppercase tracking-wider">
                              <th className="py-1.5 pr-2">SIZE</th>
                              <th className="py-1.5 pr-2">CHEST</th>
                              <th className="py-1.5 pr-2">LENGTH</th>
                              <th className="py-1.5 pr-2">SHOULDER</th>
                              <th className="py-1.5">HEIGHT / WEIGHT</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.06] text-white">
                            {KHALIFA_SIZE_CHART.map((row) => (
                              <tr
                                key={row.size}
                                className={
                                  row.size.toLowerCase() === selectedSize.toLowerCase()
                                    ? 'bg-white/10 font-bold text-amber-300'
                                    : ''
                                }
                              >
                                <td className="py-1.5 pr-2 font-brand">{row.size}</td>
                                <td className="py-1.5 pr-2">{row.chest}</td>
                                <td className="py-1.5 pr-2">{row.length}</td>
                                <td className="py-1.5 pr-2">{row.shoulder}</td>
                                <td className="py-1.5 text-[#B4B6C2]">{row.fit}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {maxAvailable > 0 && maxAvailable <= 5 && (
                    <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/35 flex items-center gap-2 text-[10px] font-display font-bold uppercase tracking-[0.16em] text-amber-300">
                      <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        HIGH DEMAND // ONLY {maxAvailable} LEFT IN {selectedColour} ({selectedSize})
                      </span>
                    </div>
                  )}

                  {sizesForColour.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                      {sizesForColour.map((variant) => {
                        const isSelected =
                          variant.size.toLowerCase() === selectedSize.toLowerCase();
                        const outOfStock = variant.quantityInStock <= 0;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            disabled={outOfStock}
                            onClick={() => {
                              setSelectedSize(variant.size);
                              setQuantity(1);
                            }}
                            className={`py-2.5 px-2 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                              outOfStock
                                ? 'bg-white/[0.01] border-white/[0.05] text-[#4E505E] line-through cursor-not-allowed'
                                : isSelected
                                ? 'bg-white text-[#060608] border-white shadow-[0_0_20px_rgba(255,255,255,0.25)] cursor-pointer'
                                : 'bg-white/[0.03] border-white/[0.1] text-white hover:border-white/40 cursor-pointer'
                            }`}
                          >
                            <span className="font-brand text-xs font-extrabold uppercase">
                              {variant.size}
                            </span>
                            <span
                              className={`text-[9px] font-display uppercase mt-0.5 ${
                                isSelected ? 'text-[#060608]/80 font-bold' : 'text-[#8A8D9F]'
                              }`}
                            >
                              {outOfStock ? 'SOLD' : `${variant.quantityInStock} left`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="inline-flex px-4 py-2 rounded-xl bg-white text-[#060608] font-brand text-xs font-bold uppercase">
                      {selectedSize}
                    </div>
                  )}
                </div>

                {/* 3. QUANTITY STEPPER */}
                <div className="flex items-center justify-between pt-2">
                  <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#B4B6C2]">
                    QUANTITY
                  </span>
                  <div className="inline-flex items-center rounded-xl bg-white/[0.04] border border-white/[0.12] p-1">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white transition cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center font-brand text-xs font-bold text-white">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((q) => Math.min(Math.max(1, maxAvailable), q + 1))
                      }
                      className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Add to Bag + Check Out Now */}
              <div className="pt-5 border-t border-white/[0.08] space-y-2.5">
                <button
                  type="button"
                  disabled={maxAvailable <= 0}
                  onClick={handleAdd}
                  className={`w-full py-3.5 rounded-xl font-brand text-xs font-extrabold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                    addedFeedback
                      ? 'bg-emerald-400 text-[#060608] shadow-[0_0_30px_rgba(52,211,153,0.4)]'
                      : maxAvailable <= 0
                      ? 'bg-white/10 text-[#686B7A] cursor-not-allowed'
                      : 'bg-white/[0.07] hover:bg-white/[0.14] text-white border border-white/25'
                  }`}
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>ADDED TO YOUR BAG</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>
                        ADD TO BAG — {(product.unitPrice * quantity).toLocaleString()} EGP
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={maxAvailable <= 0}
                  onClick={handleCheckOutNowClick}
                  className={`w-full py-4 rounded-xl font-brand text-xs font-extrabold uppercase tracking-[0.22em] transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                    maxAvailable <= 0
                      ? 'bg-white/10 text-[#686B7A] cursor-not-allowed'
                      : 'bg-gradient-to-r from-white via-[#E5E7EB] to-[#CBD5E1] text-[#060608] shadow-[0_10px_30px_-5px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_35px_-5px_rgba(255,255,255,0.4)]'
                  }`}
                >
                  <span>
                    CHECK OUT NOW — {(product.unitPrice * quantity).toLocaleString()} EGP
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
