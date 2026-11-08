import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProductCard, formatVND } from './ProductCard';
import { Product } from '../lib/api-client';

describe('ProductCard Component', () => {
  const mockProduct: Product = {
    id: 'prod-101',
    name: 'Cà phê Muối',
    description: 'Vị mặn béo độc đáo từ kem sữa muối.',
    category: 'Cà phê',
    basePrice: 42000,
    imageUrl: 'https://example.com/caphemuoi.png',
    stock: 50,
    version: 1,
    isAvailable: true,
  };

  it('renders product details correctly', () => {
    render(<ProductCard product={mockProduct} />);

    expect(screen.getByText('Cà phê Muối')).toBeInTheDocument();
    expect(screen.getByText('Cà phê')).toBeInTheDocument();
    expect(screen.getByText(/42\.000/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chọn món Cà phê Muối/i })).toBeInTheDocument();
  });

  it('displays out of stock badge and disables button when stock is 0', () => {
    const outOfStockProduct: Product = {
      ...mockProduct,
      stock: 0,
      isAvailable: false,
    };

    render(<ProductCard product={outOfStockProduct} />);

    expect(screen.getByText('Tạm hết hàng')).toBeInTheDocument();
    const button = screen.getByTitle('Sản phẩm tạm hết hàng');
    expect(button).toBeDisabled();
  });

  it('formats VND currency accurately', () => {
    const formatted = formatVND(45000);
    expect(formatted).toContain('45.000');
  });
});
