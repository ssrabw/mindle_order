import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';

import { supabase } from '../api/supabase';
import type { Product } from '../types/product';

const ProductDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { cart, addToCart } = useCartStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProductDetail() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, product_variants(*)')
          .eq('id', Number(id))
          .eq('is_visible', true)
          .eq('is_deleted', false)
          .single();

        if (error) throw error;

        if (data) {
          const mapped: Product = {
            id: data.id,
            name: data.name,
            price: data.price,
            description: data.description || '',
            category: data.category || '',
            mainImages: data.main_images || [],
            variants: (data.product_variants || [])
              .filter((v: any) => v.is_visible !== false)
              .map((v: any) => ({
                id: v.id,
                colorName: v.color_name,
                image: v.image
              }))
          };
          setProduct(mapped);
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error('Supabase 상세 조회 오류:', err);
        setProduct(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProductDetail();
  }, [id]);

  useEffect(() => {
    if (!product || !isPlaying) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % product.mainImages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isPlaying, product]);

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '1.25rem' }}>
        상품 상세 정보를 불러오는 중입니다...
      </div>
    );
  }

  if (!product) {
    return <div style={{ padding: '20px', textAlign: 'center', fontSize: '1.2rem' }}>상품을 찾을 수 없습니다.</div>;
  }

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    setActiveIndex((prev) => (prev - 1 + product.mainImages.length) % product.mainImages.length);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(false);
    setActiveIndex((prev) => (prev + 1) % product.mainImages.length);
  };

  const handleThumbnailClick = (idx: number) => {
    setIsPlaying(false);
    setActiveIndex(idx);
  };

  const handleImageClick = () => {
    setIsPlaying(false);
    setZoomedImage(product.mainImages[activeIndex]);
  };

  const handleCloseZoom = () => {
    setZoomedImage(null);
    // Optionally resume play when closed
    setIsPlaying(true);
  };

  return (
    <div className="product-detail-container">
      <button
        onClick={() => navigate(-1)}
        className="back-btn"
      >
        ← 뒤로가기
      </button>

      <div className="detail-layout">
        {/* 왼쪽: 상품 이미지 슬라이드쇼 및 썸네일 */}
        <div className="detail-image-section">
          <div className="slideshow-container" onClick={handleImageClick}>
            <img
              src={product.mainImages[activeIndex]}
              alt={`${product.name} 메인 이미지`}
              className="main-preview-img-slide"
            />
            
            {/* 좌우 수동 이동 단추 (큰 터치 타겟) */}
            <button className="slide-arrow-btn left" onClick={handlePrevImage} aria-label="이전 사진 보기">
              ◀
            </button>
            <button className="slide-arrow-btn right" onClick={handleNextImage} aria-label="다음 사진 보기">
              ▶
            </button>

            {/* 이미지 클릭 유도 라벨 */}
            <div className="zoom-hint">🔍 사진을 누르면 크게 확대해서 보실 수 있습니다.</div>
          </div>

          {/* 자동 넘김 재생/일시정지 제어 바 */}
          <div className="slideshow-controls">
            <button 
              className={`play-pause-btn ${isPlaying ? 'playing' : 'paused'}`}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? "⏸ 사진 자동 넘김 멈춤" : "▶ 사진 자동 넘김 시작"}
            </button>
            <div className="slide-indicator">
              {activeIndex + 1} / {product.mainImages.length}
            </div>
          </div>

          {/* 하단 썸네일 목록 */}
          <div className="thumbnails-row">
            {product.mainImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${product.name} 미리보기 ${idx + 1}`}
                className={`thumb-img-item ${idx === activeIndex ? 'active' : ''}`}
                onClick={() => handleThumbnailClick(idx)}
              />
            ))}
          </div>
        </div>

        {/* 오른쪽: 상품 도매 정보 및 옵션별 수량 입력 */}
        <div className="detail-info-section">
          <span className="category-tag">{product.category}</span>
          <h1 className="product-title">{product.name}</h1>
          <p className="product-price-large">{product.price.toLocaleString()}원</p>
          <p className="product-desc">{product.description}</p>

          <div className="order-options-box">
            <h3 className="options-title">색상별 주문 수량 선택</h3>
            <p className="options-subtitle">색상별로 주문 수량을 선택해주세요.</p>
            
            <div className="variants-vertical-list">
              {product.variants.map((variant) => {
                const cartItem = cart.find(
                  (item) => item.product.id === product.id && item.variant.id === variant.id
                );
                const quantity = cartItem ? cartItem.quantity : 0;
                const isSelected = quantity > 0;

                return (
                  <div key={variant.id} className={`variant-order-row ${isSelected ? 'selected' : ''}`}>
                    <img 
                      src={variant.image} 
                      alt={variant.colorName} 
                      className="variant-order-img" 
                      onClick={() => {
                        setIsPlaying(false);
                        setZoomedImage(variant.image);
                      }}
                      style={{ cursor: 'pointer' }}
                      title="눌러서 사진 크게 보기"
                    />
                    <div className="variant-order-info">
                      <span className="variant-color-name">{variant.colorName}</span>
                      <span className="variant-price-sub">{product.price.toLocaleString()}원</span>
                    </div>
                    <div className="variant-order-qty">
                      <button 
                        onClick={() => addToCart(product, variant, -1)}
                        className="qty-adjust-btn minus"
                        disabled={quantity === 0}
                        aria-label="수량 감소"
                      >
                        -
                      </button>
                      <span className="qty-value-display">{quantity}</span>
                      <button 
                        onClick={() => addToCart(product, variant, 1)}
                        className="qty-adjust-btn plus"
                        aria-label="수량 증가"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 사진 확대 보기 모달 (라이트박스) */}
      {zoomedImage && (
        <div className="zoom-overlay" onClick={handleCloseZoom}>
          <div className="zoom-content-box" onClick={(e) => e.stopPropagation()}>
            <button className="zoom-close-text-btn" onClick={handleCloseZoom}>
              ◀ 크게 보기 닫기 (돌아가기)
            </button>
            <img 
              src={zoomedImage} 
              alt={`${product.name} 확대 사진`} 
              className="zoomed-main-img" 
            />
            <p className="zoom-caption">사진 주변의 빈 공간을 누르셔도 화면이 닫힙니다.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
