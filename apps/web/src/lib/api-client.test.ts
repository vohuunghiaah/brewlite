import { fetchProducts, fetchProductById } from './api-client';

describe('API Client', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  it('fetchProducts returns list of products on successful response', async () => {
    const mockData = [
      { id: '1', name: 'Latte', basePrice: 40000, category: 'Cà phê' },
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const products = await fetchProducts('Cà phê', 'Latte');
    expect(products).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/products?category=C%C3%A0+ph%C3%AA&search=Latte'),
      expect.any(Object),
    );
  });

  it('fetchProducts throws error when response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchProducts()).rejects.toThrow('Không thể tải thực đơn đồ uống (500)');
  });

  it('fetchProductById returns product details on success', async () => {
    const mockDetail = { id: 'prod-1', name: 'Cappuccino', basePrice: 45000 };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDetail,
    });

    const detail = await fetchProductById('prod-1');
    expect(detail).toEqual(mockDetail);
  });
});
