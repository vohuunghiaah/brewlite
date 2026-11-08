export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  basePrice: number | string;
  imageUrl: string;
  stock: number;
  version: number;
  isAvailable: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
  toppings: string[];
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
  product?: Product;
}

export interface Order {
  id: string;
  orderCode: string;
  userId: string;
  status: 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'PAYMENT_FAILED' | 'CANCELLED';
  subtotal: number | string;
  discountAmount: number | string;
  totalAmount: number | string;
  note?: string;
  promoCode?: string;
  createdAt: string;
  items: OrderItem[];
  payments?: any[];
}

export async function fetchProducts(
  category?: string,
  search?: string,
): Promise<Product[]> {
  const params = new URLSearchParams();
  if (category && category !== 'All' && category !== 'Tất cả') {
    params.set('category', category);
  }
  if (search && search.trim() !== '') {
    params.set('search', search.trim());
  }

  const queryString = params.toString();
  const url = `${API_BASE_URL}/products${queryString ? `?${queryString}` : ''}`;

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Không thể tải thực đơn đồ uống (${res.status})`);
  }
  return res.json();
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Không tìm thấy sản phẩm (${res.status})`);
  }
  return res.json();
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Đăng nhập không thành công.');
  }
  return data;
}

export async function registerUser(email: string, password: string, fullName: string) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Đăng ký không thành công.');
  }
  return data;
}

export async function createOrder(
  token: string,
  payload: {
    items: Array<{
      productId: string;
      size: 'SMALL' | 'MEDIUM' | 'LARGE';
      toppings?: string[];
      quantity: number;
    }>;
    note?: string;
    promoCode?: string;
  },
): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Không thể tạo đơn hàng.');
  }
  return data;
}

export async function fetchMyOrders(token: string): Promise<Order[]> {
  const res = await fetch(`${API_BASE_URL}/orders/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Không thể tải lịch sử đơn hàng.');
  }
  return data;
}

export async function fetchOrderById(token: string, id: string): Promise<Order> {
  const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Không tìm thấy đơn hàng.');
  }
  return data;
}

export async function processPayment(
  token: string,
  idempotencyKey: string,
  payload: {
    orderId: string;
    method: 'E_WALLET' | 'BANK_CARD';
    amount: number;
    mockOutcome?: 'SUCCESS' | 'FAILED' | 'PENDING';
  },
) {
  const res = await fetch(`${API_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Thanh toán không thành công.');
  }
  return data;
}
