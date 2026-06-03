import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import OrderPage from './components/OrderPage';
import { useCartStore } from './store/useCartStore';
import './App.css';

interface NavigationHeaderProps {
  onCartClick: () => void;
}

function NavigationHeader({ onCartClick }: NavigationHeaderProps) {
  const cart = useCartStore((state) => state.cart);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="main-header">
      <div className="header-container">
        <Link to="/" className="logo-link">
          <span className="logo-gradient">민들레</span>
        </Link>
        <nav className="nav-menu">
          <Link to="/" className="nav-link">전체 상품</Link>
          <span className="nav-link disabled">도매 이용안내</span>
        </nav>
        <div className="header-actions">
          <button className="cart-text-btn" onClick={onCartClick} aria-label="담아둔 상품 주문하기">
            📦 담아둔 상품 주문하기 ({totalItems}개)
          </button>
        </div>
      </div>
    </header>
  );
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, clearCart } = useCartStore();
  const totalPrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handleQuantityChange = (item: typeof cart[0], amount: number) => {
    addToCart(item.product, item.variant, amount);
  };

  // Group cart items by product ID
  const groupedCart: { [key: number]: { product: typeof cart[0]['product']; items: typeof cart } } = {};
  cart.forEach((item) => {
    if (!groupedCart[item.product.id]) {
      groupedCart[item.product.id] = {
        product: item.product,
        items: [],
      };
    }
    groupedCart[item.product.id].items.push(item);
  });

  const groupedCartList = Object.values(groupedCart);

  return (
    <>
      <div className={`cart-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />
      <div className={`cart-drawer ${isOpen ? 'open' : ''}`}>
        <div className="drawer-header">
          <h2>담아둔 상품 주문 목록</h2>
          <button className="drawer-close-btn" onClick={onClose}>
            ◀ 화면으로 돌아가기 (닫기)
          </button>
        </div>

        <div className="drawer-content">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <svg className="empty-cart-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
              <p style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: '0 0 16px 0' }}>담아둔 상품이 없습니다.</p>
              <p style={{ fontSize: '1rem', color: 'var(--text)', margin: '0 0 24px 0' }}>원하시는 도매 상품을 선택해 담아주세요.</p>
              <Link to="/" className="shop-now-btn" onClick={onClose} style={{ fontSize: '1.1rem', padding: '14px 28px' }}>
                상품 보러 가기
              </Link>
            </div>
          ) : (
            <div className="cart-products-list">
              {groupedCartList.map(({ product, items }) => (
                <div key={product.id} className="cart-product-group">
                  <div className="cart-product-group-header">
                    <h3>{product.name}</h3>
                    <span className="cart-product-group-price">{product.price.toLocaleString()}원</span>
                  </div>
                  
                  <div className="cart-product-group-items">
                    {items.map((item) => (
                      <div key={item.variant.id} className="cart-item">
                        <img src={item.variant.image} alt={item.variant.colorName} className="cart-item-img" />
                        <div className="cart-item-info">
                          <span className="cart-item-variant-name">{item.variant.colorName}</span>
                          <div className="cart-item-qty">
                            <button onClick={() => handleQuantityChange(item, -1)} style={{ fontSize: '1.3rem', padding: '6px 14px', fontWeight: 'bold' }}>-</button>
                            <span style={{ fontSize: '1.15rem', minWidth: '24px', textAlign: 'center', fontWeight: '700' }}>{item.quantity}</span>
                            <button onClick={() => handleQuantityChange(item, 1)} style={{ fontSize: '1.3rem', padding: '6px 14px', fontWeight: 'bold' }}>+</button>
                          </div>
                        </div>
                        <button 
                          className="item-remove-text-btn" 
                          onClick={() => removeFromCart(item.product.id, item.variant.id)} 
                          aria-label="이 항목 삭제"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="cart-summary">
              <div className="summary-row" style={{ fontSize: '1.2rem' }}>
                <span>총 주문 금액</span>
                <span className="total-price" style={{ fontSize: '1.75rem', fontWeight: '800' }}>
                  {totalPrice.toLocaleString()}원
                </span>
              </div>
            </div>
            <div className="drawer-actions">
              <button className="clear-btn" onClick={clearCart} style={{ fontSize: '1.1rem', padding: '16px' }}>
                전체 비우기
              </button>
              <button 
                className="checkout-btn" 
                onClick={() => {
                  onClose();
                  navigate('/order');
                }} 
                style={{ fontSize: '1.25rem', padding: '16px', fontWeight: '800' }}
              >
                도매 주문 접수하기
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function MainLayout() {
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const setIsCartOpen = useCartStore((state) => state.setIsCartOpen);

  return (
    <div className="app-layout">
      <NavigationHeader onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/order" element={<OrderPage />} />
        </Routes>
      </main>

      <footer className="main-footer">
        <div className="footer-container">
          <p className="footer-brand">민들레 주문 사이트</p>
          <p className="footer-copy">&copy; 2026 MINDLE. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout />
    </BrowserRouter>
  );
}
