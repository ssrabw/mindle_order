import React from 'react';
import { Link } from 'react-router-dom';
import { mockProducts } from '../data/mockProducts';

const ProductList: React.FC = () => {
  return (
    <div className="product-list-container">
      <h1 className="product-list-title">도매 주문 상품 목록</h1>
      
      <div className="product-grid">
        {mockProducts.map((product) => (
          <Link 
            to={`/product/${product.id}`} 
            key={product.id} 
            className="product-card"
          >
            <img 
              src={product.mainImages[0]} 
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
        ))}
      </div>
    </div>
  );
};

export default ProductList;
