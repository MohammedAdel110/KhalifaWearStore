import type { ApiResponse } from './authApi';

export interface PaginationResponse<T> {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  data: T[];
}

export interface CategoryDto {
  id: number;
  categoryName: string;
  categoryDescription: string | null;
  image?: string | null;
  productsCount?: number;
}

export interface StockDto {
  id: number;
  productId: number;
  productName?: string | null;
  size: string;
  colour: string;
  quantityInStock: number;
}

export interface ProductColorVariantDto {
  colour: string;
  colorHex: string;
  image: string | null;
}

export interface ProductDto {
  id: number;
  productName: string;
  productDescription: string | null;
  categoryId: number;
  categoryName: string | null;
  unitPrice: number;
  colour: string | null;
  size: string | null;
  productAvailable: boolean;
  image: string | null;
  colorVariants?: ProductColorVariantDto[];
}

export interface ProductDetailsDto extends ProductDto {
  createdAt: string;
  stocks: StockDto[];
}

export interface ProductQueryParams {
  categoryId?: number | null;
  search?: string;
  colour?: string;
  size?: string;
  onlyAvailable?: boolean;
  sort?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface BagItem {
  stockId: number;
  productId: number;
  productName: string;
  categoryName: string;
  image: string;
  size: string;
  colour: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
}

export const PRODUCT_IMAGE_PLACEHOLDER = '/product-placeholder.svg';

export const STREETWEAR_COLOUR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Obsidian Black', hex: '#141519' },
  { name: 'Heather Grey', hex: '#9CA3AF' },
  { name: 'Sand Beige', hex: '#D2B48C' },
  { name: 'Baby Blue', hex: '#89CFF0' },
  { name: 'Arctic White', hex: '#F8FAFC' },
  { name: 'Charcoal Slate', hex: '#374151' },
  { name: 'Olive Drab', hex: '#4D5D53' },
  { name: 'Burgundy Wine', hex: '#7F1D1D' },
  { name: 'Midnight Navy', hex: '#1E293B' },
  { name: 'Espresso Brown', hex: '#5C4033' },
];

export function resolveColourHex(
  colourName: string | null | undefined,
  explicitHex?: string | null
): string {
  if (explicitHex && /^#[0-9A-Fa-f]{3,8}$/.test(explicitHex.trim())) {
    return explicitHex.trim();
  }
  if (!colourName) return '#141519';
  const lower = colourName.trim().toLowerCase();
  if (lower.includes('baby blue') || lower.includes('sky') || lower.includes('ice'))
    return '#89CFF0';
  if (lower.includes('navy') || lower.includes('midnight')) return '#1E293B';
  if (lower.includes('blue') || lower.includes('cobalt')) return '#3B82F6';
  if (
    lower.includes('sand') ||
    lower.includes('beige') ||
    lower.includes('camel') ||
    lower.includes('oat') ||
    lower.includes('cream') ||
    lower.includes('ecru')
  )
    return '#D2B48C';
  if (
    lower.includes('heather') ||
    lower.includes('grey') ||
    lower.includes('gray') ||
    lower.includes('ash') ||
    lower.includes('silver')
  )
    return '#9CA3AF';
  if (lower.includes('charcoal') || lower.includes('slate') || lower.includes('graphite'))
    return '#374151';
  if (lower.includes('white') || lower.includes('ivory') || lower.includes('snow'))
    return '#F8FAFC';
  if (
    lower.includes('olive') ||
    lower.includes('sage') ||
    lower.includes('khaki') ||
    lower.includes('moss') ||
    lower.includes('forest') ||
    lower.includes('green')
  )
    return '#4D5D53';
  if (
    lower.includes('burgundy') ||
    lower.includes('maroon') ||
    lower.includes('wine') ||
    lower.includes('crimson') ||
    lower.includes('red')
  )
    return '#7F1D1D';
  if (
    lower.includes('brown') ||
    lower.includes('mocha') ||
    lower.includes('espresso') ||
    lower.includes('chocolate')
  )
    return '#5C4033';
  if (lower.includes('purple') || lower.includes('lavender') || lower.includes('plum'))
    return '#6D28D9';
  if (lower.includes('pink') || lower.includes('rose') || lower.includes('blush'))
    return '#F472B6';
  if (lower.includes('yellow') || lower.includes('gold') || lower.includes('mustard'))
    return '#EAB308';
  if (lower.includes('orange') || lower.includes('rust') || lower.includes('terracotta'))
    return '#EA580C';
  return '#141519';
}

