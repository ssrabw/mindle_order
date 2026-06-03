import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import type { Product } from '../types/product';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_variants(*)')
          .eq('is_visible', true);

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: Product[] = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description || '',
            category: p.category || '',
            mainImages: p.main_images || [],
            variants: (p.product_variants || [])
              .filter((v: any) => v.is_visible !== false)
              .map((v: any) => ({
                id: v.id,
                colorName: v.color_name,
                image: v.image
              }))
          }));
          setProducts(mapped);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error('Supabase DB 조회 오류:', err);
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProducts();
  }, []);

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.25rem' }}>
        상품 정보를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="product-list-container">
      <div className="my-orders-banner">
        <Link to="/my-orders" className="my-orders-banner-btn">
          🔍 내 주문 내역(실시간 포장상태)
        </Link>
      </div>
      <h1 className="product-list-title">도매 주문 상품 목록</h1>
      
      <div className="product-grid">
        {products.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            등록된 상품이 없습니다.
          </div>
        ) : (
          products.map((product) => (
            <Link 
              to={`/product/${product.id}`} 
              key={product.id} 
              className="product-card"
            >
              <img 
                src={product.mainImages[0] || ''} 
                alt={product.name} 
                className="product-card-img"
              />
              <div className="product-card-info">
                <h3 className="product-card-name">{product.name}</h3>
                <p className="product-card-price">
                  {product.price.toLocaleString()}원
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductList;
