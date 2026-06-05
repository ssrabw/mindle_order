import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import type { Order } from '../types/order';
import AdminOrderCard from './AdminOrderCard';


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

  // Filter State: 'today' | '3' | '30' | 'all'
  const [filterDays, setFilterDays] = useState<string>('today');
  // Active Tab State: 'order' (일반) | 'misong' (미송)
  const [activeTab, setActiveTab] = useState<'order' | 'misong'>('order');
  // Status Filter State: 'active' (주문 대기) | 'completed' (포장 완료)
  const [statusFilter, setStatusFilter] = useState<'active' | 'completed'>('active');

  // Collapsible Date Filter Toggle
  const [showDateFilter, setShowDateFilter] = useState<boolean>(false);
  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Checked Items State for packing verification (key is item.id)
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lightbox State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);



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
        if (filterDays === 'today') {
          // 오늘 새벽 5시 기준 리셋 필터링
          const now = new Date();
          const kstOffset = 9 * 60 * 60 * 1000;
          const kstTime = new Date(now.getTime() + kstOffset);
          const yyyy = kstTime.getUTCFullYear();
          const month = kstTime.getUTCMonth();
          const date = kstTime.getUTCDate();
          const hour = kstTime.getUTCHours();

          let cutoffKST: Date;
          if (hour < 5) {
            cutoffKST = new Date(Date.UTC(yyyy, month, date - 1, 5, 0, 0));
          } else {
            cutoffKST = new Date(Date.UTC(yyyy, month, date, 5, 0, 0));
          }
          const cutoffUTC = new Date(cutoffKST.getTime() - kstOffset);
          query = query.gte('created_at', cutoffUTC.toISOString());
        } else {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - Number(filterDays));
          cutoffDate.setHours(0, 0, 0, 0);
          query = query.gte('created_at', cutoffDate.toISOString());
        }
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

  // 3. Reset pagination page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterDays, activeTab, searchQuery, statusFilter]);

  // 4. Page change scroll-to-top handler
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentPage]);

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

      // 어드민 로그인 성공 시 웹 푸시 알림 권한 요청 및 동기화 트리거
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(() => {
            window.dispatchEvent(new Event('storage'));
          });
        } else {
          window.dispatchEvent(new Event('storage'));
        }
      }
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
        if (newStatus === '주문 취소') {
          if (!window.confirm("정말 이 주문을 취소하시겠습니까? 취소된 주문은 복구할 수 없습니다.")) {
            // Revert state change
            setOrders(prev => [...prev]);
            return;
          }
        }
        try {
          setIsLoading(true);
          const { error } = await supabase
            .from('orders')
            .update({ status: newStatus })
            .eq('id', orderId);

          if (error) throw error;

          // 만약 기존 상태가 '포장 완료'였고 주문 확인 등으로 롤백하는 경우
          if (order.status === '포장 완료') {
            // order_items 진행상태 미포장으로 초기화, 체크박스 초기화, 완료 시간 초기화
            const { error: itemsError } = await supabase
              .from('order_items')
              .update({
                item_status: '미포장',
                status_updated_at: null,
                is_checked: false
              })
              .eq('order_id', orderId);
            if (itemsError) throw itemsError;

            // 이월되었던 미송 주문서 및 미송 상세 삭제 (Cascade 옵션으로 misong_order_items도 자동 삭제됨)
            const { error: deleteMisongError } = await supabase
              .from('misong_orders')
              .delete()
              .eq('original_order_id', orderId);
            if (deleteMisongError) throw deleteMisongError;
          }

          alert(`주문 상태가 "${newStatus}"(으)로 변경되었습니다.`);
          await fetchOrders();
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

          // 만약 기존 상태가 '미송포장완료'였고 '미송'으로 롤백하는 경우
          if (order.status === '미송포장완료') {
            const items = order.order_items || [];

            // misong_order_items 상태 초기화, 체크박스 초기화, 완료 시간 초기화
            const { error: misongItemsError } = await supabase
              .from('misong_order_items')
              .update({
                status: '미송',
                status_updated_at: null,
                is_checked: false
              })
              .eq('misong_order_id', orderId);
            if (misongItemsError) throw misongItemsError;

            // 원본 주문서의 order_items 상태를 다시 '미송'으로 복구
            const originalItemIds = items
              .map((item: any) => item.original_item_id)
              .filter(Boolean);

            if (originalItemIds.length > 0) {
              const { error: originalItemsError } = await supabase
                .from('order_items')
                .update({
                  item_status: '미송',
                  status_updated_at: null
                })
                .in('id', originalItemIds);
              if (originalItemsError) throw originalItemsError;
            }
          }

          alert(`미송 주문 상태가 "${newStatus}"(으)로 변경되었습니다.`);
          await fetchOrders();
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

  // Get filtered orders based on search query
  const getFilteredOrders = () => {
    const trimmed = searchQuery.trim();
    const cleanedQuery = trimmed.replace(/\D/g, '');
    const lowerQuery = trimmed.toLowerCase();

    return orders.filter(order => {
      // 1. 상태 필터(statusFilter) 적용
      if (statusFilter === 'active') {
        if (activeTab === 'order') {
          if (
            order.status !== '주문 미확인' &&
            order.status !== '주문 확인' &&
            order.status !== '주문' &&
            order.status !== '주문 취소'
          ) {
            return false;
          }
        } else {
          if (order.status !== '미송') {
            return false;
          }
        }
      } else if (statusFilter === 'completed') {
        if (activeTab === 'order') {
          if (order.status !== '포장 완료') {
            return false;
          }
        } else {
          if (order.status !== '미송포장완료') {
            return false;
          }
        }
      }

      // 2. 검색어 필터 적용
      if (!trimmed) return true;

      const phoneMatch = cleanedQuery.length > 0 && (
        order.customer_phone.replace(/\D/g, '').includes(cleanedQuery) ||
        (order.customers?.phone || '').replace(/\D/g, '').includes(cleanedQuery)
      );

      const shopNameMatch = (order.customers?.shop_name || '').toLowerCase().includes(lowerQuery);

      return phoneMatch || shopNameMatch;
    });
  };

  // Group orders by formatted date header
  const getGroupedOrders = (paginatedOrders: Order[]) => {
    const groups: Record<string, Order[]> = {};
    paginatedOrders.forEach(order => {
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

  const filteredOrders = getFilteredOrders();
  const totalPages = Math.ceil(filteredOrders.length / 8);
  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
  const paginatedOrders = filteredOrders.slice((safeCurrentPage - 1) * 8, safeCurrentPage * 8);
  const groupedOrders = getGroupedOrders(paginatedOrders);

  return (
    <div className="admin-dashboard-container">
      {/* Admin Header */}
      <header className="admin-header glassmorphism">
        <div className="admin-header-left">
          <span className="admin-title-badge">ORDERS</span>
          <h1>주문 현황</h1>
        </div>
      </header>

      {/* 주문 / 미송 목록 탭 */}
      <div className="admin-orders-tab-bar" style={{ display: 'flex', gap: '8px', marginBottom: '20px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setActiveTab('order')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: activeTab === 'order' ? '1.5px solid rgba(139, 92, 246, 0.6)' : '1.5px solid transparent',
            backgroundColor: activeTab === 'order' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.04)',
            color: activeTab === 'order' ? '#000000' : '#4b5563',
            fontWeight: '500',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          주문 목록
        </button>
        <button
          onClick={() => setActiveTab('misong')}
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            border: activeTab === 'misong' ? '1.5px solid rgba(139, 92, 246, 0.6)' : '1.5px solid transparent',
            backgroundColor: activeTab === 'misong' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(0, 0, 0, 0.04)',
            color: activeTab === 'misong' ? '#000000' : '#4b5563',
            fontWeight: '500',
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out'
          }}
        >
          미송 목록
        </button>
      </div>

      {/* Date Filter Choices */}
      <div className="orders-filter-bar glassmorphism" style={{
        padding: '16px',
        borderRadius: '14px',
        marginBottom: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center'
      }}>
        {/* Row 1: 상호 및 전화번호 검색 입력창 & 필터 토글 버튼 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          width: '100%',
          maxWidth: '500px',
          boxSizing: 'border-box'
        }}>
          {/* <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>🔍 검색:</span> */}
          <input
            type="text"
            placeholder="상호 또는 전화번호 검색"
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
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid var(--border)',
              backgroundColor: showDateFilter ? 'var(--accent)' : 'transparent',
              color: showDateFilter ? 'white' : 'var(--text-h)',
              fontWeight: '800',
              fontSize: '0.9rem',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {showDateFilter ? '기간 닫기 ⚙️' : '기간 ⚙️'}
          </button>
        </div>

        {/* Row 2: 상태 필터 (주문 / 포장 완료) 상시 노출 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          width: '100%',
          maxWidth: '500px',
          boxSizing: 'border-box',
          marginTop: '4px'
        }}>
          <button
            onClick={() => setStatusFilter('active')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1.5px solid transparent',
              backgroundColor: statusFilter === 'active' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 0, 0, 0.03)',
              borderColor: statusFilter === 'active' ? 'rgba(245, 158, 11, 0.4)' : 'transparent',
              color: statusFilter === 'active' ? '#f59e0b' : 'var(--text-muted)',
              fontWeight: '800',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📋 {activeTab === 'order' ? '포장 미완료' : '미송'}
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: '12px',
              border: '1.5px solid transparent',
              backgroundColor: statusFilter === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.03)',
              borderColor: statusFilter === 'completed' ? 'rgba(16, 185, 129, 0.4)' : 'transparent',
              color: statusFilter === 'completed' ? '#10b981' : 'var(--text-muted)',
              fontWeight: '800',
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ✅ {activeTab === 'order' ? '포장 완료' : '미송 포장완료'}
          </button>
        </div>

        {/* 접혀있는 기간 필터 */}
        {showDateFilter && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center', marginTop: '4px', paddingTop: '12px', borderTop: '1px dashed var(--border)' }}>
            {/* Row 1: 기간 필터 버튼 그룹 (최근 3일, 최근 7일, 최근 30일 - 가운데 정렬) */}
            <div className="filter-buttons" style={{ display: 'flex', gap: '8px', justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
              <button
                className={`filter-tag-btn ${filterDays === 'today' ? 'active' : ''}`}
                onClick={() => setFilterDays('today')}
              >
                오늘
              </button>
              <button
                className={`filter-tag-btn ${filterDays === '3' ? 'active' : ''}`}
                onClick={() => setFilterDays('3')}
              >
                최근 3일
              </button>
              <button
                className={`filter-tag-btn ${filterDays === '30' ? 'active' : ''}`}
                onClick={() => setFilterDays('30')}
              >
                최근 30일
              </button>
            </div>

            {/* Row 2: 전체 보기 버튼 */}
            <button
              className={`filter-tag-btn ${filterDays === 'all' ? 'active' : ''}`}
              onClick={() => setFilterDays('all')}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                textAlign: 'center'
              }}
            >
              전체 보기
            </button>
          </div>
        )}
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
        ) : Object.keys(groupedOrders).length === 0 ? (
          <div className="empty-products-msg glassmorphism" style={{ padding: '80px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>검색 결과가 없습니다.</p>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>검색어를 확인한 후 다시 입력해 주세요.</p>
          </div>
        ) : (
          <div className="grouped-orders-container" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {Object.keys(groupedOrders).map(dateHeader => (
              <div key={dateHeader} className="date-order-group">
                {/* Date Header Tag */}
                <div className="date-group-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--text-h)' }}>{dateHeader}</h2>
                  <span className="order-count-badge" style={{ backgroundColor: 'var(--accent)', color: 'white', fontSize: '0.85rem', fontWeight: '800', padding: '2px 8px', borderRadius: '20px' }}>
                    {groupedOrders[dateHeader].length}건
                  </span>
                </div>

                {/* Orders under this Date */}
                <div className="orders-cards-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {groupedOrders[dateHeader].map(order => (
                    <AdminOrderCard
                      key={order.id}
                      order={order}
                      activeTab={activeTab}
                      checkedItems={checkedItems}
                      onCheckItemChange={(itemId, isChecked) => {
                        setCheckedItems(prev => ({ ...prev, [itemId]: isChecked }));
                      }}
                      onStatusChange={handleStatusChange}
                      onImageZoom={setZoomedImage}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '32px', marginBottom: '16px' }}>
            <button
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                backgroundColor: safeCurrentPage === 1 ? 'transparent' : 'var(--accent)',
                color: safeCurrentPage === 1 ? 'var(--text-muted)' : 'white',
                fontWeight: '800',
                cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === 1 ? 0.5 : 1,
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              이전 페이지
            </button>
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-h)' }}>
              {safeCurrentPage} / {totalPages} 페이지 (총 {filteredOrders.length}건)
            </span>
            <button
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid var(--border)',
                backgroundColor: safeCurrentPage === totalPages ? 'transparent' : 'var(--accent)',
                color: safeCurrentPage === totalPages ? 'var(--text-muted)' : 'white',
                fontWeight: '800',
                cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
                opacity: safeCurrentPage === totalPages ? 0.5 : 1,
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              다음 페이지
            </button>
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
