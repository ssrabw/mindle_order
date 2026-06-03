import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';

interface Customer {
  phone: string;
  shop_name: string;
  postcode: string;
  address: string;
  detail_address: string;
}

interface OrderItem {
  id: number;
  product_id: number | null;
  product_name: string;
  variant_id: string | null;
  variant_name: string;
  image: string;
  quantity: number;
  price: number;
  item_status?: string;
  status?: string;
  original_item_id?: number | null;
  status_updated_at?: string | null;
}

interface Order {
  id: number;
  customer_phone: string;
  delivery_method: string;
  payment_method: string;
  shop_delivery_info: string | null;
  notification_agreed: boolean;
  delivery_fee: number;
  total_price: number;
  status: string; // '주문 완료' | '주문 확인' | '포장 완료'
  created_at: string;
  customers: Customer | null;
  order_items: OrderItem[];
}

// Cookie Helpers
const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax" + (window.location.protocol === 'https:' ? '; Secure' : '');
};

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

const deleteCookie = (name: string) => {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/; SameSite=Lax' + (window.location.protocol === 'https:' ? '; Secure' : '');
};

export default function AdminOrdersPage() {

  // Authentication State
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // Filter State: '3' | '7' | '30' | 'all'
  const [filterDays, setFilterDays] = useState<string>('3');
  // Active Tab State: 'order' (일반) | 'misong' (미송)
  const [activeTab, setActiveTab] = useState<'order' | 'misong'>('order');

  // Checked Items State for packing verification (key is item.id)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Lightbox State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Expanded Orders State for Toggle View
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>({});

  const toggleOrderExpand = (orderId: number) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Expanded Items State for Collapsible Details (folded by default)
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const toggleItemsExpand = (orderId: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // Helper for Collapsed Status Color Mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case '주문 완료':
      case '미송':
        return {
          bg: 'rgba(249, 115, 22, 0.08)',
          border: 'rgba(249, 115, 22, 0.3)',
          color: '#ea580c'
        };
      case '주문 확인':
        return {
          bg: 'rgba(234, 179, 8, 0.08)',
          border: 'rgba(234, 179, 8, 0.3)',
          color: '#ca8a04'
        };
      case '포장 완료':
      case '미송포장완료':
        return {
          bg: 'rgba(59, 130, 246, 0.08)',
          border: 'rgba(59, 130, 246, 0.3)',
          color: '#2563eb'
        };
      default:
        return {
          bg: 'var(--code-bg)',
          border: 'var(--border)',
          color: 'var(--text-h)'
        };
    }
  };

  // Label Helpers
  const getDeliveryLabel = (method: string, info: string | null) => {
    if (method === 'courier') return '택배';
    if (method === 'uncle') return '삼촌 대행';
    if (method === 'shop') return `매장 전달 (${info || ''})`;
    return method;
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'bank') return '계좌이체';
    if (method === 'uncle') return '삼촌 대납';
    if (method === 'shopProxy') return '매장 대납';
    return method;
  };

  // Fetch Orders from Supabase
  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      let query;
      if (activeTab === 'order') {
        query = supabase
          .from('orders')
          .select(`
            *,
            customers (*),
            order_items (*)
          `);
      } else {
        query = supabase
          .from('misong_orders')
          .select(`
            *,
            customers (*),
            order_items:misong_order_items (*)
          `);
      }

      if (filterDays !== 'all') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - Number(filterDays));
        // Reset time to start of that day in local time for comprehensive coverage
        cutoffDate.setHours(0, 0, 0, 0);
        query = query.gte('created_at', cutoffDate.toISOString());
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      const fetchedOrders = (data as any) || [];
      setOrders(fetchedOrders);

      // Populate checkedItems from loaded order items
      const initialChecked: Record<number, boolean> = {};
      fetchedOrders.forEach((order: any) => {
        const items = order.order_items || [];
        items.forEach((item: any) => {
          initialChecked[item.id] = !!item.is_checked;
        });
      });
      setCheckedItems(initialChecked);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      alert(`주문 목록을 불러오는 중 오류 발생: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Session verification on mount
  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const hasCookie = getCookie('admin_auth') === 'true';
        if (!hasCookie) {
          setIsAuthenticated(false);
          setIsVerifyingSession(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log('No active Supabase Auth session. Clearing cookie.');
          deleteCookie('admin_auth');
          setIsAuthenticated(false);
        } else {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Session verify error:', err);
        setIsAuthenticated(false);
      } finally {
        setIsVerifyingSession(false);
      }
    };

    verifyAuth();
  }, []);

  // 2. Fetch orders when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [isAuthenticated, filterDays, activeTab]);

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      // 1. 서버사이드 RPC 함수로 비밀번호 검증 (admin_auth 테이블 직접 조회 차단됨)
      const { data: isValid, error: rpcError } = await supabase
        .rpc('verify_admin_password', { input_password: password });

      if (rpcError) throw rpcError;

      if (!isValid) {
        setAuthError('❌ 비밀번호가 올바르지 않습니다.');
        return;
      }

      // 2. 일치하면 .env에 있는 계정 정보로 Supabase Auth 로그인 수행
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
      const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;

      if (adminEmail && adminPassword) {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: adminEmail,
          password: adminPassword,
        });

        if (authError) {
          console.error('Supabase Auth Error:', authError);
          setAuthError(`❌ 로그인 인증 실패: ${authError.message}`);
          return;
        }
      }

      // 3. 로그인 성공 시 세션 저장 및 인증 완료 처리
      setCookie('admin_auth', 'true', 7);
      setIsAuthenticated(true);
      setAuthError('');
    } catch (err: any) {
      console.error('Auth handler error:', err);
      setAuthError(`❌ 인증 처리 중 오류 발생: ${err.message || JSON.stringify(err)}`);
    }
  };

  // Update Order Status
  const handleStatusChange = async (orderId: number, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (activeTab === 'order') {
      if (newStatus === '포장 완료') {
        const items = order.order_items || [];

        // 포장 대상 항목: item_status가 '미송'이 아닌 항목들
        const activeItems = items.filter(item => item.item_status !== '미송');

        if (activeItems.length === 0) {
          alert("포장할 수 있는 상품이 없습니다. (모든 상품이 이미 미송 이월되었거나 포장 완료되었습니다.)");
          return;
        }

        // 활성 항목들이 전부 포장 완료로 선택/체크되었는지 확인
        const allPacked = activeItems.every(item => {
          return (
            checkedItems[item.id] === true ||
            item.item_status === '포장완료' ||
            item.item_status === '미송포장완료'
          );
        });

        if (allPacked) {
          if (!window.confirm("포장을 완료하시겠어요? 거래처에 자동으로 알림이가요")) {
            // 복구 유도
            setOrders(prev => [...prev]);
            return;
          }

          try {
            setIsLoading(true);
            const { error: orderError } = await supabase
              .from('orders')
              .update({ status: '포장 완료' })
              .eq('id', orderId);
            if (orderError) throw orderError;

            const activeItemIds = activeItems.map(item => item.id);
            const { error: itemsError } = await supabase
              .from('order_items')
              .update({
                item_status: '포장완료',
                status_updated_at: new Date().toISOString()
              })
              .in('id', activeItemIds);
            if (itemsError) throw itemsError;

            alert("주문 상태가 포장 완료로 변경되었습니다.");
            await fetchOrders();
          } catch (err: any) {
            console.error(err);
            alert(`상태 변경 중 오류: ${err.message}`);
          } finally {
            setIsLoading(false);
          }
        } else {
          // 일부 미포장 품목이 존재함
          if (!window.confirm("모든 포장물품이 체크되지 않았어요! 남은 물건을 미송처리해서 저장할까요?")) {
            setOrders(prev => [...prev]);
            return;
          }

          try {
            setIsLoading(true);

            const checkedActiveItems = activeItems.filter(item =>
              checkedItems[item.id] === true ||
              item.item_status === '포장완료' ||
              item.item_status === '미송포장완료'
            );
            const uncheckedActiveItems = activeItems.filter(item =>
              !(checkedItems[item.id] === true ||
                item.item_status === '포장완료' ||
                item.item_status === '미송포장완료')
            );

            const { error: orderError } = await supabase
              .from('orders')
              .update({ status: '포장 완료' })
              .eq('id', orderId);
            if (orderError) throw orderError;

            if (checkedActiveItems.length > 0) {
              const checkedIds = checkedActiveItems.map(item => item.id);
              const { error: checkError } = await supabase
                .from('order_items')
                .update({
                  item_status: '포장완료',
                  status_updated_at: new Date().toISOString()
                })
                .in('id', checkedIds);
              if (checkError) throw checkError;
            }

            if (uncheckedActiveItems.length > 0) {
              const uncheckedIds = uncheckedActiveItems.map(item => item.id);
              const { error: uncheckError } = await supabase
                .from('order_items')
                .update({
                  item_status: '미송',
                  status_updated_at: new Date().toISOString()
                })
                .in('id', uncheckedIds);
              if (uncheckError) throw uncheckError;

              const misongTotalPrice = uncheckedActiveItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

              const { data: misongOrder, error: misongOrderError } = await supabase
                .from('misong_orders')
                .insert({
                  original_order_id: orderId,
                  customer_phone: order.customer_phone,
                  delivery_method: order.delivery_method,
                  payment_method: order.payment_method,
                  shop_delivery_info: order.shop_delivery_info,
                  notification_agreed: order.notification_agreed,
                  delivery_fee: 0,
                  total_price: misongTotalPrice,
                  status: '미송',
                  created_at: new Date().toISOString()
                })
                .select('id')
                .single();

              if (misongOrderError) throw misongOrderError;

              const misongOrderId = misongOrder.id;

              const misongItemsToInsert = uncheckedActiveItems.map(item => ({
                misong_order_id: misongOrderId,
                original_item_id: item.id,
                product_id: item.product_id,
                product_name: item.product_name,
                variant_id: item.variant_id,
                variant_name: item.variant_name,
                image: item.image,
                quantity: item.quantity,
                price: item.price,
                status: '미송',
                status_updated_at: new Date().toISOString()
              }));

              const { error: misongItemsError } = await supabase
                .from('misong_order_items')
                .insert(misongItemsToInsert);

              if (misongItemsError) throw misongItemsError;
            }

            alert("주문이 포장 완료되었으며, 미체크 품목은 미송 주문서로 이월되었습니다.");
            await fetchOrders();
          } catch (err: any) {
            console.error(err);
            alert(`미송 처리 중 오류: ${err.message}`);
          } finally {
            setIsLoading(false);
          }
        }
      } else {
        try {
          setIsLoading(true);
          const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

          if (error) throw error;

          setOrders(prev =>
            prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
          alert(`주문 상태가 "${newStatus}"(으)로 변경되었습니다.`);
        } catch (err: any) {
          alert(`상태 변경 중 오류: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    } else {
      // activeTab === 'misong' 일 때
      if (newStatus === '미송포장완료') {
        const items = order.order_items || [];
        const allPacked = items.every(item => {
          return (
            checkedItems[item.id] === true ||
            item.status === '미송포장완료'
          );
        });

        if (!allPacked) {
          alert("모든 미송 상품이 체크되지 않았습니다. 모든 품목을 체크해야 '미송포장완료' 상태로 변경할 수 있습니다.");
          // select 복원
          setOrders(prev => [...prev]);
          return;
        }

        if (!window.confirm("미송 포장을 완료하시겠어요?")) {
          setOrders(prev => [...prev]);
          return;
        }

        try {
          setIsLoading(true);
          const { error: misongOrderError } = await supabase
            .from('misong_orders')
            .update({ status: '미송포장완료' })
            .eq('id', orderId);
          if (misongOrderError) throw misongOrderError;

          const { error: misongItemsError } = await supabase
            .from('misong_order_items')
            .update({
              status: '미송포장완료',
              status_updated_at: new Date().toISOString()
            })
            .eq('misong_order_id', orderId);
          if (misongItemsError) throw misongItemsError;

          const originalItemIds = items
            .map((item) => item.original_item_id)
            .filter(Boolean);

          if (originalItemIds.length > 0) {
            const { error: originalItemsError } = await supabase
              .from('order_items')
              .update({
                item_status: '미송포장완료',
                status_updated_at: new Date().toISOString()
              })
              .in('id', originalItemIds);
            if (originalItemsError) throw originalItemsError;
          }

          alert("미송 포장 완료 처리가 완료되었습니다.");
          await fetchOrders();
        } catch (err: any) {
          console.error(err);
          alert(`미송 포장 완료 처리 중 오류: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      } else {
        try {
          setIsLoading(true);
          const { error } = await supabase
            .from('misong_orders')
            .update({ status: newStatus })
            .eq('id', orderId);

          if (error) throw error;

          setOrders(prev =>
            prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o))
          );
          alert(`미송 주문 상태가 "${newStatus}"(으)로 변경되었습니다.`);
        } catch (err: any) {
          alert(`상태 변경 중 오류: ${err.message}`);
        } finally {
          setIsLoading(false);
        }
      }
    }
  };

  // Date Formatting Helper: returns "26년 06월 03일"
  const formatDateHeader = (dateString: string): string => {
    const d = new Date(dateString);
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}년 ${mm}월 ${dd}일`;
  };

  // Group orders by formatted date header
  const getGroupedOrders = () => {
    const groups: Record<string, Order[]> = {};
    orders.forEach(order => {
      const header = formatDateHeader(order.created_at);
      if (!groups[header]) {
        groups[header] = [];
      }
      groups[header].push(order);
    });
    return groups;
  };

  if (isVerifyingSession) {
    return (
      <div className="loading-container" style={{ padding: '80px', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ fontWeight: '700' }}>인증 세션을 확인하고 있습니다...</p>
      </div>
    );
  }

  // Login view if unauthenticated
  if (!isAuthenticated) {
    return (
      <div className="admin-auth-container">
        <div className="auth-card glassmorphism">
          <div className="auth-logo">MINDLE</div>
          <h2>관리자 주문 목록 접속</h2>
          <p className="auth-subtitle">민들레 도매 주문 관리</p>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="admin-password">비밀번호 입력</label>
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                autoFocus
                required
              />
            </div>
            {authError && <p className="auth-error-msg">{authError}</p>}
            <button type="submit" className="auth-submit-btn">
              접속하기
            </button>
          </form>
          <div className="auth-footer-link">
            <Link to="/">← 메인 화면으로 돌아가기</Link>
          </div>
        </div>
      </div>
    );
  }

  const groupedOrders = getGroupedOrders();

  return (
    <div className="admin-dashboard-container">
      {/* Top Bar Navigation */}
      <div className="admin-top-bar" style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <Link to="/admin" className="exit-admin-btn-separated">
          ◀ 상품 등록/관리 대시보드로 이동
        </Link>
      </div>

      {/* Admin Header */}
      <header className="admin-header glassmorphism">
        <div className="admin-header-left">
          <span className="admin-title-badge">ORDERS</span>
          <h1>도매 주문 현황 목록</h1>
        </div>
      </header>

      {/* 주문 / 미송 목록 탭 */}
      <div className="admin-orders-tab-bar" style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('order')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'order' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            fontWeight: '800',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          📦 일반 주문 목록
        </button>
        <button
          onClick={() => setActiveTab('misong')}
          style={{
            padding: '12px 24px',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'misong' ? 'var(--accent)' : 'rgba(255, 255, 255, 0.05)',
            color: 'white',
            fontWeight: '800',
            fontSize: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          ⏳ 미송 주문 목록
        </button>
      </div>

      {/* Date Filter Choices */}
      <div className="orders-filter-bar glassmorphism" style={{ padding: '16px', borderRadius: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>기간</span> */}
        <div className="filter-buttons" style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`filter-tag-btn ${filterDays === '3' ? 'active' : ''}`}
            onClick={() => setFilterDays('3')}
          >
            최근 3일
          </button>
          <button
            className={`filter-tag-btn ${filterDays === '7' ? 'active' : ''}`}
            onClick={() => setFilterDays('7')}
          >
            최근 7일
          </button>
          <button
            className={`filter-tag-btn ${filterDays === '30' ? 'active' : ''}`}
            onClick={() => setFilterDays('30')}
          >
            최근 30일
          </button>
          <button
            className={`filter-tag-btn ${filterDays === 'all' ? 'active' : ''}`}
            onClick={() => setFilterDays('all')}
          >
            전체 보기
          </button>
        </div>
      </div>

      {/* Orders List Container */}
      <main className="admin-main-content">
        {isLoading ? (
          <div className="loading-container" style={{ padding: '80px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ fontWeight: '700' }}>주문 정보를 불러오는 중입니다...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-products-msg glassmorphism" style={{ padding: '80px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>해당 기간에 접수된 주문이 없습니다.</p>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>주문이 들어오면 실시간으로 여기에 기록됩니다.</p>
          </div>
        ) : (
          <div className="grouped-orders-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {Object.keys(groupedOrders).map(dateHeader => (
              <div key={dateHeader} className="date-order-group">
                {/* Date Header Tag */}
                <div className="date-group-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <span className="calendar-icon" style={{ fontSize: '1.3rem' }}>📅</span>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--text-h)' }}>{dateHeader}</h2>
                  <span className="order-count-badge" style={{ backgroundColor: 'var(--accent)', color: 'white', fontSize: '0.85rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px' }}>
                    {groupedOrders[dateHeader].length}건
                  </span>
                </div>

                {/* Orders under this Date */}
                <div className="orders-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {groupedOrders[dateHeader].map(order => {
                    const customer = order.customers;
                    return (
                      <div key={order.id} className="order-sheet-card glassmorphism" style={{ border: '1.5px solid var(--border)', borderRadius: '16px', padding: '24px', background: 'rgba(255, 255, 255, 0.02)' }}>

                        {/* Order Header / Client Meta */}
                        <div className="order-sheet-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', paddingBottom: '16px', borderBottom: '1.5px solid var(--border)' }}>
                          <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>주문번호 ID: {order.id}</span>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', margin: '4px 0', color: 'var(--text-h)' }}>
                              {customer ? customer.shop_name : '알 수 없는 상호'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                              📞 {customer ? customer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : order.customer_phone}
                            </p>
                          </div>

                          {/* Status and Action Row */}
                          <div className="order-status-controller" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.9rem', fontWeight: '700' }}>진행 상태:</span>
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1.5px solid var(--border)',
                                  backgroundColor: 'var(--code-bg)',
                                  color: 'var(--text-h)',
                                  fontWeight: '800',
                                  fontSize: '0.9rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {activeTab === 'order' ? (
                                  <>
                                    <option value="주문 완료">주문 완료</option>
                                    <option value="주문 확인">주문 확인</option>
                                    <option value="포장 완료">포장 완료</option>
                                  </>
                                ) : (
                                  <>
                                    <option value="미송">미송</option>
                                    <option value="미송포장완료">미송포장완료</option>
                                  </>
                                )}
                              </select>
                            </div>

                            {/* Color Tag based on status */}
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: '800',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor:
                                order.status === '포장 완료' || order.status === '미송포장완료' ? 'rgba(16, 185, 129, 0.15)' :
                                  order.status === '주문 확인' ? 'rgba(59, 130, 246, 0.15)' :
                                    order.status === '미송' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color:
                                order.status === '포장 완료' || order.status === '미송포장완료' ? '#10b981' :
                                  order.status === '주문 확인' ? '#3b82f6' :
                                    order.status === '미송' ? '#f59e0b' : '#ef4444'
                            }}>
                              {order.status}
                            </span>
                          </div>
                        </div>

                        {/* Summary Bar & Toggle Details Button */}
                        <div className="order-sheet-summary-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 16px', borderRadius: '12px', border: '1.5px solid var(--border)', background: 'rgba(255, 255, 255, 0.01)', flexWrap: 'wrap', gap: '12px' }}>
                          <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-h)' }}>
                            <span style={{ color: 'var(--accent)' }}>[{getDeliveryLabel(order.delivery_method, order.shop_delivery_info)}]</span>{' '}
                            <span style={{ color: 'var(--text-h)' }}>[{getPaymentLabel(order.payment_method)}]</span>{' '}
                            <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>{order.total_price.toLocaleString()}원</span>
                          </div>
                          <button
                            onClick={() => toggleOrderExpand(order.id)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '20px',
                              border: '1.5px solid var(--border)',
                              backgroundColor: expandedOrders[order.id] ? 'var(--accent)' : 'transparent',
                              color: expandedOrders[order.id] ? 'white' : 'var(--text-h)',
                              fontWeight: '800',
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          >
                            {expandedOrders[order.id] ? '▲ 접기' : '▼ 상세보기'}
                          </button>
                        </div>

                        {/* Order Details Grid (Toggle expandable) */}
                        {expandedOrders[order.id] && (
                          <div className="order-sheet-details-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px', marginTop: '16px', paddingBottom: '16px', borderBottom: '1.5px dashed var(--border)', animation: 'fadeIn 0.2s ease-in-out' }}>

                            {/* Shipping and Payment Info */}
                            <div className="info-block">
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '800', color: 'var(--text-h)' }}>🚚 배송 & 결제 정보</h4>
                              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.95rem' }}>
                                <li>
                                  <strong style={{ color: 'var(--text-muted)' }}>배송방식 :</strong>{' '}
                                  {order.delivery_method === 'courier' ? '📦 택배' : order.delivery_method === 'uncle' ? '👨 삼촌 대행' : `🏬 매장 전달 (${order.shop_delivery_info})`}
                                </li>
                                <li>
                                  <strong style={{ color: 'var(--text-muted)' }}>결제방식 :</strong>{' '}
                                  {order.payment_method === 'bank' ? '🏦 계좌이체' : order.payment_method === 'uncle' ? '👨 삼촌 대납' : '🏬 매장 대납'}
                                </li>
                                <li>
                                  <strong style={{ color: 'var(--text-muted)' }}>배송지 주소 :</strong>{' '}
                                  {customer ? `(${customer.postcode}) ${customer.address} ${customer.detail_address}` : '배송지 정보 누락'}
                                </li>
                                <li>
                                  <strong style={{ color: 'var(--text-muted)' }}>알림 수신 동의 :</strong>{' '}
                                  {order.notification_agreed ? '🟢 동의함 (포장 완료 푸시 발송)' : '⚪ 동의 안 함'}
                                </li>
                              </ul>
                            </div>

                            {/* Price Calculation details */}
                            <div className="price-block" style={{ backgroundColor: 'rgba(255,255,255,0.01)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                              <h4 style={{ margin: '0 0 10px 0', fontSize: '1rem', fontWeight: '800', color: 'var(--text-h)' }}>💳 결제금액 요약</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.95rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>상품 합계:</span>
                                  <span>{(order.total_price - order.delivery_fee).toLocaleString()}원</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>배송비 (택배):</span>
                                  <span>{order.delivery_fee.toLocaleString()}원</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '8px', marginTop: '4px', fontWeight: '800' }}>
                                  <span style={{ color: 'var(--text-h)' }}>최종 합계:</span>
                                  <span style={{ color: 'var(--accent)', fontSize: '1.15rem' }}>{order.total_price.toLocaleString()}원</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Order Items Table (Image + Name + Options) - Collapsible */}
                        <div className="order-items-block" style={{ marginTop: '16px' }}>
                          {(() => {
                            const totalQty = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
                            const colors = getStatusColor(order.status);
                            const isExpanded = !!expandedItems[order.id];
                            return (
                              <div
                                onClick={() => toggleItemsExpand(order.id)}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  padding: '12px 16px',
                                  borderRadius: '10px',
                                  border: `1.5px solid ${colors.border}`,
                                  backgroundColor: colors.bg,
                                  color: colors.color,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                              >
                                <span style={{ fontWeight: '800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  📦 주문 상품 상세 (총 {totalQty}개)
                                </span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800' }}>
                                  {isExpanded ? '▲ 접기' : '▼ 내역 보기'}
                                </span>
                              </div>
                            );
                          })()}

                          {expandedItems[order.id] && (
                            <div className="order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', animation: 'fadeIn 0.2s ease-in-out' }}>
                              {order.order_items.map(item => (
                                <div key={item.id} className="order-item-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                                  <img
                                    src={item.image}
                                    alt={item.product_name}
                                    onClick={() => setZoomedImage(item.image)}
                                    style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid var(--border)' }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '700' }}>{item.product_id ? `ID: ${item.product_id}` : '삭제된 상품'}</span>
                                    <h5 style={{ margin: '2px 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-h)' }}>{item.product_name}</h5>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>옵션: <strong>{item.variant_name}</strong></span>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                                      <span style={{ color: 'var(--accent)', fontWeight: '900' }}>{item.quantity}</span>
                                      <span style={{ color: 'var(--text-h)', marginLeft: '2px' }}>개</span>
                                    </div>
                                    {/* 미송 여부 뱃지 추가 */}
                                    {activeTab === 'order' && item.item_status === '미송' && (
                                      <span style={{
                                        fontSize: '0.8rem',
                                        fontWeight: '800',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                        color: '#f59e0b'
                                      }}>미송 이월됨</span>
                                    )}
                                    {/* 포장완료 뱃지 추가 */}
                                    {((activeTab === 'order' && (item.item_status === '포장완료' || item.item_status === '미송포장완료')) ||
                                      (activeTab === 'misong' && item.status === '미송포장완료')) && (
                                        <span style={{
                                          fontSize: '0.8rem',
                                          fontWeight: '800',
                                          padding: '2px 8px',
                                          borderRadius: '12px',
                                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                          color: '#10b981'
                                        }}>포장완료</span>
                                      )}
                                    <input
                                      type="checkbox"
                                      checked={
                                        activeTab === 'order'
                                          ? (checkedItems[item.id] || item.item_status === '포장완료' || item.item_status === '미송포장완료')
                                          : (checkedItems[item.id] || item.status === '미송포장완료')
                                      }
                                      disabled={
                                        activeTab === 'order'
                                          ? (item.item_status === '포장완료' || item.item_status === '미송포장완료' || item.item_status === '미송')
                                          : (item.status === '미송포장완료')
                                      }
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        setCheckedItems(prev => ({
                                          ...prev,
                                          [item.id]: isChecked
                                        }));

                                        // DB에 체크 상태 실시간 기록 (비동기로 백그라운드 업데이트)
                                        const tableName = activeTab === 'order' ? 'order_items' : 'misong_order_items';
                                        supabase
                                          .from(tableName)
                                          .update({ is_checked: isChecked })
                                          .eq('id', item.id)
                                          .then(({ error }) => {
                                            if (error) {
                                              console.error('Failed to update check state:', error);
                                            }
                                          });
                                      }}
                                      style={{
                                        width: '24px',
                                        height: '24px',
                                        cursor: 'pointer'
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox Zoom Popup */}
      {zoomedImage && (
        <div className="zoom-lightbox" onClick={() => setZoomedImage(null)}>
          <div className="lightbox-content">
            <img src={zoomedImage} alt="확대 이미지" />
            <p className="lightbox-caption">화면 아무 곳이나 누르면 닫힙니다.</p>
          </div>
        </div>
      )}
    </div>
  );
}
