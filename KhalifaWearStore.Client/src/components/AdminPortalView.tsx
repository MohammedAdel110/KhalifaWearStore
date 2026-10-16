import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Upload,
  Layers,
  Package,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  Eye,
  Save,
  Crown,
} from 'lucide-react';
import type { AuthResponseDto } from '../services/authApi';
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminCreateProduct,
  adminDeleteProduct,
  adminCreateStock,
  adminUpdateStock,
  adminDeleteStock,
  fetchStocksByProduct,
  resolveProductImage,
  type CategoryDto,
  type ProductDto,
  type StockDto,
} from '../services/storeApi';

interface AdminPortalViewProps {
  session: AuthResponseDto | null;
  categories: CategoryDto[];
  products: ProductDto[];
  onRefreshStoreData: () => void;
  onInspectProduct: (productId: number) => void;
  onGoToLogin: () => void;
}

type AdminTab = 'products' | 'stocks' | 'categories';

const STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

export const AdminPortalView: React.FC<AdminPortalViewProps> = ({
  session,
  categories,
  products,
  onRefreshStoreData,
  onInspectProduct,
  onGoToLogin,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // =========================================================================
  // 1. NEW PRODUCT + MULTI-SIZE BUILDER STATE
  // =========================================================================
  const [productName, setProductName] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 1);
  const [unitPrice, setUnitPrice] = useState('1550');
  const [primaryColour, setPrimaryColour] = useState('Obsidian Black');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Initial quantities per size (S, M, L, XL, XXL) created automatically with the product
  const [sizeQuantities, setSizeQuantities] = useState<Record<string, number>>({
    S: 10,
    M: 20,
    L: 25,
    XL: 18,
    XXL: 8,
  });

  // =========================================================================
  // 2. EXISTING PRODUCT STOCK / SIZE / COLORWAY MANAGER STATE
  // =========================================================================
  const [selectedProductIdForStock, setSelectedProductIdForStock] = useState<number>(
    products[0]?.id ?? 1
  );
  const [productStocks, setProductStocks] = useState<StockDto[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(false);
  const [newVariantColour, setNewVariantColour] = useState('Platinum Grey');
  const [newVariantSize, setNewVariantSize] = useState('L');
  const [newVariantQty, setNewVariantQty] = useState('15');

  // =========================================================================
  // 3. CATEGORY MANAGER STATE
  // =========================================================================
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  useEffect(() => {
    if (categories.length > 0 && !categories.some((c) => c.id === categoryId)) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  useEffect(() => {
    if (products.length > 0 && !products.some((p) => p.id === selectedProductIdForStock)) {
      setSelectedProductIdForStock(products[0].id);
    }
  }, [products, selectedProductIdForStock]);

  const loadStocksForSelectedProduct = async (prodId: number) => {
    setLoadingStocks(true);
    try {
      const list = await fetchStocksByProduct(prodId);
      setProductStocks(list);
    } catch {
      setProductStocks([]);
    } finally {
      setLoadingStocks(false);
    }
  };

  useEffect(() => {
    if (selectedProductIdForStock) {
      loadStocksForSelectedProduct(selectedProductIdForStock);
    }
  }, [selectedProductIdForStock]);

  // Guard: If not logged in or not Admin
  if (!session || session.role !== 'Admin') {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/15 flex items-center justify-center mx-auto">
          <Crown className="w-6 h-6 text-white" />
        </div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold uppercase tracking-wide text-white">
          ADMIN PORTAL ACCESS REQUIRED
        </h1>
        <p className="text-sm text-[#9EA2B3] leading-relaxed">
          Please sign in with an Administrator account (e.g.{' '}
          <code className="text-white">admin@khalifawear.com</code>) to add or manage
          categories, products, specifications, colorways, and size stock levels.
        </p>
        <button
          type="button"
          onClick={onGoToLogin}
          className="px-8 py-4 bg-white text-[#060608] font-display text-xs font-bold uppercase tracking-[0.22em] cursor-pointer"
        >
          SIGN IN AS ADMIN
        </button>
      </div>
    );
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
    }
  };

  const handlePublishProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const activeSizes = STANDARD_SIZES.filter((sz) => (sizeQuantities[sz] ?? 0) > 0);
      const defaultSize = activeSizes[0] ?? 'L';

      // 1. Create the Product via POST /api/products (multipart/form-data)
      const createdProduct = await adminCreateProduct(
        {
          productName: productName.trim(),
          productDescription: productDescription.trim(),
          categoryId,
          unitPrice: Number(unitPrice) || 1000,
          colour: primaryColour.trim(),
          size: defaultSize,
          productAvailable: true,
          imageFile,
        },
        session.token
      );

      // 2. Automatically create Stock rows for every size with quantity > 0 via POST /api/stocks
      for (const sz of STANDARD_SIZES) {
        const qty = sizeQuantities[sz] ?? 0;
        if (qty > 0) {
          await adminCreateStock(
            {
              productId: createdProduct.id,
              size: sz,
              colour: primaryColour.trim(),
              quantityInStock: qty,
            },
            session.token
          );
        }
      }

      setStatusMessage(
        `Published "${createdProduct.productName}" with ${activeSizes.length} size stock variants!`
      );
      setProductName('');
      setProductDescription('');
      setImageFile(null);
      setImagePreview(null);
      onRefreshStoreData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to publish product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: number, name: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await adminDeleteProduct(id, session.token);
      setStatusMessage(`Deleted product "${name}".`);
      onRefreshStoreData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to delete product');
    }
  };

  const handleAddStockVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      await adminCreateStock(
        {
          productId: selectedProductIdForStock,
          size: newVariantSize.trim().toUpperCase(),
          colour: newVariantColour.trim(),
          quantityInStock: Number(newVariantQty) || 0,
        },
        session.token
      );
      setStatusMessage(
        `Added ${newVariantColour} (${newVariantSize}) — ${newVariantQty} units in stock.`
      );
      await loadStocksForSelectedProduct(selectedProductIdForStock);
      onRefreshStoreData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add size/colorway');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStockQuantity = async (variant: StockDto, newQty: number) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await adminUpdateStock(
        variant.id,
        {
          size: variant.size,
          colour: variant.colour,
          quantityInStock: Math.max(0, newQty),
        },
        session.token
      );
      await loadStocksForSelectedProduct(selectedProductIdForStock);
      setStatusMessage(
        `Updated ${variant.colour} (${variant.size}) to ${Math.max(0, newQty)} units.`
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update stock');
    }
  };

  const handleDeleteStockVariant = async (stockId: number) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await adminDeleteStock(stockId, session.token);
      await loadStocksForSelectedProduct(selectedProductIdForStock);
      setStatusMessage('Removed size/colorway variant.');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delete variant');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const created = await adminCreateCategory(
        {
          categoryName: newCategoryName.trim(),
          categoryDescription: newCategoryDesc.trim(),
        },
        session.token
      );
      setStatusMessage(`Category "${created.categoryName}" created.`);
      setNewCategoryName('');
      setNewCategoryDesc('');
      onRefreshStoreData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      await adminDeleteCategory(id, session.token);
      setStatusMessage(`Category "${name}" deleted.`);
      onRefreshStoreData();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Cannot delete category with active products');
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12 space-y-10 pb-24">
      {/* Top Executive Admin Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/[0.1] pb-8">
        <div>
          <span className="font-display text-xs uppercase tracking-[0.28em] text-[#9EA2B3] block">
            EXECUTIVE COMMAND CENTER // {session.fullName.toUpperCase()}
          </span>
          <h1 className="font-brand text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white mt-1">
            KHALIFA ADMIN PORTAL
          </h1>
          <p className="text-xs sm:text-sm text-[#8E91A0] mt-1.5">
            Add new categories, publish products with specifications &amp; photography, and
            control exact stock units per size (`S`–`XXL`) and colorway.
          </p>
        </div>

        {/* Section Switcher Tabs */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('products');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.18em] transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'products'
                ? 'bg-white text-[#060608]'
                : 'bg-white/[0.04] text-[#9EA2B3] hover:text-white border border-white/[0.1]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>1. PRODUCTS &amp; SPECS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('stocks');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.18em] transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'stocks'
                ? 'bg-white text-[#060608]'
                : 'bg-white/[0.04] text-[#9EA2B3] hover:text-white border border-white/[0.1]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. SIZES &amp; COLORWAYS</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('categories');
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            className={`px-5 py-3 font-display text-xs font-bold uppercase tracking-[0.18em] transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'categories'
                ? 'bg-white text-[#060608]'
                : 'bg-white/[0.04] text-[#9EA2B3] hover:text-white border border-white/[0.1]'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>3. CATEGORIES ({categories.length})</span>
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {statusMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* =====================================================================
          TAB 1: PUBLISH NEW PRODUCT (WITH SPECS, IMAGE & SIZES) + PRODUCT LIST
      ===================================================================== */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left 5 Columns: Add New Product + Initial Size Matrix Form */}
          <form
            onSubmit={handlePublishProduct}
            className="lg:col-span-5 bg-[#0B0C10] border border-white/[0.1] p-6 sm:p-8 space-y-5 h-fit"
          >
            <div className="border-b border-white/[0.08] pb-4">
              <span className="font-display text-[10px] uppercase tracking-[0.24em] text-[#8E91A0]">
                NEW RELEASE STUDIO
              </span>
              <h2 className="font-brand text-xl font-bold uppercase text-white mt-1">
                ADD NEW PRODUCT &amp; SIZES
              </h2>
            </div>

            <div>
              <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                PRODUCT NAME
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. KF Eclipse 500 GSM Oversized Hoodie"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.12] text-sm text-white placeholder-[#555869] focus:outline-none focus:border-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                  CATEGORY DIVISION
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full px-3.5 py-3 bg-[#111218] border border-white/[0.12] text-xs font-display uppercase tracking-wider text-white focus:outline-none focus:border-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                  PRICE (EGP)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  placeholder="1550"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.12] text-sm text-white focus:outline-none focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                PRIMARY COLORWAY
              </label>
              <input
                type="text"
                required
                value={primaryColour}
                onChange={(e) => setPrimaryColour(e.target.value)}
                placeholder="e.g. Obsidian Black / Platinum Grey"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.12] text-sm text-white placeholder-[#555869] focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                SPECIFICATIONS &amp; DESCRIPTION
              </label>
              <textarea
                rows={3}
                required
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Architectural boxy silhouette featuring ultra-dense 500 GSM combed cotton, ribbed heavy cuffs, and metallic silver KF emblem..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.12] text-xs sm:text-sm text-white placeholder-[#555869] focus:outline-none focus:border-white"
              />
            </div>

            {/* Size & Stock Quantities Matrix */}
            <div className="p-4 bg-black/50 border border-white/[0.08] space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.18em] text-white">
                  INITIAL STOCK UNITS PER SIZE
                </span>
                <span className="text-[10px] text-[#8E91A0]">Set 0 to skip size</span>
              </div>

              <div className="grid grid-cols-5 gap-2.5">
                {STANDARD_SIZES.map((sz) => (
                  <div key={sz} className="text-center">
                    <label className="block font-brand text-xs font-bold text-white mb-1">
                      {sz}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={sizeQuantities[sz] ?? 0}
                      onChange={(e) =>
                        setSizeQuantities((prev) => ({
                          ...prev,
                          [sz]: Math.max(0, Number(e.target.value) || 0),
                        }))
                      }
                      className="w-full px-2 py-2 text-center bg-white/[0.04] border border-white/[0.12] text-xs font-bold text-white focus:outline-none focus:border-white"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                PRODUCT PHOTOGRAPHY
              </label>
              <label className="flex flex-col items-center justify-center p-5 border border-dashed border-white/25 hover:border-white bg-white/[0.02] cursor-pointer transition text-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-36 w-auto object-contain mb-2"
                  />
                ) : (
                  <Upload className="w-6 h-6 text-[#8E91A0] mb-2" />
                )}
                <span className="font-display text-xs uppercase tracking-wider text-white">
                  {imageFile ? imageFile.name : 'CLICK TO UPLOAD PRODUCT IMAGE'}
                </span>
                <span className="text-[10px] text-[#7D8091] mt-1">
                  JPG, PNG or WEBP (high-contrast portrait recommended)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-white hover:bg-[#E2E4E9] text-[#060608] font-display text-xs font-bold uppercase tracking-[0.22em] transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'PUBLISHING RELEASE...' : 'PUBLISH PRODUCT & SIZES'}
            </button>
          </form>

          {/* Right 7 Columns: Live Store Products Table */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-brand text-xl font-bold uppercase text-white">
                ACTIVE CATALOG RELEASES ({products.length})
              </h2>
            </div>

            <div className="space-y-3">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="p-4 bg-[#0B0C10] border border-white/[0.09] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={resolveProductImage(prod.image, prod.id)}
                      alt={prod.productName}
                      className="w-16 h-20 object-cover bg-[#14151B] border border-white/10 shrink-0"
                    />
                    <div>
                      <span className="text-[10px] font-display uppercase tracking-[0.2em] text-[#8E91A0]">
                        {prod.categoryName} • #{prod.id}
                      </span>
                      <h3 className="font-brand text-base font-bold uppercase text-white">
                        {prod.productName}
                      </h3>
                      <p className="text-xs text-[#9EA2B3] mt-0.5">
                        {prod.unitPrice.toLocaleString()} EGP • Primary: {prod.colour}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => onInspectProduct(prod.id)}
                      className="px-3 py-2 bg-white/[0.05] hover:bg-white/10 border border-white/10 text-[10px] font-display font-bold uppercase tracking-wider text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>PREVIEW</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductIdForStock(prod.id);
                        setActiveTab('stocks');
                      }}
                      className="px-3 py-2 bg-white text-[#060608] text-[10px] font-display font-bold uppercase tracking-wider cursor-pointer"
                    >
                      SIZES &amp; STOCK
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id, prod.productName)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 cursor-pointer"
                      aria-label="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: SIZES & COLORWAY STOCK INVENTORY MATRIX
      ===================================================================== */}
      {activeTab === 'stocks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left 5 Columns: Select Product & Add Colorway/Size Variant */}
          <div className="lg:col-span-5 bg-[#0B0C10] border border-white/[0.1] p-6 sm:p-8 space-y-6 h-fit">
            <div>
              <label className="block font-display text-[11px] font-bold uppercase tracking-[0.2em] text-[#9EA2B3] mb-2">
                SELECT PRODUCT TO MANAGE SIZES
              </label>
              <select
                value={selectedProductIdForStock}
                onChange={(e) => setSelectedProductIdForStock(Number(e.target.value))}
                className="w-full px-4 py-3.5 bg-[#12131A] border border-white/20 text-xs font-display font-bold uppercase tracking-wider text-white focus:outline-none"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.id} — {p.productName}
                  </option>
                ))}
              </select>
            </div>

            <form
              onSubmit={handleAddStockVariant}
              className="pt-5 border-t border-white/[0.08] space-y-4"
            >
              <h3 className="font-brand text-base font-bold uppercase text-white">
                ADD NEW COLORWAY OR SIZE
              </h3>
              <p className="text-xs text-[#8E91A0]">
                Every colorway and size added here appears immediately inside the customer
                Product Detail modal.
              </p>

              <div>
                <label className="block font-display text-[10px] uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                  COLORWAY NAME
                </label>
                <input
                  type="text"
                  required
                  value={newVariantColour}
                  onChange={(e) => setNewVariantColour(e.target.value)}
                  placeholder="e.g. Platinum Grey / Obsidian Black"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-display text-[10px] uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                    SIZE
                  </label>
                  <select
                    value={newVariantSize}
                    onChange={(e) => setNewVariantSize(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#12131A] border border-white/[0.12] text-xs font-bold uppercase text-white focus:outline-none"
                  >
                    {STANDARD_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-display text-[10px] uppercase tracking-[0.2em] text-[#B4B6C2] mb-1.5">
                    UNITS IN STOCK
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newVariantQty}
                    onChange={(e) => setNewVariantQty(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/[0.12] text-xs text-white focus:outline-none focus:border-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-white hover:bg-[#E2E4E9] text-[#060608] font-display text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>ADD SIZE / COLORWAY VARIANT</span>
              </button>
            </form>
          </div>

          {/* Right 7 Columns: Live Size & Colorway Matrix for Selected Product */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-brand text-xl font-bold uppercase text-white">
                LIVE SIZE &amp; COLORWAY MATRIX ({productStocks.length} VARIANTS)
              </h2>
              <button
                type="button"
                onClick={() => onInspectProduct(selectedProductIdForStock)}
                className="px-4 py-2 bg-white/[0.06] hover:bg-white text-white hover:text-[#060608] font-display text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>TEST IN MODAL</span>
              </button>
            </div>

            {loadingStocks ? (
              <div className="p-12 text-center text-xs text-[#8E91A0]">
                Loading size &amp; stock variants...
              </div>
            ) : productStocks.length === 0 ? (
              <div className="p-12 bg-[#0B0C10] border border-white/[0.08] text-center text-xs text-[#8E91A0]">
                No size variants found for this product yet. Use the form on the left to add
                sizes.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {productStocks.map((st) => (
                  <div
                    key={st.id}
                    className="p-4 bg-[#0B0C10] border border-white/[0.1] flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="inline-block px-2.5 py-0.5 bg-white text-[#060608] font-brand text-xs font-extrabold uppercase mr-2">
                        SIZE {st.size}
                      </span>
                      <span className="font-display text-xs font-bold uppercase text-white">
                        {st.colour}
                      </span>
                      <p className="text-[11px] text-[#8E91A0] mt-1">
                        Current Stock:{' '}
                        <strong className="text-emerald-400">
                          {st.quantityInStock} units
                        </strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStockQuantity(st, st.quantityInStock - 1)
                        }
                        className="w-8 h-8 bg-white/[0.05] hover:bg-white/15 text-white font-bold text-sm cursor-pointer"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateStockQuantity(st, st.quantityInStock + 5)
                        }
                        className="px-2.5 h-8 bg-white/[0.08] hover:bg-white text-white hover:text-[#060608] font-display text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                        title="Add 5 units"
                      >
                        <Save className="w-3 h-3" />
                        <span>+5</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStockVariant(st.id)}
                        className="p-2 text-[#7D8091] hover:text-red-400 cursor-pointer"
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

      {/* =====================================================================
          TAB 3: CATEGORIES / DIVISIONS MANAGER
      ===================================================================== */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <form
            onSubmit={handleCreateCategory}
            className="lg:col-span-5 bg-[#0B0C10] border border-white/[0.1] p-6 sm:p-8 space-y-5 h-fit"
          >
            <h2 className="font-brand text-xl font-bold uppercase text-white">
              CREATE NEW CATEGORY
            </h2>

            <div>
              <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                CATEGORY NAME
              </label>
              <input
                type="text"
                required
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Limited Capsule Hoodies"
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.12] text-sm text-white focus:outline-none focus:border-white"
              />
            </div>

            <div>
              <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.18em] text-[#B4B6C2] mb-2">
                CATEGORY DESCRIPTION
              </label>
              <textarea
                rows={3}
                required
                value={newCategoryDesc}
                onChange={(e) => setNewCategoryDesc(e.target.value)}
                placeholder="Numbered heavyweight capsule releases..."
                className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.12] text-sm text-white focus:outline-none focus:border-white"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-white hover:bg-[#E2E4E9] text-[#060608] font-display text-xs font-bold uppercase tracking-[0.22em] cursor-pointer"
            >
              {isSubmitting ? 'SAVING...' : 'CREATE CATEGORY'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            <h2 className="font-brand text-xl font-bold uppercase text-white mb-4">
              ACTIVE STORE DIVISIONS ({categories.length})
            </h2>
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-5 bg-[#0B0C10] border border-white/[0.1] flex items-center justify-between gap-4"
              >
                <div>
                  <span className="text-[10px] font-display uppercase tracking-[0.2em] text-[#8E91A0]">
                    DIVISION #{cat.id}
                  </span>
                  <h3 className="font-brand text-lg font-bold uppercase text-white">
                    {cat.categoryName}
                  </h3>
                  <p className="text-xs text-[#9EA2B3] mt-1">{cat.categoryDescription}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id, cat.categoryName)}
                  className="p-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 cursor-pointer shrink-0"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
