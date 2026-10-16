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

const FALLBACK_HOODIE_IMAGES = [
  'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1516826957135-700dedea698c?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?auto=format&fit=crop&w=900&q=85',
];

export function resolveProductImage(image: string | null | undefined, id = 1): string {
  if (!image) {
    return FALLBACK_HOODIE_IMAGES[id % FALLBACK_HOODIE_IMAGES.length];
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
  payload: { categoryName: string; categoryDescription: string },
  token: string
): Promise<CategoryDto> {
  const res = await fetch('/api/categories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await extractError(res));
  const json = (await res.json()) as ApiResponse<CategoryDto>;
  if (!json.data) throw new Error(json.message || 'Failed to create category');
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
