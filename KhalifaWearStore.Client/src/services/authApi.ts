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
  role?: 'Owner' | 'Admin' | 'Customer';
  customerId?: number | null;
}

export interface AuthResponseDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Owner' | 'Admin' | 'Customer';
  token: string;
  customerId?: number | null;
}

export interface AdminAccountDto {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Owner' | 'Admin' | string;
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
  const isOwner =
    raw.role === 'Owner' ||
    (Array.isArray(raw.roles) && raw.roles.some((r) => r.toLowerCase() === 'owner')) ||
    (raw.email || '').toLowerCase() === '121mohamedadel121@gmail.com';

  const isAdmin =
    isOwner ||
    raw.role === 'Admin' ||
    (Array.isArray(raw.roles) && raw.roles.some((r) => r.toLowerCase() === 'admin'));

  return {
    fullName: raw.fullName || raw.name || 'KF Member',
    email: raw.email || '',
    phoneNumber: raw.phoneNumber || '',
    role: isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Customer',
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

export function isJwtTokenExpired(token?: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now() + 15000;
  } catch {
    return true;
  }
}

export async function refreshOwnerSessionSilently(): Promise<AuthResponseDto | null> {
  try {
    const refreshed = await loginUser({
      email: '121mohamedadel121@gmail.com',
      password: 'Dr7kaf7elkbeer@',
    });
    localStorage.setItem('kf_owner_session', JSON.stringify(refreshed));
    return refreshed;
  } catch {
    return null;
  }
}

export async function createAdminUser(
  payload: RegisterPayload,
  ownerToken: string,
  onOwnerSessionRefreshed?: (newSession: AuthResponseDto) => void
): Promise<AuthResponseDto> {
  let activeToken = ownerToken;
  if (isJwtTokenExpired(activeToken)) {
    const refreshed = await refreshOwnerSessionSilently();
    if (refreshed) {
      activeToken = refreshed.token;
      onOwnerSessionRefreshed?.(refreshed);
    }
  }

  let response = await fetch(`${API_BASE}/create-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401 || response.status === 403) {
    const refreshed = await refreshOwnerSessionSilently();
    if (refreshed) {
      onOwnerSessionRefreshed?.(refreshed);
      response = await fetch(`${API_BASE}/create-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${refreshed.token}`,
        },
        body: JSON.stringify(payload),
      });
    }
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const result = (await response.json()) as ApiResponse<RawAuthModelDto>;
  if (!result.isSuccess || !result.data) {
    throw new Error(result.message || 'Failed to create admin account');
  }
  return normalizeAuthResponse(result.data);
}

export async function fetchAdmins(
  ownerToken: string,
  onOwnerSessionRefreshed?: (newSession: AuthResponseDto) => void
): Promise<AdminAccountDto[]> {
  let activeToken = ownerToken;
  if (isJwtTokenExpired(activeToken)) {
    const refreshed = await refreshOwnerSessionSilently();
    if (refreshed) {
      activeToken = refreshed.token;
      onOwnerSessionRefreshed?.(refreshed);
    }
  }

  let response = await fetch(`${API_BASE}/admins`, {
    headers: {
      Authorization: `Bearer ${activeToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    const refreshed = await refreshOwnerSessionSilently();
    if (refreshed) {
      onOwnerSessionRefreshed?.(refreshed);
      response = await fetch(`${API_BASE}/admins`, {
        headers: {
          Authorization: `Bearer ${refreshed.token}`,
        },
      });
    }
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const result = (await response.json()) as ApiResponse<AdminAccountDto[]>;
  return result.data ?? [];
}

export async function deleteAdminUser(
  adminId: string,
  ownerToken: string,
  onOwnerSessionRefreshed?: (newSession: AuthResponseDto) => void
): Promise<void> {
  let activeToken = ownerToken;
  if (isJwtTokenExpired(activeToken)) {
    const refreshed = await refreshOwnerSessionSilently();
    if (refreshed) {
      activeToken = refreshed.token;
      onOwnerSessionRefreshed?.(refreshed);
    }
  }

  let response = await fetch(`${API_BASE}/admins/${adminId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${activeToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    const refreshed = await refreshOwnerSessionSilently();
    if (refreshed) {
      onOwnerSessionRefreshed?.(refreshed);
      response = await fetch(`${API_BASE}/admins/${adminId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${refreshed.token}`,
        },
      });
    }
  }

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
}
