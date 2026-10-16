import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Check,
  Sparkles,
  Minus,
  Plus,
  AlertCircle,
} from 'lucide-react';
import {
  fetchProductDetails,
  fetchStocksByProduct,
  resolveProductImage,
  type ProductDetailsDto,
  type StockDto,
  type BagItem,
} from '../services/storeApi';

interface ProductDetailModalProps {
  productId: number | null;
  onClose: () => void;
  onAddToBag: (item: BagItem) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  onClose,
  onAddToBag,
}) => {
  const [product, setProduct] = useState<ProductDetailsDto | null>(null);
  const [stocks, setStocks] = useState<StockDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedColour, setSelectedColour] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!productId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);
    setAddedFeedback(false);

    Promise.all([fetchProductDetails(productId), fetchStocksByProduct(productId)])
      .then(([prodData, stockList]) => {
        if (!isMounted) return;
        setProduct(prodData);
        const mergedStocks =
          stockList.length > 0 ? stockList : prodData.stocks ?? [];
        setStocks(mergedStocks);

        if (mergedStocks.length > 0) {
          const firstAvailable =
            mergedStocks.find((s) => s.quantityInStock > 0) ?? mergedStocks[0];
          setSelectedColour(firstAvailable.colour);
          setSelectedSize(firstAvailable.size);
        } else {
          setSelectedColour(prodData.colour ?? 'Obsidian Black');
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
  }, [productId]);

  const availableColours = useMemo(() => {
    const set = new Set<string>();
    stocks.forEach((s) => {
      if (s.colour) set.add(s.colour);
    });
    if (set.size === 0 && product?.colour) set.add(product.colour);
    return Array.from(set);
  }, [stocks, product]);

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

  const handleAdd = () => {
    if (!product || maxAvailable <= 0) return;
    onAddToBag({
      stockId: activeStockVariant?.id ?? product.id * 100,
      productId: product.id,
      productName: product.productName,
      categoryName: product.categoryName ?? "Men's Streetwear",
      image: resolveProductImage(product.image, product.id),
      size: selectedSize,
      colour: selectedColour,
      unitPrice: product.unitPrice,
      quantity,
      maxStock: maxAvailable,
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1800);
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
                src={resolveProductImage(product.image, product.id)}
                alt={product.productName}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85';
                }}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060608] via-transparent to-black/30" />

              {/* Top-left Category & GSM Tag */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <span className="px-3 py-1 rounded-lg bg-black/75 border border-white/20 backdrop-blur-md font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  {product.categoryName || "MEN'S HOODIES"}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-white text-[#060608] font-brand text-[10px] font-extrabold uppercase tracking-[0.18em] w-fit">
                  KF ARCHIVE #{product.id}
                </span>
              </div>

              {/* Bottom Brand Watermark */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <img
                  src="/logo.png"
                  alt="KF"
                  className="h-6 w-auto object-contain brightness-125 opacity-90"
                />
                <span className="font-display text-[10px] uppercase tracking-[0.2em] text-white/80 bg-black/60 px-2.5 py-1 rounded-md border border-white/10">
                  100% EGYPTIAN COMBED COTTON
                </span>
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

                {/* 1. COLORWAY SELECTOR */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#B4B6C2]">
                      SELECT COLORWAY
                    </span>
                    <span className="font-brand text-[11px] font-bold uppercase text-white">
                      {selectedColour}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableColours.map((colour) => {
                      const active =
                        colour.toLowerCase() === selectedColour.toLowerCase();
                      return (
                        <button
                          key={colour}
                          type="button"
                          onClick={() => handleColourChange(colour)}
                          className={`px-3.5 py-2 rounded-xl font-display text-xs font-bold uppercase tracking-[0.14em] border transition cursor-pointer ${
                            active
                              ? 'bg-white text-[#060608] border-white shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                              : 'bg-white/[0.03] text-[#B4B6C2] border-white/[0.1] hover:border-white/40 hover:text-white'
                          }`}
                        >
                          {colour}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. SIZE & LIVE STOCK MATRIX */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#B4B6C2]">
                      SELECT SIZE (OVERSIZED FIT)
                    </span>
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

              {/* Add to Bag Button */}
              <div className="pt-5 border-t border-white/[0.08]">
                <button
                  type="button"
                  disabled={maxAvailable <= 0}
                  onClick={handleAdd}
                  className={`w-full py-4 rounded-xl font-brand text-xs font-extrabold uppercase tracking-[0.22em] transition-all flex items-center justify-center gap-2.5 cursor-pointer ${
                    addedFeedback
                      ? 'bg-emerald-400 text-[#060608] shadow-[0_0_30px_rgba(52,211,153,0.4)]'
                      : maxAvailable <= 0
                      ? 'bg-white/10 text-[#686B7A] cursor-not-allowed'
                      : 'bg-gradient-to-r from-white via-[#E5E7EB] to-[#CBD5E1] text-[#060608] shadow-[0_10px_30px_-5px_rgba(255,255,255,0.25)] hover:shadow-[0_15px_35px_-5px_rgba(255,255,255,0.4)]'
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
