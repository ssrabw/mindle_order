import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import type { Product } from '../types/product';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const categories = ['전체', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter((product) => {
    // 1. Category Filter
    if (selectedCategory !== '전체' && product.category !== selectedCategory) {
      return false;
    }
    // 2. Search Query Filter (by name)
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      return product.name.toLowerCase().includes(query);
    }
    return true;
  });

  return (
    <div className="product-list-container">
      <div className="my-orders-banner">
        <Link to="/my-orders" className="my-orders-banner-btn">
          내 주문 보기
        </Link>
      </div>
      <h1 className="product-list-title">민들레 상품 목록</h1>

      {/* Category & Search Filter Bar */}
      <div className="orders-filter-bar glassmorphism" style={{
        padding: '16px',
        borderRadius: '14px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center'
      }}>
        {/* Row 1: 카테고리 필터 태그 */}
        <div className="filter-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-tag-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Row 2: 검색창 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          maxWidth: '500px',
          boxSizing: 'border-box'
        }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🔍 검색:</span>
          <input
            type="text"
            placeholder="상품명 검색"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 14px',
              borderRadius: '20px',
              border: '1.5px solid var(--border)',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-h)',
              fontSize: '0.9rem',
              fontWeight: '700',
              outline: 'none',
              transition: 'border-color 0.2s',
              width: '100%'
            }}
          />
        </div>
      </div>

      <div className="product-grid">
        {filteredProducts.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.1rem' }}>
            {searchQuery.trim() || selectedCategory !== '전체'
              ? '검색 및 필터 결과와 일치하는 상품이 없습니다.'
              : '등록된 상품이 없습니다.'}
          </div>
        ) : (
          filteredProducts.map((product) => (
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
