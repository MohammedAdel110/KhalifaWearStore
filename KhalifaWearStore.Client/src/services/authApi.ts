export interface ApiResponse<T> {
  statusCode: number;
  isSuccess: boolean;
  message: string;
  data: T | null;
  errors: string[] | null;
}

export interface RawAuthModelDto {
  message?: string | null;
  isAuthenticated?: boolean;
  phoneNumber?: string | null;
  name?: string | null;
  fullName?: string | null;
  email?: string | null;
  token?: string | null;
  expireOn?: string;
  roles?: string[] | null;
  role?: 'Admin' | 'Customer';
  customerId?: number | null;
}

export interface AuthResponseDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Admin' | 'Customer';
  token: string;
  customerId?: number | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNo: string;
  city: string;
  password: string;
}

const API_BASE = '/api/Auth';

function normalizeAuthResponse(raw: RawAuthModelDto): AuthResponseDto {
  const isAdmin =
    raw.role === 'Admin' ||
    (Array.isArray(raw.roles) && raw.roles.some((r) => r.toLowerCase() === 'admin'));

  return {
    fullName: raw.fullName || raw.name || 'KF Member',
    email: raw.email || '',
    phoneNumber: raw.phoneNumber || '',
    role: isAdmin ? 'Admin' : 'Customer',
    token: raw.token || '',
    customerId: raw.customerId ?? null,
  };
}

async function parseApiError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Partial<ApiResponse<unknown>>;
    if (body.errors && body.errors.length > 0) {
      return body.errors.join(' • ');
    }
    if (body.message) {
      return body.message;
    }
  } catch {
    // Fallback if response is not JSON
  }
  return `Request failed with status ${response.status}`;
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponseDto> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const result = (await response.json()) as ApiResponse<RawAuthModelDto>;
  if (!result.isSuccess || !result.data) {
    throw new Error(result.message || 'Authentication failed');
  }
  return normalizeAuthResponse(result.data);
}

export async function registerCustomer(payload: RegisterPayload): Promise<AuthResponseDto> {
  const response = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const result = (await response.json()) as ApiResponse<RawAuthModelDto>;
  if (!result.isSuccess || !result.data) {
    throw new Error(result.message || 'Registration failed');
  }
  return normalizeAuthResponse(result.data);
}

export async function createAdminUser(
  payload: RegisterPayload,
  adminToken: string
): Promise<AuthResponseDto> {
  const response = await fetch(`${API_BASE}/create-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const result = (await response.json()) as ApiResponse<RawAuthModelDto>;
  if (!result.isSuccess || !result.data) {
    throw new Error(result.message || 'Failed to create admin account');
  }
  return normalizeAuthResponse(result.data);
}