export function getProductColorVariants(
  product: ProductDto | ProductDetailsDto
): ProductColorVariantDto[] {
  const fallbackImg = resolveProductImage(product.image, product.id);
  const list: ProductColorVariantDto[] = [];

  if (product.colorVariants && product.colorVariants.length > 0) {
    for (const v of product.colorVariants) {
      if (!v.colour) continue;
      list.push({
        colour: v.colour,
        colorHex: resolveColourHex(v.colour, v.colorHex),
        image: v.image ? resolveProductImage(v.image, product.id) : fallbackImg,
      });
    }
  }

  if (
    product.colour &&
    !list.some((x) => x.colour.toLowerCase() === product.colour!.toLowerCase())
  ) {
    list.push({
      colour: product.colour,
      colorHex: resolveColourHex(product.colour),
      image: fallbackImg,
    });
  }

  if ('stocks' in product && Array.isArray(product.stocks)) {
    for (const st of product.stocks) {
      if (
        st.colour &&
        !list.some((x) => x.colour.toLowerCase() === st.colour.toLowerCase())
      ) {
        list.push({
          colour: st.colour,
          colorHex: resolveColourHex(st.colour),
          image: fallbackImg,
        });
      }
    }
  }

  if (list.length === 0) {
    list.push({
      colour: 'Obsidian Black',
      colorHex: '#141519',
      image: fallbackImg,
    });
  }

  return list;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function resolveProductImage(image: string | null | undefined, _id = 1): string {
  if (!image) return PRODUCT_IMAGE_PLACEHOLDER;
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    image.startsWith('http://')
  ) {
    if (image.startsWith('http://localhost:5050/')) {
      return image.replace('http://localhost:5050/', 'https://localhost:7050/');
    }
    return image.replace(/^http:\/\//i, 'https://');
  }
  return image;
}

async function extractError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as Partial<ApiResponse<unknown>>;
    if (body.errors && body.errors.length > 0) return body.errors.join(' • ');
    if (body.message) return body.message;
  } catch {
    // ignore
  }
  return `Request failed (${res.status})`;
}

export async function fetchCategories(): Promise<CategoryDto[]> {
  const res = await fetch('/api/categories?PageIndex=1&PageSize=50');
  if (!res.ok) throw new Error('Failed to load categories');
  const json = (await res.json()) as ApiResponse<PaginationResponse<CategoryDto>>;
  return json.data?.data ?? [];
}

