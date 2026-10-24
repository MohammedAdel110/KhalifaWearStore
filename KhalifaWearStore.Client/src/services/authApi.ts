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
    (Array.isArray(raw.roles) && raw.roles.some((r) => r.toLowerCase() === 'owner'));

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

export type RegisterFieldKey =
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phoneNo'
  | 'city'
  | 'password';

export type RegisterFieldErrors = Partial<Record<RegisterFieldKey, string>>;

export class ApiValidationError extends Error {
  fieldErrors: RegisterFieldErrors;

  constructor(message: string, fieldErrors: RegisterFieldErrors = {}) {
    super(message);
    this.name = 'ApiValidationError';
    this.fieldErrors = fieldErrors;
  }
}

export function isNameOnlyNumbers(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  // Reject if it contains no letters (e.g., only digits, spaces, or symbols)
  return /^\d+$/.test(trimmed) || !/[a-zA-Z\u0600-\u06FF]/.test(trimmed);
}

export function validateRegistrationFields(
  values: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNo: string;
    city: string;
    password: string;
  },
  options: { requireCity?: boolean } = { requireCity: true }
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};

  const fName = values.firstName.trim();
  const lName = values.lastName.trim();
  const email = values.email.trim();
  const phone = values.phoneNo.trim();
  const city = values.city.trim();
  const pwd = values.password;

  if (!fName) {
    errors.firstName = 'First name is required.';
  } else if (isNameOnlyNumbers(fName)) {
    errors.firstName = 'First name cannot consist solely of numbers.';
  }

  if (!lName) {
    errors.lastName = 'Last name is required.';
  } else if (isNameOnlyNumbers(lName)) {
    errors.lastName = 'Last name cannot consist solely of numbers.';
  }

  if (!email) {
    errors.email = 'Email address is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  if (!phone) {
    errors.phoneNo = 'Phone number is required.';
  } else if (!phone.startsWith('01')) {
    errors.phoneNo = 'Phone number must begin with the prefix "01".';
  } else if (!/^01\d+$/.test(phone)) {
    errors.phoneNo = 'Phone number must contain digits only and begin with "01".';
  }

  if (options.requireCity !== false) {
    if (!city) {
      errors.city = 'City / Governorate is required.';
    } else if (isNameOnlyNumbers(city)) {
      errors.city = 'City / Governorate cannot consist solely of numbers.';
    }
  }

  if (!pwd) {
    errors.password = 'Password is required.';
  } else if (
    pwd.length < 6 ||
    !/[A-Z]/.test(pwd) ||
    !/[a-z]/.test(pwd) ||
    !/[0-9]/.test(pwd) ||
    !/[^A-Za-z0-9]/.test(pwd)
  ) {
    errors.password =
      'Password must be at least 6 characters with uppercase, lowercase, number, and symbol.';
  }

  return errors;
}

const KNOWN_FIELD_MAP: Record<string, RegisterFieldKey> = {
  firstname: 'firstName',
  lastname: 'lastName',
  email: 'email',
  phoneno: 'phoneNo',
  phonenumber: 'phoneNo',
  city: 'city',
  password: 'password',
};

