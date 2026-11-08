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

  const res = await fetch(url, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Không thể tải thực đơn đồ uống (${res.status})`);
  }

  return res.json();
}

export async function fetchProductById(id: string): Promise<Product> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Không tìm thấy sản phẩm (${res.status})`);
  }

  return res.json();
}