export async function fetchProducts(
  params: ProductQueryParams = {}
): Promise<PaginationResponse<ProductDto>> {
  const qs = new URLSearchParams();
  if (params.categoryId) qs.set('CategoryId', String(params.categoryId));
  if (params.search?.trim()) qs.set('Search', params.search.trim());
  if (params.colour?.trim()) qs.set('Colour', params.colour.trim());
  if (params.size?.trim()) qs.set('Size', params.size.trim());
  if (params.onlyAvailable !== undefined) qs.set('OnlyAvailable', String(params.onlyAvailable));
  if (params.sort?.trim()) qs.set('Sort', params.sort.trim());
  qs.set('PageIndex', String(params.pageIndex ?? 1));
  qs.set('PageSize', String(params.pageSize ?? 24));

  const res = await fetch(`/api/products?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to load products');
  const json = (await res.json()) as ApiResponse<PaginationResponse<ProductDto>>;
  return (
    json.data ?? {
      pageIndex: 1,
      pageSize: 24,
      totalCount: 0,
      data: [],
    }
  );
}

export async function fetchProductDetails(id: number): Promise<ProductDetailsDto> {
  const res = await fetch(`/api/products/${id}`);
  if (!res.ok) throw new Error('Product not found');
  const json = (await res.json()) as ApiResponse<ProductDetailsDto>;
  if (!json.data) throw new Error('Product data missing');
  return json.data;
}

export async function fetchStocksByProduct(productId: number): Promise<StockDto[]> {
  const res = await fetch(`/api/stocks/product/${productId}`);
  if (!res.ok) return [];
  const json = (await res.json()) as ApiResponse<StockDto[]>;
  return json.data ?? [];
}

// ============================================================================
// ADMIN PORTAL API FUNCTIONS (Requires Admin JWT Bearer Token)
// ============================================================================

export async function adminCreateCategory(
  payload: {
    categoryName: string;
    categoryDescription: string;
    imageFile?: File | null;
  },
  token: string
): Promise<CategoryDto> {
  const form = new FormData();
  form.append('CategoryName', payload.categoryName);
  form.append('CategoryDescription', payload.categoryDescription);
  if (payload.imageFile) {
    form.append('ImageFile', payload.imageFile);
  }

  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<CategoryDto>;
  if (!json.data) throw new Error(json.message || 'Failed to create category');
  return json.data;
}

export async function adminUpdateCategory(
  id: number,
  payload: {
    categoryName: string;
    categoryDescription: string;
    imageFile?: File | null;
  },
  token: string
): Promise<CategoryDto> {
  const form = new FormData();
  form.append('CategoryName', payload.categoryName);
  form.append('CategoryDescription', payload.categoryDescription);
  if (payload.imageFile) {
    form.append('ImageFile', payload.imageFile);
  }

  const res = await fetch(`/api/categories/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<CategoryDto>;
  if (!json.data) throw new Error(json.message || 'Failed to update category');
  return json.data;
}

export async function adminDeleteCategory(id: number, token: string): Promise<void> {
  const res = await fetch(`/api/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await extractError(res));
}

export interface AdminProductFormPayload {
  productName: string;
  productDescription: string;
  categoryId: number;
  unitPrice: number;
  colour: string;
  size: string;
  productAvailable: boolean;
  imageFile?: File | null;
  colorVariantsJson?: string;
}

export async function adminUploadColorImage(
  file: File,
  colour: string,
  colorHex: string,
  token: string
): Promise<ProductColorVariantDto> {
  const form = new FormData();
  form.append('file', file);
  form.append('colour', colour);
  form.append('colorHex', colorHex);

  const res = await fetch('/api/products/color-image', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<ProductColorVariantDto>;
  if (!json.data) throw new Error(json.message || 'Failed to upload color image');
  return json.data;
}

export async function adminCreateProduct(
  payload: AdminProductFormPayload,
  token: string
): Promise<ProductDetailsDto> {
  const form = new FormData();
  form.append('ProductName', payload.productName);
  form.append('ProductDescription', payload.productDescription);
  form.append('CategoryId', String(payload.categoryId));
  form.append('UnitPrice', String(payload.unitPrice));
  form.append('Colour', payload.colour);
  form.append('Size', payload.size);
  form.append('ProductAvailable', String(payload.productAvailable));
  if (payload.imageFile) {
    form.append('ImageFile', payload.imageFile);
  }
  if (payload.colorVariantsJson) {
    form.append('ColorVariantsJson', payload.colorVariantsJson);
  }

  const res = await fetch('/api/products', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<ProductDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Failed to create product');
  return json.data;
}

export async function adminUpdateProduct(
  id: number,
  payload: AdminProductFormPayload,
  token: string
): Promise<ProductDetailsDto> {
  const form = new FormData();
  form.append('ProductName', payload.productName);
  form.append('ProductDescription', payload.productDescription);
  form.append('CategoryId', String(payload.categoryId));
  form.append('UnitPrice', String(payload.unitPrice));
  form.append('Colour', payload.colour);
  form.append('Size', payload.size);
  form.append('ProductAvailable', String(payload.productAvailable));
  if (payload.imageFile) {
    form.append('ImageFile', payload.imageFile);
  }
  if (payload.colorVariantsJson) {
    form.append('ColorVariantsJson', payload.colorVariantsJson);
  }

  const res = await fetch(`/api/products/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<ProductDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Failed to update product');
  return json.data;
}

export async function adminDeleteProduct(id: number, token: string): Promise<void> {
  const res = await fetch(`/api/products/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await extractError(res));
}

export async function adminCreateStock(
  payload: {
    productId: number;
    size: string;
    colour: string;
    quantityInStock: number;
  },
  token: string
): Promise<StockDto> {
  const res = await fetch('/api/stocks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<StockDto>;
  if (!json.data) throw new Error(json.message || 'Failed to add stock variant');
  return json.data;
}

export async function adminUpdateStock(
  stockId: number,
  payload: {
    size: string;
    colour: string;
    quantityInStock: number;
  },
  token: string
): Promise<StockDto> {
  const res = await fetch(`/api/stocks/${stockId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<StockDto>;
  if (!json.data) throw new Error(json.message || 'Failed to update stock');
  return json.data;
}

export async function adminDeleteStock(stockId: number, token: string): Promise<void> {
  const res = await fetch(`/api/stocks/${stockId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await extractError(res));
}

// ============================================================================
// CHECKOUT, CUSTOMER PROFILE & ORDER API FUNCTIONS
// ============================================================================

export type OrderFulfillmentStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface OrderDto {
  id: number;
  orderDate: string;
  paid: boolean;
  paymentDate: string | null;
  orderStatus?: string;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;
  promoCode?: string | null;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhoneNo: string;
  customerCity: string;
  shippingAddress: string;
  paymentId: number;
  paymentType: string;
  totalItemsCount?: number;
  itemsCount?: number;
  orderTotal: number;
}

export interface OrderDetailItemDto {
  id: number;
  productId: number;
  productName: string;
  productImage?: string | null;
  pictureUrl?: string | null;
  size: string;
  colour: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface OrderDetailsDto extends OrderDto {
  customerPostcode?: string;
  items: OrderDetailItemDto[];
}

export interface CustomerDetailsDto {
  id: number;
  firstName: string;
  lastName: string;
  city: string;
  postcode: string;
  address: string;
  phoneNo: string;
  email: string;
  applicationUserId: string;
  createdAt: string;
  orders: OrderDto[];
}

export interface PaymentDto {
  id: number;
  paymentType: number | string;
}

export interface CreateOrderItemPayload {
  productId: number;
  size: string;
  colour: string;
  quantity: number;
}

export interface CreateOrderPayload {
  paymentId: number;
  paid: boolean;
  firstName?: string;
  lastName?: string;
  phoneNo?: string;
  city?: string;
  shippingAddress: string;
  promoCode?: string;
  items: CreateOrderItemPayload[];
}

export const EGYPT_CITIES_WITH_RATES: { city: string; zone: string; fee: number }[] = [
  { city: 'Cairo', zone: 'Greater Cairo', fee: 65 },
  { city: 'New Cairo / Tagamoa', zone: 'Greater Cairo', fee: 65 },
  { city: 'Giza', zone: 'Greater Cairo', fee: 65 },
  { city: '6th of October / Sheikh Zayed', zone: 'Greater Cairo', fee: 65 },
  { city: 'Alexandria', zone: 'Alexandria', fee: 80 },
  { city: 'Mansoura', zone: 'Delta & Canal', fee: 90 },
  { city: 'Tanta', zone: 'Delta & Canal', fee: 90 },
  { city: 'Zagazig', zone: 'Delta & Canal', fee: 90 },
  { city: 'Ismailia', zone: 'Delta & Canal', fee: 90 },
  { city: 'Port Said', zone: 'Delta & Canal', fee: 90 },
  { city: 'Suez', zone: 'Delta & Canal', fee: 90 },
  { city: 'Damietta', zone: 'Delta & Canal', fee: 90 },
  { city: 'Hurghada / Red Sea', zone: 'Upper Egypt & Coastal', fee: 115 },
  { city: 'Assiut', zone: 'Upper Egypt & Coastal', fee: 115 },
  { city: 'Minya', zone: 'Upper Egypt & Coastal', fee: 115 },
  { city: 'Luxor / Aswan', zone: 'Upper Egypt & Coastal', fee: 115 },
];

export const FREE_SHIPPING_THRESHOLD_EGP = 2500;

export interface PromoCodeDto {
  id: number;
  code: string;
  discountType: 'Percentage' | 'FixedAmount' | 'FreeShipping' | string;
  discountValue: number;
  minOrderSubtotal: number;
  isActive: boolean;
  isFeaturedOnBanner?: boolean;
  description: string;
  createdAt?: string;
}

export interface CreatePromoCodePayload {
  code: string;
  discountType: 'Percentage' | 'FixedAmount' | 'FreeShipping';
  discountValue: number;
  minOrderSubtotal: number;
  isActive?: boolean;
  isFeaturedOnBanner?: boolean;
  description?: string;
}

export function calculateShippingAndPromoPreview(
  subtotal: number,
  city: string,
  rawPromoCode?: string,
  dynamicPromoCodes?: PromoCodeDto[]
): {
  baseShippingFee: number;
  shippingFee: number;
  discountAmount: number;
  appliedPromoCode: string | null;
  promoMessage: string | null;
  grandTotal: number;
  amountNeededForFreeShipping: number;
} {
  const normalizedCity = (city || 'Cairo').trim().toLowerCase();
  let baseShippingFee = 120;

  if (
    normalizedCity.includes('cairo') ||
    normalizedCity.includes('giza') ||
    normalizedCity.includes('october') ||
    normalizedCity.includes('zayed') ||
    normalizedCity.includes('helwan') ||
    normalizedCity.includes('obour')
  ) {
    baseShippingFee = 75;
  } else if (
    normalizedCity.includes('alex') ||
    normalizedCity.includes('mansoura') ||
    normalizedCity.includes('tanta') ||
    normalizedCity.includes('zagazig') ||
    normalizedCity.includes('ismailia') ||
    normalizedCity.includes('suez') ||
    normalizedCity.includes('port said') ||
    normalizedCity.includes('damietta') ||
    normalizedCity.includes('banha') ||
    normalizedCity.includes('damanhour') ||
    normalizedCity.includes('shebin') ||
    normalizedCity.includes('kafr')
  ) {
    baseShippingFee = 90;
  }

  let shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD_EGP ? 0 : baseShippingFee;
  let discountAmount = 0;
  let appliedPromoCode: string | null = null;
  let promoMessage: string | null = null;

  const code = (rawPromoCode || '').trim().toUpperCase();
  if (code) {
    const matchedDynamic = (dynamicPromoCodes || []).find(
      (p) => p.isActive && p.code.trim().toUpperCase() === code
    );

    if (matchedDynamic) {
      if (subtotal < matchedDynamic.minOrderSubtotal) {
        promoMessage = `${matchedDynamic.code} requires a minimum order of ${matchedDynamic.minOrderSubtotal.toLocaleString()} EGP`;
      } else if (matchedDynamic.discountType.toLowerCase() === 'percentage') {
        const pct = Math.min(100, Math.max(0, matchedDynamic.discountValue));
        discountAmount = Math.round(subtotal * (pct / 100));
        appliedPromoCode = matchedDynamic.code.toUpperCase();
        promoMessage =
          matchedDynamic.description || `${pct}% discount applied`;
      } else if (matchedDynamic.discountType.toLowerCase() === 'fixedamount') {
        discountAmount = Math.min(subtotal, Math.max(0, matchedDynamic.discountValue));
        appliedPromoCode = matchedDynamic.code.toUpperCase();
        promoMessage =
          matchedDynamic.description ||
          `${discountAmount.toLocaleString()} EGP discount applied`;
      } else if (matchedDynamic.discountType.toLowerCase() === 'freeshipping') {
        shippingFee = 0;
        appliedPromoCode = matchedDynamic.code.toUpperCase();
        promoMessage =
          matchedDynamic.description || 'Complimentary Express Delivery unlocked';
      }
    } else {
      promoMessage = 'Invalid or inactive promo code.';
    }
  }

  const grandTotal = Math.max(0, subtotal - discountAmount + shippingFee);
  const amountNeededForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD_EGP - subtotal
  );

  return {
    baseShippingFee,
    shippingFee,
    discountAmount,
    appliedPromoCode,
    promoMessage,
    grandTotal,
    amountNeededForFreeShipping,
  };
}

export async function fetchMyCustomerProfile(token: string): Promise<CustomerDetailsDto> {
  const res = await fetch('/api/customers/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<CustomerDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Failed to load account profile');
  return json.data;
}

export async function fetchMyOrders(token: string): Promise<OrderDto[]> {
  const res = await fetch('/api/orders/my?pageIndex=1&pageSize=30', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<PaginationResponse<OrderDto>>;
  return json.data?.data ?? [];
}

export async function fetchMyOrderDetails(
  orderId: number,
  token: string
): Promise<OrderDetailsDto> {
  const res = await fetch(`/api/orders/my/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<OrderDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Order not found');
  return json.data;
}

export async function trackOrderPublic(
  orderId: number,
  phone: string
): Promise<OrderDetailsDto> {
  const qs = new URLSearchParams({
    orderId: String(orderId),
    phone: phone.trim(),
  });
  const res = await fetch(`/api/orders/track?${qs.toString()}`);
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<OrderDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Order not found');
  return json.data;
}

export async function fetchPayments(): Promise<PaymentDto[]> {
  const res = await fetch('/api/payments');
  if (!res.ok) return [];
  const json = (await res.json()) as ApiResponse<PaymentDto[]>;
  return json.data ?? [];
}

export async function createOrder(
  payload: CreateOrderPayload,
  token: string
): Promise<OrderDetailsDto> {
  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<OrderDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Failed to finalize order');
  return json.data;
}

// ============================================================================
// ADMIN ORDER & INVENTORY MANAGEMENT API FUNCTIONS
// ============================================================================

export async function adminFetchOrders(
  params: {
    paid?: boolean | null;
    sort?: string;
    pageIndex?: number;
    pageSize?: number;
  },
  token: string
): Promise<PaginationResponse<OrderDto>> {
  const query = new URLSearchParams();
  if (params.paid !== undefined && params.paid !== null) {
    query.set('paid', String(params.paid));
  }
  if (params.sort) query.set('sort', params.sort);
  query.set('pageIndex', String(params.pageIndex ?? 1));
  query.set('pageSize', String(params.pageSize ?? 50));

  const res = await fetch(`/api/orders/admin?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<PaginationResponse<OrderDto>>;
  return (
    json.data ?? {
      pageIndex: 1,
      pageSize: 50,
      totalCount: 0,
      data: [],
    }
  );
}

export async function adminFetchOrderDetails(
  orderId: number,
  token: string
): Promise<OrderDetailsDto> {
  const res = await fetch(`/api/orders/admin/${orderId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<OrderDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Order details not found');
  return json.data;
}

export async function adminUpdateOrderPaymentStatus(
  orderId: number,
  paid: boolean,
  token: string
): Promise<OrderDetailsDto> {
  const res = await fetch(`/api/orders/admin/${orderId}/payment-status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paid,
      paymentDate: paid ? new Date().toISOString() : null,
    }),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<OrderDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Failed to update order payment status');
  return json.data;
}

export async function adminUpdateOrderStatus(
  orderId: number,
  orderStatus: OrderFulfillmentStatus | string,
  token: string
): Promise<OrderDetailsDto> {
  const res = await fetch(`/api/orders/admin/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ orderStatus }),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<OrderDetailsDto>;
  if (!json.data) throw new Error(json.message || 'Failed to update order fulfillment status');
  return json.data;
}

export async function adminFetchAllStocks(
  token: string,
  pageSize = 50
): Promise<PaginationResponse<StockDto>> {
  const res = await fetch(`/api/stocks?pageIndex=1&pageSize=${pageSize}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<PaginationResponse<StockDto>>;
  return (
    json.data ?? {
      pageIndex: 1,
      pageSize,
      totalCount: 0,
      data: [],
    }
  );
}

export async function fetchActivePromoCodes(): Promise<PromoCodeDto[]> {
  try {
    const res = await fetch('/api/orders/promo-codes');
    if (!res.ok) return [];
    const json = (await res.json()) as ApiResponse<PromoCodeDto[]>;
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function adminFetchPromoCodes(token: string): Promise<PromoCodeDto[]> {
  const res = await fetch('/api/orders/admin/promo-codes', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<PromoCodeDto[]>;
  return json.data ?? [];
}

export async function adminCreatePromoCode(
  payload: CreatePromoCodePayload,
  token: string
): Promise<PromoCodeDto> {
  const res = await fetch('/api/orders/admin/promo-codes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<PromoCodeDto>;
  if (!json.data) throw new Error(json.message || 'Failed to save promo code');
  return json.data;
}

export async function adminTogglePromoCode(
  id: number,
  token: string
): Promise<PromoCodeDto> {
  const res = await fetch(`/api/orders/admin/promo-codes/${id}/toggle`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<PromoCodeDto>;
  if (!json.data) throw new Error(json.message || 'Failed to toggle promo code');
  return json.data;
}

export async function adminFeaturePromoCode(
  id: number,
  token: string
): Promise<PromoCodeDto> {
  const res = await fetch(`/api/orders/admin/promo-codes/${id}/feature`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<PromoCodeDto>;
  if (!json.data) throw new Error(json.message || 'Failed to update banner promo code');
  return json.data;
}

export async function adminDeletePromoCode(
  id: number,
  token: string
): Promise<void> {
  const res = await fetch(`/api/orders/admin/promo-codes/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await extractError(res));
}



