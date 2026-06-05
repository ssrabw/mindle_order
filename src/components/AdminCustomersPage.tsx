import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../api/supabase';
import type { Customer, Order } from '../types/order';
import AdminCustomerTransactionDetail from './AdminCustomerTransactionDetail';

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

export default function AdminCustomersPage() {


  // Authentication State
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isVerifyingSession, setIsVerifyingSession] = useState<boolean>(true);

  // Customers & Orders Summary State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});
  const [misongPhones, setMisongPhones] = useState<Set<string>>(new Set());
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Customer & Transaction History State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);
  const [transactionPage, setTransactionPage] = useState<number>(1);
  const [expandedTransactionId, setExpandedTransactionId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedCustomer(null);
  };

  // Zoomed Image Lightbox State
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);



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

  // 2. Fetch customers summary when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomersSummary();
    }
  }, [isAuthenticated]);

  const fetchCustomersSummary = async () => {
    setIsLoadingSummary(true);
    try {
      // Fetch all customers
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .order('shop_name', { ascending: true });

      if (customersError) throw customersError;

      // Fetch orders brief to compute active order counts per phone number
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('customer_phone, status');

      if (ordersError) throw ordersError;

      // Compute active order counts (exclude cancelled orders)
      const counts: Record<string, number> = {};
      ordersData.forEach((order) => {
        if (order.status !== '주문 취소') {
          counts[order.customer_phone] = (counts[order.customer_phone] || 0) + 1;
        }
      });

      // Fetch pending backorders from misong_orders
      const { data: misongData, error: misongError } = await supabase
        .from('misong_orders')
        .select('customer_phone')
        .eq('status', '미송');

      if (misongError) throw misongError;

      const misongs = new Set<string>();
      misongData.forEach((item) => {
        misongs.add(item.customer_phone);
      });

      setCustomers(customersData || []);
      setOrderCounts(counts);
      setMisongPhones(misongs);
    } catch (err: any) {
      console.error('Error fetching customers summary:', err);
      alert(`거래처 요약을 불러오는 중 오류 발생: ${err.message}`);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // 3. Fetch transaction history when a customer is selected
  const selectCustomer = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setTransactions([]);
    setTransactionPage(1);
    setExpandedTransactionId(null);
    setIsLoadingTransactions(true);
    setIsModalOpen(true);

    try {
      // Fetch normal orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, customers(*), order_items(*)')
        .eq('customer_phone', customer.phone);

      if (ordersError) throw ordersError;

      // Fetch misong orders
      const { data: misongData, error: misongError } = await supabase
        .from('misong_orders')
        .select('*, customers(*), order_items:misong_order_items(*)')
        .eq('customer_phone', customer.phone);

      if (misongError) throw misongError;

      // Type castings and formatting
      const normalOrders: Order[] = (ordersData as any) || [];
      const misongOrders: Order[] = (misongData as any) || [];

      // Combine both lists and sort by created_at desc
      const combined = [...normalOrders, ...misongOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactions(combined);
    } catch (err: any) {
      console.error('Error fetching transactions:', err);
      alert(`거래 내역을 불러오는 중 오류 발생: ${err.message}`);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Auth Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const { data: isValid, error: rpcError } = await supabase
        .rpc('verify_admin_password', { input_password: password });

      if (rpcError) throw rpcError;

      if (!isValid) {
        setAuthError('❌ 비밀번호가 올바르지 않습니다.');
        return;
      }

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

      setCookie('admin_auth', 'true', 7);
      setIsAuthenticated(true);
      setAuthError('');
    } catch (err: any) {
      console.error('Auth handler error:', err);
      setAuthError(`❌ 인증 처리 중 오류 발생: ${err.message || JSON.stringify(err)}`);
    }
  };


  // Filter customers based on search query
  const getFilteredCustomers = () => {
    const trimmed = searchQuery.trim();
    const cleanedQuery = trimmed.replace(/\D/g, '');
    const lowerQuery = trimmed.toLowerCase();

    return customers.filter((customer) => {
      if (!trimmed) return true;
      const nameMatch = customer.shop_name.toLowerCase().includes(lowerQuery);
      const phoneMatch = cleanedQuery.length > 0 && customer.phone.replace(/\D/g, '').includes(cleanedQuery);
      return nameMatch || phoneMatch;
    });
  };

  // Map payment method to human-readable strings as requested
  const getPaymentMethodLabel = (method: string) => {
    if (method === 'bank') return '온라인';
    if (method === 'uncle') return '삼촌대납';
    if (method === 'shopProxy') return '매장대납';
    return method;
  };

  // Format transaction Date header
  const formatTransactionDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const yy = String(d.getFullYear()).slice(-2);
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}.${mm}.${dd}`;
    } catch (e) {
      return isoString;
    }
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
          <h2>관리자 거래처 관리 접속</h2>
          <p className="auth-subtitle">민들레 도매 거래처 및 거래내역 조회</p>
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

  const filteredCustomers = getFilteredCustomers();
  const transactionsPerPage = 20;
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);
  const safeTransactionPage = Math.max(1, Math.min(transactionPage, totalPages || 1));
  const paginatedTransactions = transactions.slice(
    (safeTransactionPage - 1) * transactionsPerPage,
    safeTransactionPage * transactionsPerPage
  );

  return (
    <div className="admin-dashboard-container">
      {/* Admin Header */}
      <header className="admin-header glassmorphism">
        <div className="admin-header-left">
          <span className="admin-title-badge">CUSTOMERS</span>
          <h1>거래처 관리</h1>
        </div>
      </header>

      {/* Customers List Container */}
      <div className="customers-page-layout-single" style={{ marginTop: '24px' }}>
        <section className="customers-list-card glassmorphism" style={{ padding: '24px', borderRadius: '16px', border: '1.5px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '16px', color: 'var(--text-h)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>🤝 거래처 목록 ({filteredCustomers.length}곳)</span>
            {isLoadingSummary && <span className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>}
          </h2>

          {/* Search bar */}
          <div className="search-box" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="상호명 또는 전화번호 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 20px',
                borderRadius: '24px',
                border: '1.5px solid var(--border)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-h)',
                fontSize: '0.95rem',
                fontWeight: '700',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* List items - no maxHeight, no overflowY to avoid internal scrolling */}
          <div className="customers-scroll-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredCustomers.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '0.95rem' }}>검색 결과가 없습니다.</p>
            ) : (
              filteredCustomers.map((customer) => {
                const isSelected = selectedCustomer?.phone === customer.phone;
                const totalOrders = orderCounts[customer.phone] || 0;
                const hasMisong = misongPhones.has(customer.phone);

                return (
                  <div
                    key={customer.phone}
                    onClick={() => selectCustomer(customer)}
                    className="customer-list-item"
                    style={{
                      padding: '18px 24px',
                      borderRadius: '16px',
                      border: isSelected ? '2.5px solid var(--accent)' : '2.5px solid var(--border)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.08)' : 'var(--glass-bg)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      position: 'relative',
                      boxShadow: 'var(--shadow)'
                    }}
                  >
                    {/* Header: Shop Name & Misong Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: '800', margin: 0, color: 'var(--text-h)' }}>
                        {customer.shop_name}
                      </h3>
                      {hasMisong && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.3)'
                        }}>미송</span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div style={{ fontSize: '0.88rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontWeight: '700' }}>📞 {customer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                        📍 ({customer.postcode}) {customer.address} {customer.detail_address}
                      </span>
                      <span style={{ color: 'var(--accent)', fontWeight: '800', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        📦 주문 횟수: {totalOrders}회
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Transaction History Popup Modal */}
      {isModalOpen && selectedCustomer && (
        <div className="customer-modal-overlay" onClick={closeModal}>
          <div className="customer-modal-container glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div className="customer-modal-header">
              <div>
                <span className="customer-modal-subtitle">TRANSACTIONS</span>
                <h2 className="customer-modal-title">
                  {selectedCustomer.shop_name} 거래 내역
                </h2>
              </div>
              <button className="customer-modal-close-btn" onClick={closeModal} aria-label="Close modal">
                &times;
              </button>
            </div>

            <div className="customer-modal-body">
              {isLoadingTransactions ? (
                <div style={{ padding: '80px 0', textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 16px auto', width: '36px', height: '36px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <p style={{ fontWeight: '700' }}>거래 내역을 불러오는 중입니다...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <p style={{ fontSize: '1.1rem', fontWeight: '800' }}>기록된 거래 내역이 없습니다.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: '700' }}>
                      📞 연락처: {selectedCustomer.phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '700' }}>
                      총 {transactions.length}건의 거래
                    </span>
                  </div>

                  {/* Transaction List (20 per page) */}
                  <div className="transaction-list-accordion" style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {paginatedTransactions.map((order) => {
                      const isExpanded = expandedTransactionId === order.id;
                      const dateStr = formatTransactionDate(order.created_at);
                      const paymentLabel = getPaymentMethodLabel(order.payment_method);
                      const isMisongOrder = 'original_order_id' in order || order.status === '미송' || order.status === '미송포장완료';

                      return (
                        <div key={order.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* List Item row */}
                          <div
                            onClick={() => {
                              setExpandedTransactionId(isExpanded ? null : order.id);
                            }}
                            className="transaction-item-row"
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '14px 20px',
                              borderRadius: '10px',
                              border: isExpanded ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                              background: isExpanded ? 'rgba(139, 92, 246, 0.03)' : 'rgba(255,255,255,0.01)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              {/* Date & Time */}
                              <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-h)' }}>
                                {dateStr}
                              </span>

                              {/* Payment Method */}
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: '800',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                color: 'var(--accent)',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                              }}>
                                {paymentLabel}
                              </span>

                              {/* Misong Type Badge */}
                              {isMisongOrder && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: '800',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                                  color: '#f59e0b',
                                  border: '1px solid rgba(245, 158, 11, 0.2)'
                                }}>
                                  미송이월분
                                </span>
                              )}
                            </div>

                            {/* Total Price and Toggle arrow */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0, marginLeft: '16px' }}>
                              <span style={{ fontSize: '1.05rem', fontWeight: '900', color: 'var(--text-h)', whiteSpace: 'nowrap' }}>
                                {order.total_price.toLocaleString()}원
                              </span>
                              <span style={{ fontSize: '0.82rem', color: isExpanded ? 'var(--accent)' : 'var(--text-muted)', fontWeight: '800', whiteSpace: 'nowrap' }}>
                                {isExpanded ? '▲ 접기' : '▼ 상세'}
                              </span>
                            </div>
                          </div>

                          {/* Expanded Order details (AdminCustomerTransactionDetail) */}
                          {isExpanded && (
                            <div style={{ padding: '4px', animation: 'fadeIn 0.2s ease-in-out' }}>
                              <AdminCustomerTransactionDetail
                                order={order}
                                onImageZoom={setZoomedImage}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Transaction Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
                      <button
                        disabled={safeTransactionPage === 1}
                        onClick={() => setTransactionPage(prev => Math.max(prev - 1, 1))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: '1px solid var(--border)',
                          backgroundColor: safeTransactionPage === 1 ? 'transparent' : 'var(--accent)',
                          color: safeTransactionPage === 1 ? 'var(--text-muted)' : 'white',
                          fontWeight: '800',
                          cursor: safeTransactionPage === 1 ? 'not-allowed' : 'pointer',
                          opacity: safeTransactionPage === 1 ? 0.5 : 1,
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        이전
                      </button>
                      <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-h)' }}>
                        {safeTransactionPage} / {totalPages} 페이지
                      </span>
                      <button
                        disabled={safeTransactionPage === totalPages}
                        onClick={() => setTransactionPage(prev => Math.min(prev + 1, totalPages))}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '20px',
                          border: '1px solid var(--border)',
                          backgroundColor: safeTransactionPage === totalPages ? 'transparent' : 'var(--accent)',
                          color: safeTransactionPage === totalPages ? 'var(--text-muted)' : 'white',
                          fontWeight: '800',
                          cursor: safeTransactionPage === totalPages ? 'not-allowed' : 'pointer',
                          opacity: safeTransactionPage === totalPages ? 0.5 : 1,
                          fontSize: '0.85rem',
                          transition: 'all 0.2s'
                        }}
                      >
                        다음
                      </button>
                    </div>
                  )}

                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
