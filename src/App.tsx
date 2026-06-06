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
        <Link to={isAdmin ? "/admin" : "/"} className="logo-link">
          <span className="logo-gradient">민들레</span>
        </Link>
        <nav className="nav-menu">
          {!isAdmin && (
            <>
              <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>전체 상품</Link>
              <Link to="/my-orders" className={`nav-link ${location.pathname === '/my-orders' ? 'active' : ''}`}>🔍 주문 조회</Link>
              <span className="nav-link disabled">도매 이용안내</span>
            </>
          )}
        </nav>
        {!isAdmin ? (
          <div className="header-actions">
            <Link to="/my-orders" className="my-orders-btn">
              내 주문 보기
            </Link>
            <button className="cart-text-btn" onClick={onCartClick} aria-label="상품 주문하기">
              <span className="cart-btn-desktop">상품 주문하기 ({totalItems}개)</span>
              <span className="cart-btn-mobile">상품 주문하기 ({totalItems}개)</span>
            </button>
          </div>
        ) : (
          <div className="header-actions" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            <Link to="/admin/products" className={`exit-admin-btn-separated ${isAdminProducts ? 'active' : ''}`} style={{ margin: 0, padding: '5px 8px', fontSize: '0.75rem' }}>
              📂 상품 관리
            </Link>
            <Link to="/admin/orders" className={`exit-admin-btn-separated ${isAdminOrders ? 'active' : ''}`} style={{ margin: 0, padding: '5px 8px', fontSize: '0.75rem' }}>
              📋 주문 현황
            </Link>
            <Link to="/admin/customers" className={`exit-admin-btn-separated ${isAdminCustomers ? 'active' : ''}`} style={{ margin: 0, padding: '5px 8px', fontSize: '0.75rem' }}>
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
  const navigate = useNavigate();
  const location = useLocation();
  const isCartOpen = useCartStore((state) => state.isCartOpen);
  const setIsCartOpen = useCartStore((state) => state.setIsCartOpen);

  // 페이지 이동 시 화면 최상단으로 스크롤 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // --- 알림 및 서비스 워커 유틸리티 ---
  // 서비스 워커 등록
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('서비스 워커가 정상적으로 등록되었습니다:', reg.scope))
        .catch((err) => console.error('서비스 워커 등록 실패:', err));
    }
  }, []);

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

  // --- 웹 푸시(Web Push) 구독 관련 설정 및 동기화 ---
  const VAPID_PUBLIC_KEY = "BMWl463XnrjC3mJWZQGScxJUb0fTG2Qsuv6SeKMCGjEHkjXD0VQYFYW64KNu4c7CAGMzULCMvP5rVRJd1pf7hRQ";

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const syncPushSubscription = async () => {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const existingSubscription = await reg.pushManager.getSubscription();

      const customerPhone = localStorage.getItem('customer_phone');
      const notificationAgreed = localStorage.getItem('notification_agreed') === 'true';
      const isAdmin = getCookie('admin_auth') === 'true';

      // 동의하지 않았거나 어드민도 아니고 고객 전화번호도 없는 경우 -> 기존 구독 해제 및 DB 삭제
      if (!isAdmin && (!customerPhone || !notificationAgreed)) {
        if (existingSubscription) {
          await existingSubscription.unsubscribe();
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', existingSubscription.endpoint);
          console.log('[WebPush] 푸시 알림 동의 해제로 인한 구독 취소 완료');
        }
        return;
      }

      // 알림 권한이 허용되지 않았다면 패스 (권한 승인은 주문 시 또는 어드민 로그인 시 승인)
      if (Notification.permission !== 'granted') {
        return;
      }

      // 구독 정보 획득 또는 신규 생성
      let subscription = existingSubscription;
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      const subJson = subscription.toJSON();
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error('올바르지 않은 구독 토큰 정보입니다.');
      }

      const role = isAdmin ? 'admin' : 'customer';
      const phoneVal = isAdmin ? null : customerPhone;

      // Supabase push_subscriptions 테이블에 토큰 저장
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          endpoint: subJson.endpoint,
          customer_phone: phoneVal,
          role: role,
          keys_p256dh: subJson.keys.p256dh,
          keys_auth: subJson.keys.auth
        });

      if (error) throw error;
      console.log(`[WebPush] 구독 토큰 최신화 완료 (Role: ${role}, Phone: ${phoneVal})`);
    } catch (err) {
      console.error('[WebPush] 구독 동기화 중 에러 발생:', err);
    }
  };

  // 서비스 워커를 지원하는 환경(모바일 크롬 등)에서 알림을 지원하기 위한 공용 래퍼 함수
  const showWebNotification = async (title: string, options: NotificationOptions = {}) => {
    const defaultOptions = {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options
    };

    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // 1단계: 활성화된 서비스 워커가 있는 경우 서비스 워커 알림으로 실행 (모바일 안드로이드 크롬 필수)
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && 'showNotification' in reg) {
          await reg.showNotification(title, defaultOptions);
          return;
        }
      }
    } catch (err) {
      console.warn('서비스 워커를 통한 알림 발송 실패, 일반 알림으로 전환:', err);
    }

    // 2단계: 데스크톱/일반 환경용 standard Notification 생성자로 폴백
    try {
      const notification = new Notification(title, defaultOptions);
      notification.onclick = (e) => {
        e.preventDefault();
        window.focus();
        const url = (defaultOptions as any).data?.url || '/';
        navigate(url);
        notification.close();
      };
    } catch (err) {
      console.error('표준 Notification 생성 실패:', err);
    }
  };

  // 1. 고객용 실시간 포장완료 및 미송포장완료 알림 리스너
  useEffect(() => {
    let activeChannelOrders: any = null;
    let activeChannelMisong: any = null;
    let currentSubscribedPhone: string | null = null;

    const checkAndSubscribe = () => {
      syncPushSubscription(); // 웹 푸시 구독 정보 동기화 추가
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
              showWebNotification('민들레 도매', {
                body: `주문하신 상품 포장이 완료되었습니다! 매장에서 수령하시거나 배송을 확인해 주세요.`,
                data: { url: '/my-orders' }
              });
              // 알림 사운드 재생
              playNotificationSound();
            }
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] 고객 주문 구독 상태 (${customerPhone}):`, status);
        });

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
              showWebNotification('민들레 도매 (미송 완료)', {
                body: `미송 주문 상품 포장이 완료되었습니다! 매장에서 수령하시거나 배송을 확인해 주세요.`,
                data: { url: '/my-orders' }
              });
              // 알림 사운드 재생
              playNotificationSound();
            }
          }
        )
        .subscribe((status) => {
          console.log(`[Realtime] 고객 미송 구독 상태 (${customerPhone}):`, status);
        });
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
      syncPushSubscription(); // 웹 푸시 구독 정보 동기화 추가
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

            showWebNotification('새 주문 접수 🔔', {
              body: `${shopName}님의 새 도매 주문이 접수되었습니다!\n금액: ${price.toLocaleString()}원`,
              data: { url: '/admin/orders' }
            });

            // 웹 오디오 알림 사운드 실행
            playNotificationSound();
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] 어드민 새 주문 구독 상태:', status);
        });
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
