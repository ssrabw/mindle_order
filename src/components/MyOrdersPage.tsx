import React, { useState } from 'react';
import { supabase } from '../api/supabase';

interface OrderItem {
  id: number;
  product_name: string;
  variant_name: string;
  image: string;
  quantity: number;
  price: number;
  item_status: string;
  status_updated_at: string | null;
}

interface Order {
  id: number;
  customer_phone: string;
  delivery_method: string;
  payment_method: string;
  delivery_fee: number;
  total_price: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

export default function MyOrdersPage() {
  const [phone, setPhone] = useState<string>('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const getStatusLabelAndStyle = (itemStatus: string | undefined) => {
    switch (itemStatus) {
      case '포장완료':
        return { label: '완료', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
      case '미송':
        return { label: '미송', bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' };
      case '미송포장완료':
        return { label: '미송완료', bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981' };
      case '미포장':
      default:
        return { label: '준비중', bg: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)' };
    }
  };

  const getCardStyle = (status: string) => {
    switch (status) {
      case '주문':
      case '주문 미확인':
      case '주문 완료':
      case '미송':
        return {
          background: 'rgba(245, 158, 11, 0.03)',
          border: '1.5px solid rgba(245, 158, 11, 0.2)'
        };
      case '주문 확인':
        return {
          background: 'rgba(234, 179, 8, 0.03)',
          border: '1.5px solid rgba(234, 179, 8, 0.2)'
        };
      case '포장 완료':
      case '미송포장완료':
        return {
          background: 'rgba(16, 185, 129, 0.03)',
          border: '1.5px solid rgba(16, 185, 129, 0.2)'
        };
      case '주문 취소':
        return {
          background: 'rgba(156, 163, 175, 0.03)',
          border: '1.5px solid rgba(156, 163, 175, 0.2)'
        };
      default:
        return {
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1.5px solid var(--border)'
        };
    }
  };

  const getDeliveryLabel = (method: string) => {
    if (method === 'courier') return '택배';
    if (method === 'uncle') return '삼촌 대행';
    if (method === 'shop') return '매장 전달';
    return method;
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'bank') return '계좌이체';
    if (method === 'uncle') return '삼촌 대납';
    if (method === 'shopProxy') return '매장 대납';
    return method;
  };

  const formatDateTime = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${mm}/${dd} ${hh}:${min}`;
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedPhone = phone.replace(/\D/g, '');
    if (parsedPhone.length < 9) {
      alert('올바른 전화번호를 입력해주세요. (숫자 최소 9자리 이상)');
      return;
    }

    setIsLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('customer_phone', parsedPhone)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const fetchedOrders = (data as any) || [];
      setOrders(fetchedOrders);

      // 조회 성공 시 기기 알림 연동을 위해 로컬스토리지 동기화 및 이벤트 디스패치
      if (fetchedOrders.length > 0) {
        const hasAgreed = fetchedOrders.some((o: any) => o.notification_agreed === true);
        localStorage.setItem('customer_phone', parsedPhone);
        localStorage.setItem('notification_agreed', hasAgreed ? 'true' : 'false');
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err: any) {
      console.error(err);
      alert(`주문서 조회 실패: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!window.confirm('정말 이 주문을 취소하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: '주문 취소' })
        .eq('id', orderId);

      if (error) throw error;

      alert('주문이 취소되었습니다.');

      // Refresh orders list
      const parsedPhone = phone.replace(/\D/g, '');
      if (parsedPhone) {
        const { data, error: fetchError } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .eq('customer_phone', parsedPhone)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;
        setOrders((data as any) || []);
      }
    } catch (err: any) {
      console.error(err);
      alert(`주문 취소 실패: ${err.message}`);
    }
  };

  return (
    <div className="my-orders-container" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 16px' }}>
      <header className="page-header" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--text-h)' }}>🔍 주문서 조회</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>주문하실 때 입력하신 사장님 번호로 실시간 포장 상태를 확인해보세요.</p>
      </header>

      {/* 검색 카드 */}
      <div className="search-card glassmorphism" style={{ padding: '24px', borderRadius: '16px', border: '1.5px solid var(--border)', marginBottom: '32px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="휴대폰 번호를 입력하세요"
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1.5px solid var(--border)',
                backgroundColor: 'var(--code-bg)',
                color: 'var(--text-h)',
                fontSize: '1rem',
                fontWeight: '700'
              }}
              required
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0 28px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--accent)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'background 0.2s ease-in-out'
            }}
          >
            조회하기
          </button>
        </form>
      </div>

      {/* 결과 영역 */}
      {isLoading ? (
        <div className="loading-container" style={{ padding: '40px', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px auto', width: '40px', height: '40px', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ fontWeight: '700' }}>주문 정보를 불러오는 중입니다...</p>
        </div>
      ) : searched && orders.length === 0 ? (
        <div className="empty-results glassmorphism" style={{ padding: '60px 20px', borderRadius: '16px', border: '1.5px solid var(--border)', textAlign: 'center' }}>
          <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-h)' }}>접수된 주문서가 없습니다.</p>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>번호를 다시 확인해주시거나, 매장에 문의주시기 바랍니다.</p>
        </div>
      ) : (
        <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {orders.map(order => {
            const cardStyle = getCardStyle(order.status);
            const isCancelled = order.status === '주문 취소';
            return (
              <div key={order.id} className="order-card glassmorphism" style={{
                padding: '24px',
                borderRadius: '16px',
                border: cardStyle.border,
                background: cardStyle.background,
                opacity: isCancelled ? 0.5 : 1,
                transition: 'opacity 0.2s ease-in-out'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>주문번호: {order.id}</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-h)', marginTop: '4px' }}>
                      주문 날짜: {new Date(order.created_at).toLocaleDateString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      backgroundColor:
                        order.status === '포장 완료' ? 'rgba(16, 185, 129, 0.15)' :
                          order.status === '주문 확인' ? 'rgba(234, 179, 8, 0.15)' :
                            isCancelled ? 'rgba(156, 163, 175, 0.15)' :
                              'rgba(245, 158, 11, 0.15)',
                      color:
                        order.status === '포장 완료' ? '#10b981' :
                          order.status === '주문 확인' ? '#eab308' :
                            isCancelled ? '#9ca3af' :
                              '#f59e0b'
                    }}>
                      {order.status === '주문' ? '주문 미확인' : order.status}
                    </span>
                  </div>
                </div>

                {/* 주문 상품 상세 */}
                <div className="order-items" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {order.order_items.map(item => {
                    const statusInfo = getStatusLabelAndStyle(item.item_status);
                    return (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                        <img src={item.image} alt={item.product_name} style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid var(--border)' }} />
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-h)' }}>{item.product_name}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>옵션: {item.variant_name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-h)' }}>{item.quantity}개</div>

                          {/* 상태 및 시간 뱃지 */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            <span style={{
                              fontSize: '0.8rem',
                              fontWeight: '800',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: statusInfo.bg,
                              color: statusInfo.color
                            }}>
                              {statusInfo.label}
                            </span>
                            {item.status_updated_at && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {formatDateTime(item.status_updated_at)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 하단 요약 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed var(--border)', fontSize: '0.95rem', fontWeight: '700' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>배송:</span>
                    <span style={{ color: 'var(--text-h)' }}>{getDeliveryLabel(order.delivery_method)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)', marginRight: '8px' }}>결제:</span>
                      <span style={{ color: 'var(--text-h)' }}>{getPaymentLabel(order.payment_method)}</span>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>
                      총 <span style={{ color: 'var(--accent)' }}>{order.total_price.toLocaleString()}원</span>
                    </div>
                  </div>
                  {!isCancelled && (order.status === '주문' || order.status === '주문 미확인' || order.status === '주문 확인') && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                      <button
                        onClick={() => handleCancelOrder(order.id)}
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: '800',
                          padding: '5px 12px',
                          borderRadius: '6px',
                          border: '1px solid rgba(156, 163, 175, 0.4)',
                          backgroundColor: 'rgba(156, 163, 175, 0.05)',
                          color: '#9ca3af',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.15)';
                          e.currentTarget.style.color = 'var(--text-h)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(156, 163, 175, 0.05)';
                          e.currentTarget.style.color = '#9ca3af';
                        }}
                      >
                        주문 취소
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
