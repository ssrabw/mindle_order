import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import type { Product } from '../types/product';

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isMobile, setIsMobile] = useState<boolean>(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_variants(*)');

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: Product[] = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            description: p.description || '',
            category: p.category || '',
            mainImages: p.main_images || [],
            isDeleted: p.is_deleted === true,
            isVisible: p.is_visible !== false,
            isBest: p.is_best === true,
            isRealDeleted: p.is_real_deleted === true,
            variants: (p.product_variants || [])
              .map((v: any) => ({
                id: v.id,
                colorName: v.color_name,
                image: v.image,
                isVisible: v.is_visible !== false
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
    // 0. Filter out completely deleted products
    if (product.isRealDeleted) {
      return false;
    }
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

  const bestProducts = products.filter((product) => product.isBest && !product.isDeleted && product.isVisible && !product.isRealDeleted);
  const shouldSlide = isMobile ? bestProducts.length >= 3 : bestProducts.length >= 5;

  const renderBestProductCard = (product: Product, suffix: string = '') => {
    return (
      <Link
        to={`/product/${product.id}`}
        key={`${product.id}${suffix}`}
        className="product-card best-product-card"
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          textDecoration: 'none',
          color: 'inherit'
        }}
      >
        <div className="best-badge">
          Best
        </div>
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
    );
  };

  return (
    <div className="product-list-container">
      <h1 className="product-list-title">민들레 상품 목록</h1>

      {/* Best Products Layer */}
      {bestProducts.length > 0 && (
        <div className="best-products-section glassmorphism" style={{
          padding: '24px',
          borderRadius: '20px',
          marginBottom: '32px'
        }}>
          <div className="best-products-header" style={{ marginBottom: '20px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>BEST PRODUCTS</span>
            <h2 style={{ fontSize: '1.6rem', fontWeight: '800', margin: '0' }}>인기 베스트 상품</h2>
          </div>

          {shouldSlide ? (
            <div className="best-products-marquee-wrapper">
              <div className="best-products-marquee-track">
                <div className="best-products-marquee-group">
                  {bestProducts.map((p) => renderBestProductCard(p, '-group1'))}
                </div>
                <div className="best-products-marquee-group" aria-hidden="true">
                  {bestProducts.map((p) => renderBestProductCard(p, '-group2'))}
                </div>
              </div>
            </div>
          ) : (
            <div className="best-products-static-grid">
              {bestProducts.map((p) => renderBestProductCard(p))}
            </div>
          )}
        </div>
      )}

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
          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>검색:</span>
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
          filteredProducts.map((product) => {
            const isSoldOut = product.isDeleted;
            const isTempSoldOut = !product.isVisible;
            return (
              <Link
                to={`/product/${product.id}`}
                key={product.id}
                className="product-card"
                style={{
                  position: 'relative',
                  opacity: (isSoldOut || isTempSoldOut) ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                  pointerEvents: 'auto'
                }}
              >
                {/* Best Badge */}
                {product.isBest && (
                  <div className="best-badge">
                    Best
                  </div>
                )}

                {/* Diagonal line for Sold Out */}
                {isSoldOut && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to top right, transparent 49.5%, rgba(156, 163, 175, 0.8) 49.5%, rgba(156, 163, 175, 0.8) 50.5%, transparent 50.5%)',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }} />
                )}

                {/* Badge for Sold Out / Temporarily Sold Out */}
                {(isSoldOut || isTempSoldOut) && (
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: product.isBest ? 'auto' : '12px',
                    right: product.isBest ? '12px' : 'auto',
                    backgroundColor: isSoldOut ? '#ef4444' : '#eab308',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    zIndex: 3,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
                  }}>
                    {isSoldOut ? '품절' : '일시품절'}
                  </div>
                )}

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
            );
          })
        )}
      </div>
    </div>
  );
};

export default ProductList;
