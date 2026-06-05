import type { Order } from '../types/order';

interface AdminCustomerTransactionDetailProps {
  order: Order;
  onImageZoom: (image: string | null) => void;
}

export default function AdminCustomerTransactionDetail({
  order,
  onImageZoom
}: AdminCustomerTransactionDetailProps) {
  const items = order.order_items || [];
  
  // Calculate items sum
  const itemsSum = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <div className="transaction-receipt-card">
      <div className="receipt-items-list">
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', margin: '12px 0' }}>
            주문 품목이 없습니다.
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="receipt-item-row">
              <div className="receipt-item-left">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.product_name}
                    className="receipt-item-img"
                    onClick={() => onImageZoom(item.image)}
                  />
                ) : (
                  <div className="receipt-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    이미지 없음
                  </div>
                )}
                <div className="receipt-item-details">
                  <span className="receipt-item-name">{item.product_name}</span>
                  <span className="receipt-item-option">{item.variant_name || '기본 옵션'}</span>
                </div>
              </div>
              
              <div className="receipt-item-right">
                <span className="receipt-item-qty">{item.quantity}개</span>
                <span className="receipt-item-price">
                  {(item.price * item.quantity).toLocaleString()}원
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <hr className="receipt-divider" />

      <div className="receipt-summary">
        <div className="receipt-summary-row">
          <span>상품 합계</span>
          <span>{itemsSum.toLocaleString()}원</span>
        </div>
        <div className="receipt-summary-row">
          <span>배송료</span>
          <span>{order.delivery_fee.toLocaleString()}원</span>
        </div>
        
        <hr className="receipt-divider" />

        <div className="receipt-summary-row total">
          <span className="total-label">총 결제금액</span>
          <span>{order.total_price.toLocaleString()}원</span>
        </div>
      </div>
    </div>
  );
}
