import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ProductList from './components/ProductList';
import ProductDetail from './components/ProductDetail';
import OrderPage from './components/OrderPage';
import AdminPage from './components/AdminPage';
import AdminOrdersPage from './components/AdminOrdersPage';
import AdminCustomersPage from './components/AdminCustomersPage';
import MyOrdersPage from './components/MyOrdersPage';
import { useCartStore } from './store/useCartStore';
import { supabase } from './api/supabase';
import './App.css';

interface NavigationHeaderProps {
  onCartClick: () => void;
}

function NavigationHeader({ onCartClick }: NavigationHeaderProps) {
  const cart = useCartStore((state) => state.cart);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  const isAdminOrders = location.pathname === '/admin/orders';
  const isAdminProducts = location.pathname === '/admin/products';
  const isAdminCustomers = location.pathname === '/admin/customers';

  return (
    <header className="main-header">
      <div className="header-container">
        {/* <Link to="/" className="logo-link"> */}
          <span className="logo-gradient">민들레</span>
        {/* </Link> */}
        <nav className="nav-menu">
          {!isAdmin && (
            <>
              <Link to="/" className="nav-link">전체 상품</Link>
              <Link to="/my-orders" className="nav-link">🔍 주문 조회</Link>
              <span className="nav-link disabled">도매 이용안내</span>
            </>
          )}
        </nav>
        {!isAdmin ? (
          <div className="header-actions">
            <button className="cart-text-btn" onClick={onCartClick} aria-label="담아둔 상품 주문하기">
              <span className="cart-btn-desktop">📦 담아둔 상품 주문하기 ({totalItems}개)</span>
              <span className="cart-btn-mobile">📦 장바구니 ({totalItems}개)</span>
            </button>
          </div>
        ) : (
          <div className="header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Link to="/admin/products" className={`exit-admin-btn-separated ${isAdminProducts ? 'active' : ''}`} style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem' }}>
              📂 상품 관리
            </Link>
            <Link to="/admin/orders" className={`exit-admin-btn-separated ${isAdminOrders ? 'active' : ''}`} style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem' }}>
              📋 주문 현황
            </Link>
            <Link to="/admin/customers" className={`exit-admin-btn-separated ${isAdminCustomers ? 'active' : ''}`} style={{ margin: 0, padding: '6px 12px', fontSize: '0.85rem' }}>
              🤝 거래처 관리
            </Link>
          </div>
        )}
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

  // --- 알림 유틸리티 및 리스너 ---
  // 쿠키 획득 유틸
  const getCookie = (name: string): string | null => {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
  };

  // Web Audio API 기반 오디오 챠임벨 재생 유틸
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playChime = (time: number, freq: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.00001, time + 0.4);
        osc.start(time);
        osc.stop(time + 0.4);
      };
      const now = audioCtx.currentTime;
      // C5 (523.25Hz) -> E5 (659.25Hz) 더블 챠임
      playChime(now, 523.25);
      playChime(now + 0.12, 659.25);
    } catch (err) {
      console.error('실시간 알림 사운드 재생 오류:', err);
    }
  };

  // 1. 고객용 실시간 포장완료 및 미송포장완료 알림 리스너
  useEffect(() => {
    let activeChannelOrders: any = null;
    let activeChannelMisong: any = null;
    let currentSubscribedPhone: string | null = null;

    const checkAndSubscribe = () => {
      const customerPhone = localStorage.getItem('customer_phone');
      const notificationAgreed = localStorage.getItem('notification_agreed') === 'true';

      // 동의하지 않았거나 전화번호가 없으면 구독 해제
      if (!customerPhone || !notificationAgreed) {
        if (activeChannelOrders) {
          supabase.removeChannel(activeChannelOrders);
          activeChannelOrders = null;
        }
        if (activeChannelMisong) {
          supabase.removeChannel(activeChannelMisong);
          activeChannelMisong = null;
        }
        currentSubscribedPhone = null;
        return;
      }

      // 이미 동일한 전화번호를 구독 중이라면 중복 연결 방지
      if (currentSubscribedPhone === customerPhone) return;

      if (activeChannelOrders) supabase.removeChannel(activeChannelOrders);
      if (activeChannelMisong) supabase.removeChannel(activeChannelMisong);

      currentSubscribedPhone = customerPhone;

      // 1) 일반 주문 상태 변경 감지
      activeChannelOrders = supabase
        .channel(`customer-orders-${customerPhone}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `customer_phone=eq.${customerPhone}`,
          },
          (payload) => {
            const newStatus = payload.new.status;
            const oldStatus = payload.old.status;

            if (newStatus !== oldStatus && newStatus === '포장 완료') {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('민들레 도매', {
                  body: `주문하신 상품 포장이 완료되었습니다! 매장에서 수령하시거나 배송을 확인해 주세요.`
                });
              }
              // 알림 사운드 재생
              playNotificationSound();
            }
          }
        )
        .subscribe();

      // 2) 미송(이월) 주문 상태 변경 감지
      activeChannelMisong = supabase
        .channel(`customer-misong-${customerPhone}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'misong_orders',
            filter: `customer_phone=eq.${customerPhone}`,
          },
          (payload) => {
            const newStatus = payload.new.status;
            const oldStatus = payload.old.status;

            if (newStatus !== oldStatus && newStatus === '미송포장완료') {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('민들레 도매 (미송 완료)', {
                  body: `미송 주문 상품 포장이 완료되었습니다! 매장에서 수령하시거나 배송을 확인해 주세요.`
                });
              }
              // 알림 사운드 재생
              playNotificationSound();
            }
          }
        )
        .subscribe();
    };

    checkAndSubscribe();
    const interval = setInterval(checkAndSubscribe, 3000);
    window.addEventListener('storage', checkAndSubscribe);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkAndSubscribe);
      if (activeChannelOrders) supabase.removeChannel(activeChannelOrders);
      if (activeChannelMisong) supabase.removeChannel(activeChannelMisong);
    };
  }, []);

  // 2. 관리자용 실시간 새 주문 알림 리스너
  useEffect(() => {
    let activeChannelAdmin: any = null;
    let isSubscribed = false;

    const checkAdminAndSubscribe = () => {
      const isAdmin = getCookie('admin_auth') === 'true';

      if (!isAdmin) {
        if (activeChannelAdmin) {
          supabase.removeChannel(activeChannelAdmin);
          activeChannelAdmin = null;
          isSubscribed = false;
        }
        return;
      }

      if (isSubscribed) return;

      // 브라우저 알림 권한 기본값일 시 요청
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      isSubscribed = true;
      activeChannelAdmin = supabase
        .channel('admin-new-orders')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          },
          async (payload) => {
            const phone = payload.new.customer_phone;
            const price = payload.new.total_price;

            // Supabase customers 조인 조회하여 상호명 파악
            const { data } = await supabase
              .from('customers')
              .select('shop_name')
              .eq('phone', phone)
              .maybeSingle();

            const shopName = data ? data.shop_name : phone;

            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('새 주문 접수 🔔', {
                body: `${shopName}님의 새 도매 주문이 접수되었습니다!\n금액: ${price.toLocaleString()}원`,
              });
            }

            // 웹 오디오 알림 사운드 실행
            playNotificationSound();
          }
        )
        .subscribe();
    };

    checkAdminAndSubscribe();
    const interval = setInterval(checkAdminAndSubscribe, 3000);

    return () => {
      clearInterval(interval);
      if (activeChannelAdmin) {
        supabase.removeChannel(activeChannelAdmin);
      }
    };
  }, []);

  return (
    <div className="app-layout">
      <NavigationHeader onCartClick={() => setIsCartOpen(true)} />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      <main className="main-content">
        <Routes>
          <Route path="/" element={<ProductList />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/admin" element={<Navigate to="/admin/orders" replace />} />
          <Route path="/admin/orders" element={<AdminOrdersPage />} />
          <Route path="/admin/products" element={<AdminPage />} />
          <Route path="/admin/customers" element={<AdminCustomersPage />} />
          <Route path="/my-orders" element={<MyOrdersPage />} />
        </Routes>
      </main>

      <footer className="main-footer">
        <div className="footer-container">
          <p className="footer-brand">민들레 주문 사이트</p>
          <p className="footer-copy">&copy; 2008 MINDLE. All rights reserved.</p>
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