async function parseApiError(response: Response): Promise<ApiValidationError> {
  const fieldErrors: RegisterFieldErrors = {};
  const cleanMessages: string[] = [];

  try {
    const body = (await response.json()) as Partial<ApiResponse<unknown>>;
    if (body.errors && Array.isArray(body.errors) && body.errors.length > 0) {
      for (const rawErr of body.errors) {
        const colonIdx = rawErr.indexOf(':');
        if (colonIdx > 0) {
          const rawKey = rawErr.slice(0, colonIdx).trim().toLowerCase();
          const msg = rawErr.slice(colonIdx + 1).trim();
          const mappedKey = KNOWN_FIELD_MAP[rawKey];
          if (mappedKey) {
            fieldErrors[mappedKey] = msg;
            cleanMessages.push(msg);
            continue;
          }
        }
        const lower = rawErr.toLowerCase();
        if (lower.includes('email')) {
          fieldErrors.email = rawErr;
        } else if (lower.includes('phone') || lower.includes('01')) {
          fieldErrors.phoneNo = rawErr;
        } else if (lower.includes('first name')) {
          fieldErrors.firstName = rawErr;
        } else if (lower.includes('last name')) {
          fieldErrors.lastName = rawErr;
        } else if (lower.includes('password')) {
          fieldErrors.password = rawErr;
        }
        cleanMessages.push(rawErr);
      }
      return new ApiValidationError(cleanMessages.join(' • '), fieldErrors);
    }

    if (body.message) {
      const lower = body.message.toLowerCase();
      if (lower.includes('email')) {
        fieldErrors.email = body.message;
      } else if (lower.includes('phone') || lower.includes('01')) {
        fieldErrors.phoneNo = body.message;
      }
      return new ApiValidationError(body.message, fieldErrors);
    }
  } catch {
    // Fallback if response is not JSON
  }
  return new ApiValidationError(`Request failed with status ${response.status}`, fieldErrors);
}

export async function loginUser(payload: LoginPayload): Promise<AuthResponseDto> {
  const response = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as ApiResponse<RawAuthModelDto>;
  if (!result.isSuccess || !result.data) {
    throw new ApiValidationError(result.message || 'Authentication failed');
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
    throw await parseApiError(response);
  }

  const result = (await response.json()) as ApiResponse<RawAuthModelDto>;
  if (!result.isSuccess || !result.data) {
    throw new ApiValidationError(result.message || 'Registration failed');
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

export async function createAdminUser(
  payload: RegisterPayload,
  ownerToken: string,
  onOwnerSessionRefreshed?: (newSession: AuthResponseDto | null) => void
): Promise<AuthResponseDto> {
  if (isJwtTokenExpired(ownerToken)) {
    localStorage.removeItem('kf_owner_session');
    onOwnerSessionRefreshed?.(null);
    throw new ApiValidationError('Your Owner session has expired. Please sign in again.');
  }

  const response = await fetch(`${API_BASE}/create-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ownerToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('kf_owner_session');
    onOwnerSessionRefreshed?.(null);
    throw new ApiValidationError('Your Owner session has expired. Please sign in again.');
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as ApiResponse<RawAuthModelDto>;
  if (!result.isSuccess || !result.data) {
    throw new ApiValidationError(result.message || 'Failed to create admin account');
  }
  return normalizeAuthResponse(result.data);
}

export async function fetchAdmins(
  ownerToken: string,
  onOwnerSessionRefreshed?: (newSession: AuthResponseDto | null) => void
): Promise<AdminAccountDto[]> {
  if (isJwtTokenExpired(ownerToken)) {
    localStorage.removeItem('kf_owner_session');
    onOwnerSessionRefreshed?.(null);
    throw new ApiValidationError('Your Owner session has expired. Please sign in again.');
  }

  const response = await fetch(`${API_BASE}/admins`, {
    headers: {
      Authorization: `Bearer ${ownerToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('kf_owner_session');
    onOwnerSessionRefreshed?.(null);
    throw new ApiValidationError('Your Owner session has expired. Please sign in again.');
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as ApiResponse<AdminAccountDto[]>;
  return result.data ?? [];
}

export async function deleteAdminUser(
  adminId: string,
  ownerToken: string,
  onOwnerSessionRefreshed?: (newSession: AuthResponseDto | null) => void
): Promise<void> {
  if (isJwtTokenExpired(ownerToken)) {
    localStorage.removeItem('kf_owner_session');
    onOwnerSessionRefreshed?.(null);
    throw new ApiValidationError('Your Owner session has expired. Please sign in again.');
  }

  const response = await fetch(`${API_BASE}/admins/${adminId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${ownerToken}`,
    },
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('kf_owner_session');
    onOwnerSessionRefreshed?.(null);
    throw new ApiValidationError('Your Owner session has expired. Please sign in again.');
  }

  if (!response.ok) {
    throw await parseApiError(response);
  }
}
