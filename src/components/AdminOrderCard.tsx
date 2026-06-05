import { useState } from 'react';
import { supabase } from '../api/supabase';
import type { Order } from '../types/order';

interface AdminOrderCardProps {
  order: Order;
  activeTab: 'order' | 'misong';
  checkedItems: Record<number, boolean>;
  onCheckItemChange: (itemId: number, isChecked: boolean) => void;
  onStatusChange: (orderId: number, newStatus: string) => void;
  onImageZoom: (image: string | null) => void;
}

export default function AdminOrderCard({
  order,
  activeTab,
  checkedItems,
  onCheckItemChange,
  onStatusChange,
  onImageZoom
}: AdminOrderCardProps) {
  const [isOrderExpanded, setIsOrderExpanded] = useState<boolean>(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState<boolean>(false);

  const customer = order.customers;
  const isCancelled = order.status === '주ment 취소' || order.status === '주문 취소';

  // Helper for Collapsed Status Color Mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case '주문 미확인':
      case '주문 완료':
      case '미송':
        return {
          bg: 'rgba(245, 158, 11, 0.15)',
          border: 'rgba(245, 158, 11, 0.4)',
          color: '#f59e0b'
        };
      case '주문 확인':
        return {
          bg: 'rgba(234, 179, 8, 0.15)',
          border: 'rgba(234, 179, 8, 0.4)',
          color: '#eab308'
        };
      case '포장 완료':
      case '미송포장완료':
        return {
          bg: 'rgba(16, 185, 129, 0.15)',
          border: 'rgba(16, 185, 129, 0.4)',
          color: '#10b981'
        };
      case '주문 취소':
        return {
          bg: 'rgba(156, 163, 175, 0.15)',
          border: 'rgba(156, 163, 175, 0.4)',
          color: '#9ca3af'
        };
      default:
        return {
          bg: 'var(--code-bg)',
          border: 'var(--border)',
          color: 'var(--text-h)'
        };
    }
  };

  // Helper for card background and border colors matching status
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

  const formatPackedTime = (isoString: string | null | undefined) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const yy = String(date.getFullYear()).slice(-2);
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${yy}년 ${mm}월 ${dd}일 ${hh}시 ${min}분`;
    } catch (e) {
      return '';
    }
  };

  const formatOrderTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return isoString;
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    } catch (e) {
      return isoString;
    }
  };

  const handleCheckboxChange = async (itemId: number, isChecked: boolean) => {
    // Optimistically update local parent state
    onCheckItemChange(itemId, isChecked);

    const tableName = activeTab === 'order' ? 'order_items' : 'misong_order_items';
    try {
      const { error } = await supabase
        .from(tableName)
        .update({ is_checked: isChecked })
        .eq('id', itemId);

      if (error) throw error;
    } catch (err: any) {
      console.error('Failed to update check state:', err);
      alert(`체크 상태 저장 실패: ${err.message || JSON.stringify(err)}`);
      // Revert parent state on error
      onCheckItemChange(itemId, !isChecked);
    }
  };

  const cardStyle = getCardStyle(order.status);
  const totalQty = order.order_items.reduce((sum, item) => sum + item.quantity, 0);
  const colors = getStatusColor(order.status);

  return (
    <div className="order-sheet-card glassmorphism" style={{
      border: cardStyle.border,
      borderRadius: '16px',
      padding: '24px',
      background: cardStyle.background,
      opacity: isCancelled ? 0.5 : 1,
      transition: 'opacity 0.2s ease-in-out'
    }}>

      {/* Order Header / Client Meta */}
      <div className="order-sheet-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', paddingBottom: '16px', borderBottom: '1.5px solid var(--border)' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatOrderTime(order.created_at)}</span>
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
            <select
              value={order.status === '주문' ? '주문 미확인' : order.status}
              onChange={(e) => onStatusChange(order.id, e.target.value)}
              style={{
                padding: '6px 16px 6px 8px',
                borderRadius: '8px',
                fontWeight: '800',
                fontSize: '0.9rem',
                cursor: 'pointer',
                outline: 'none',
                width:
                  order.status === '미송' ? '74px' :
                    order.status === '주문' || order.status === '주문 미확인' || order.status === '미송포장완료' ? '138px' : '112px',
                border:
                  order.status === '포장 완료' || order.status === '미송포장완료' ? '1.5px solid rgba(16, 185, 129, 0.4)' :
                    order.status === '주문 확인' ? '1.5px solid rgba(234, 179, 8, 0.4)' :
                      order.status === '주문 취소' ? '1.5px solid rgba(156, 163, 175, 0.4)' :
                        '1.5px solid rgba(245, 158, 11, 0.4)',
                backgroundColor:
                  order.status === '포장 완료' || order.status === '미송포장완료' ? 'rgba(16, 185, 129, 0.15)' :
                    order.status === '주문 확인' ? 'rgba(234, 179, 8, 0.15)' :
                      order.status === '주문 취소' ? 'rgba(156, 163, 175, 0.15)' :
                        'rgba(245, 158, 11, 0.15)',
                color:
                  order.status === '포장 완료' || order.status === '미송포장완료' ? '#10b981' :
                    order.status === '주문 확인' ? '#eab308' :
                      order.status === '주문 취소' ? '#9ca3af' :
                        '#f59e0b',
                transition: 'all 0.2s ease-in-out'
              }}
            >
              {activeTab === 'order' ? (
                <>
                  <option value="주문 미확인" style={{ backgroundColor: '#1e1e1e', color: 'white' }}>주문 미확인</option>
                  <option value="주문 확인" style={{ backgroundColor: '#1e1e1e', color: 'white' }}>주문 확인</option>
                  <option value="포장 완료" style={{ backgroundColor: '#1e1e1e', color: 'white' }}>포장 완료</option>
                  <option value="주문 취소" style={{ backgroundColor: '#1e1e1e', color: 'white' }}>주문 취소</option>
                </>
              ) : (
                <>
                  <option value="미송" style={{ backgroundColor: '#1e1e1e', color: 'white' }}>미송</option>
                  <option value="미송포장완료" style={{ backgroundColor: '#1e1e1e', color: 'white' }}>미송포장완료</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      <div
        className="order-sheet-summary-bar"
        onClick={() => setIsOrderExpanded(!isOrderExpanded)}
        style={{
          marginTop: '16px',
          padding: '16px',
          borderRadius: '12px',
          border: '1.5px solid var(--border)',
          background: 'rgba(255, 255, 255, 0.01)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out'
        }}
      >
        {/* Row 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--accent)', fontWeight: '800', fontSize: '1.05rem' }}>
            [{getDeliveryLabel(order.delivery_method, order.shop_delivery_info)}]
          </span>
          <span style={{ color: 'var(--accent)', fontWeight: '900', fontSize: '1.15rem' }}>
            {order.total_price.toLocaleString()}원
          </span>
        </div>
        {/* Row 2 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-h)', fontWeight: '800', fontSize: '1.05rem' }}>
            [{getPaymentLabel(order.payment_method)}]
          </span>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1.5px solid var(--border)',
              backgroundColor: isOrderExpanded ? 'var(--accent)' : 'transparent',
              color: isOrderExpanded ? 'white' : 'var(--text-h)',
              fontWeight: '800',
              fontSize: '0.85rem',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {isOrderExpanded ? '▲ 접기' : '▼ 상세보기'}
          </span>
        </div>
      </div>

      {/* Order Details Grid (Toggle expandable) */}
      {isOrderExpanded && (
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
        <div
          onClick={() => setIsItemsExpanded(!isItemsExpanded)}
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
            {activeTab === 'order' ? '주문 상품 상세' : '미송 상품 상세'} (총 {totalQty}개)
          </span>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: `1.5px solid ${colors.border}`,
            backgroundColor: isItemsExpanded ? colors.color : 'transparent',
            color: isItemsExpanded ? 'white' : colors.color,
            fontWeight: '800',
            fontSize: '0.85rem',
            transition: 'all 0.2s ease-in-out'
          }}>
            {isItemsExpanded ? '▲ 접기' : '▼ 상세보기'}
          </span>
        </div>

        {isItemsExpanded && (
          <div className="order-items-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px', animation: 'fadeIn 0.2s ease-in-out' }}>
            {order.order_items.map(item => (
              <div key={item.id} className="order-item-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '10px', borderRadius: '10px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                <img
                  src={item.image}
                  alt={item.product_name}
                  onClick={() => onImageZoom(item.image)}
                  style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', cursor: 'zoom-in', border: '1px solid var(--border)' }}
                />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: '700' }}>{item.product_id ? `ID: ${item.product_id}` : '삭제된 상품'}</span>
                  <h5 style={{ margin: '2px 0', fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-h)' }}>{item.product_name}</h5>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>옵션: <strong>{item.variant_name}</strong></span>
                  {((activeTab === 'order' && (item.item_status === '포장완료' || item.item_status === '미송포장완료')) ||
                    (activeTab === 'misong' && item.status === '미송포장완료')) && item.status_updated_at && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '800' }}>
                        ⏱ {activeTab === 'order' && item.item_status === '미송포장완료' || activeTab === 'misong' ? '미송포장완료' : '포장완료'}: {formatPackedTime(item.status_updated_at)}
                      </div>
                    )}
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
                        color: '#10b981',
                        flexShrink: 0
                      }}>
                        {activeTab === 'order'
                          ? (item.item_status === '미송포장완료' ? '미송포장완료' : '포장완료')
                          : '미송포장완료'}
                      </span>
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
                      handleCheckboxChange(item.id, e.target.checked);
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
}
