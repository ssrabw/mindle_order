import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';

declare global {
  interface Window {
    daum: any;
  }
}

const MOCK_CUSTOMER_DB: {
  [key: string]: {
    shopName: string;
    postcode: string;
    address: string;
    detailAddress: string;
  };
} = {
  '01093863222': {
    shopName: '서울 민들레',
    postcode: '06164',
    address: '서울 강남구 테헤란로 521 (삼성동, 파르나스타워)',
    detailAddress: '15층',
  },
  '01012345678': {
    shopName: '부산 상사',
    postcode: '48058',
    address: '부산 해운대구 우동 1475 (우동, 현대아파트)',
    detailAddress: '101동 1004호',
  },
};

const OrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, clearCart, setIsCartOpen } = useCartStore();

  // Form States
  const [shopName, setShopName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [postcode, setPostcode] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [detailAddress, setDetailAddress] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'courier' | 'uncle' | 'shop'>('uncle');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'uncle' | 'shopProxy'>('bank');
  const [shopDeliveryInfo, setShopDeliveryInfo] = useState<string>('');
  const [notificationAgreed, setNotificationAgreed] = useState<boolean>(false);
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  // Submit State
  const [isOrdered, setIsOrdered] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<any>(null);

  // Phone Lookup State
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'searching' | 'member' | 'new'>('idle');

  const handlePhoneLookup = () => {
    const cleaned = phone.replace(/\D/g, '');
    if (!cleaned) {
      alert('전화번호를 먼저 입력해 주세요.');
      return;
    }
    setLookupStatus('searching');

    setTimeout(() => {
      const match = MOCK_CUSTOMER_DB[cleaned];
      if (match) {
        setShopName(match.shopName);
        setPostcode(match.postcode);
        setAddress(match.address);
        setDetailAddress(match.detailAddress);
        setLookupStatus('member');
        alert(`기존 회원 정보를 불러왔습니다: ${match.shopName}`);
      } else {
        setLookupStatus('new');
        alert('조회 결과 일치하는 회원 정보가 없습니다. 신규 정보로 작성해 주세요.');
      }
    }, 500);
  };

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Dynamically load Daum Postcode script
  useEffect(() => {
    const scriptId = 'daum-postcode-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.async = true;
      document.body.appendChild(script);
    }

    return () => {
      const addedScript = document.getElementById(scriptId);
      if (addedScript) {
        document.body.removeChild(addedScript);
      }
    };
  }, []);

  const handleAddressSearch = () => {
    if (window.daum && window.daum.Postcode) {
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          let fullAddress = data.address;
          let extraAddress = '';

          if (data.addressType === 'R') {
            if (data.bname !== '') {
              extraAddress += data.bname;
            }
            if (data.buildingName !== '') {
              extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
            }
            fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
          }

          setPostcode(data.zonecode);
          setAddress(fullAddress);
          document.getElementById('detailAddress')?.focus();
        },
      }).open();
    } else {
      alert('주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  // Group items by product for display
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
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const basePrice = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = deliveryMethod === 'courier' ? 3000 : 0;
  const totalPrice = basePrice + deliveryFee;

  // Handle browser push notification permission request
  const handleNotificationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setNotificationAgreed(checked);

    if (checked) {
      if (!('Notification' in window)) {
        setNotificationStatus('지원안됨');
        alert('이 브라우저는 알림 기능을 지원하지 않습니다.');
        return;
      }

      setNotificationStatus('요청중...');
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          setNotificationStatus('허용됨');
          alert('포장 완료 시 브라우저로 알림이 발송됩니다.');
        } else {
          setNotificationStatus('거부됨');
          alert('알림이 거부되었습니다. 브라우저 설정에서 권한을 변경하실 수 있습니다.');
        }
      } catch (err) {
        console.error(err);
        setNotificationStatus('오류');
      }
    } else {
      setNotificationStatus('');
    }
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!phone.trim()) {
      alert('전화번호를 입력해 주세요.');
      return;
    }

    // Parse phone number: strip non-digits to form the DB Primary Key (e.g. 01093863222)
    const parsedPhone = phone.replace(/\D/g, '');
    if (parsedPhone.length < 9) {
      alert('올바른 전화번호 형식을 입력해 주세요 (최소 9자리 숫자).');
      return;
    }

    if (!shopName.trim()) {
      alert('지역 및 상호명을 입력해 주세요.');
      return;
    }

    if (!postcode.trim() || !address.trim()) {
      alert('배송 주소를 검색해 주세요.');
      return;
    }
    if (!detailAddress.trim()) {
      alert('상세 주소를 입력해 주세요.');
      return;
    }

    if (deliveryMethod === 'shop' && !shopDeliveryInfo.trim()) {
      alert('전달받을 매장명 및 호수를 입력해 주세요.');
      return;
    }

    // Determine payment and delivery names
    let displayPaymentMethod = '';
    if (paymentMethod === 'bank') {
      displayPaymentMethod = '계좌이체';
    } else if (paymentMethod === 'uncle') {
      displayPaymentMethod = '삼촌 대납';
    } else if (paymentMethod === 'shopProxy') {
      displayPaymentMethod = `매장 대납 (${shopDeliveryInfo.trim()})`;
    }

    let displayDeliveryMethod = '';
    if (deliveryMethod === 'courier') {
      displayDeliveryMethod = '택배 (배송비 3,000원 추가)';
    } else if (deliveryMethod === 'uncle') {
      displayDeliveryMethod = '삼촌';
    } else if (deliveryMethod === 'shop') {
      displayDeliveryMethod = `근처 매장에 전달 (${shopDeliveryInfo.trim()})`;
    }

    // Save data for success display
    const orderDetails = {
      shopName: shopName.trim(),
      phoneOriginal: phone.trim(),
      phoneParsedPK: parsedPhone, // Primary Key for DB
      postcode: postcode.trim(),
      address: address.trim(),
      detailAddress: detailAddress.trim(),
      deliveryMethod: displayDeliveryMethod,
      paymentMethod: displayPaymentMethod,
      notificationStatus: notificationAgreed ? (notificationStatus || '동의함') : '미동의',
      basePrice,
      deliveryFee,
      totalPrice,
      items: cart.map(item => ({
        productName: item.product.name,
        variantName: item.variant.colorName,
        quantity: item.quantity,
        price: item.product.price
      }))
    };

    setSubmittedData(orderDetails);
    setIsOrdered(true);

    // Clear global store cart items
    clearCart();
    setIsCartOpen(false);
  };

  // If order complete screen
  if (isOrdered && submittedData) {
    return (
      <div className="order-success-container">
        <div className="success-card">
          <div className="success-icon">✓</div>
          <h2>도매 주문 접수가 완료되었습니다!</h2>
          <p className="success-subtitle">입력하신 주문 정보는 안전하게 DB에 저장되었습니다.</p>

          <div className="summary-section">
            <h3>💾 데이터 전송 요약 (DB 저장 내역)</h3>
            <table className="db-summary-table">
              <tbody>
                <tr>
                  <th>상호명 (지역)</th>
                  <td>{submittedData.shopName}</td>
                </tr>
                <tr>
                  <th>전화번호</th>
                  <td className="highlight-pk">{submittedData.phoneParsedPK}</td>
                </tr>
                <tr>
                  <th>우편번호</th>
                  <td>{submittedData.postcode}</td>
                </tr>
                <tr>
                  <th>배송 주소</th>
                  <td>{submittedData.address} {submittedData.detailAddress}</td>
                </tr>
                <tr>
                  <th>배송 방식</th>
                  <td>{submittedData.deliveryMethod}</td>
                </tr>
                <tr>
                  <th>결제 방식</th>
                  <td>{submittedData.paymentMethod}</td>
                </tr>
                <tr>
                  <th>포장완료 알림</th>
                  <td>{submittedData.notificationStatus}</td>
                </tr>
                <tr>
                  <th>상품 금액</th>
                  <td>{submittedData.basePrice.toLocaleString()}원</td>
                </tr>
                {submittedData.deliveryFee > 0 && (
                  <tr>
                    <th>배송비 (택배)</th>
                    <td>{submittedData.deliveryFee.toLocaleString()}원</td>
                  </tr>
                )}
                <tr>
                  <th>총 주문 금액</th>
                  <td className="highlight-price">{submittedData.totalPrice.toLocaleString()}원</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ordered-items-summary">
            <h3>📦 주문 상품 상세 ({submittedData.items.length}종)</h3>
            <ul>
              {submittedData.items.map((item: any, idx: number) => (
                <li key={idx}>
                  <strong>{item.productName}</strong> - {item.variantName} ({item.quantity}개)
                </li>
              ))}
            </ul>
          </div>

          <button className="home-back-btn" onClick={() => navigate('/')}>
            첫 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // If cart is empty and not ordered
  if (cart.length === 0) {
    return (
      <div className="order-page-empty">
        <h2>담아둔 주문 상품이 없습니다.</h2>
        <p>주문하실 도매 상품을 목록에서 담아두고 주문해 주세요.</p>
        <Link to="/" className="shop-link-btn">상품 보러 가기</Link>
      </div>
    );
  }

  return (
    <div className="order-page-container">
      <h1 className="order-page-title">도매 주문 접수서 작성</h1>

      <div className="order-layout">
        {/* 오른쪽: 주문 상품 요약 */}
        <div className="order-summary-section">
          <h2>주문 상품 내역 (총 {totalItems}개)</h2>
          <div className="summary-items-card">
            {groupedCartList.map(({ product, items }) => (
              <div key={product.id} className="summary-product-group">
                <h4>{product.name}</h4>
                <div className="summary-variant-list">
                  {items.map((item) => (
                    <div key={item.variant.id} className="summary-variant-item">
                      <img src={item.variant.image} alt={item.variant.colorName} />
                      <div className="item-details">
                        <span className="color">{item.variant.colorName}</span>
                        <span className="qty">{item.quantity}개</span>
                      </div>
                      <span className="price">{(product.price * item.quantity).toLocaleString()}원</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {deliveryMethod === 'courier' && (
              <div className="summary-delivery-fee-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', color: 'var(--text)', marginTop: '12px', borderTop: '1px dashed var(--border)', paddingTop: '12px' }}>
                <span>배송비 (택배)</span>
                <span>3,000원</span>
              </div>
            )}
            <div className="summary-total-price-box" style={{ borderTop: deliveryMethod === 'courier' ? 'none' : '2px solid var(--border)', marginTop: deliveryMethod === 'courier' ? '4px' : '8px' }}>
              <span>총 결제금액</span>
              <span className="total-amount">{totalPrice.toLocaleString()}원</span>
            </div>
          </div>
          <button className="edit-order-btn" onClick={() => navigate(-1)}>
            ← 상품 수량 수정하러 가기
          </button>
        </div>

        {/* 왼쪽: 주문 정보 입력 폼 */}
        <div className="order-form-section">
          <form onSubmit={handleOrderSubmit} className="buyer-info-form">

            {/* 1. 전화번호 */}
            <div className="form-group">
              <label htmlFor="phone">1. 전화번호 (주문 ID) <span className="required">*</span></label>
              <div className="phone-input-group">
                <input
                  type="tel"
                  id="phone"
                  placeholder="예) 010-9386-3222 (숫자만 입력하셔도 됩니다)"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (lookupStatus !== 'idle') {
                      setLookupStatus('idle');
                    }
                  }}
                  required
                />
                <button type="button" className="phone-lookup-btn" onClick={handlePhoneLookup} disabled={lookupStatus === 'searching'}>
                  {lookupStatus === 'searching' ? '조회중...' : '조회'}
                </button>
                {lookupStatus === 'member' && <span className="lookup-badge member">회원!</span>}
                {lookupStatus === 'new' && <span className="lookup-badge new-user">신규!</span>}
              </div>
              {!phone.trim() && (
                <p className="field-hint warning">
                  ⚠️ 전화번호가 아이디 입니다.<br />
                  이전에 주문하신 적이 있다면 동일한 번호를 입력해주세요.
                </p>
              )}
            </div>

            {/* 2. 지역 및 상호명 */}
            <div className="form-group">
              <label htmlFor="shopName">2. 지역 및 상호명 <span className="required">*</span></label>
              <input
                type="text"
                id="shopName"
                placeholder="예) 서울 민들레, 부산 상사"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
              />
              <p className="field-hint">배송지역과 도매 상호명을 함께 적어주세요.</p>
            </div>

            {/* 3. 배송 주소 (카카오 우편번호 API 연동) */}
            <div className="form-group">
              <label>3. 배송 주소 <span className="required">*</span></label>
              <div className="address-search-group">
                <input
                  type="text"
                  id="postcode"
                  placeholder="우편번호"
                  value={postcode}
                  readOnly
                  required
                />
                <button type="button" className="address-search-btn" onClick={handleAddressSearch}>
                  🔍 우편번호 찾기
                </button>
              </div>
              <input
                type="text"
                id="address"
                placeholder="기본 주소 (검색 시 자동 입력)"
                value={address}
                readOnly
                required
              />
              <input
                type="text"
                id="detailAddress"
                placeholder="상세 주소를 입력해 주세요 (예: 101동 202호)"
                value={detailAddress}
                onChange={(e) => setDetailAddress(e.target.value)}
                required
              />
            </div>

            {/* 4. 배송 및 결제방식 선택 */}
            <div className="form-group">
              <label>4. 배송 및 결제방식 선택 <span className="required">*</span></label>

              <div className="delivery-selector-title">🚚 배송 방식 선택</div>
              <div className="delivery-selector">

                <label className={`delivery-option ${deliveryMethod === 'uncle' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="uncle"
                    checked={deliveryMethod === 'uncle'}
                    onChange={() => {
                      setDeliveryMethod('uncle');
                      setPaymentMethod('bank');
                    }}
                  />
                  <span className="option-title">👨 삼촌</span>
                  <span className="option-desc">도매 매장 삼촌 대행 배송</span>
                </label>

                <label className={`delivery-option ${deliveryMethod === 'courier' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="courier"
                    checked={deliveryMethod === 'courier'}
                    onChange={() => {
                      setDeliveryMethod('courier');
                      setPaymentMethod('bank'); // 택배는 계좌이체 고정
                    }}
                  />
                  <span className="option-title">📦 택배</span>
                  <span className="option-desc">택배비 3,000원 추가 (계좌이체 전용)</span>
                </label>

                <label className={`delivery-option ${deliveryMethod === 'shop' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="delivery"
                    value="shop"
                    checked={deliveryMethod === 'shop'}
                    onChange={() => {
                      setDeliveryMethod('shop');
                      setPaymentMethod('bank');
                    }}
                  />
                  <span className="option-title">🏬 근처 매장에 전달</span>
                  <span className="option-desc">인근 매장으로 전달 정산</span>
                </label>
              </div>

              {/* 매장 정보 입력 (근처 매장에 전달 선택 시 노출) */}
              {deliveryMethod === 'shop' && (
                <div className="shop-delivery-info-box">
                  <label htmlFor="shopDeliveryInfo">전달받을 매장명 및 호수 <span className="required">*</span></label>
                  <input
                    type="text"
                    id="shopDeliveryInfo"
                    placeholder="예) 민들레 아트지하 106호"
                    value={shopDeliveryInfo}
                    onChange={(e) => setShopDeliveryInfo(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="payment-selector-title">💳 결제 방식 선택</div>
              <div className="payment-selector">
                <label className={`payment-option ${paymentMethod === 'bank' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value="bank"
                    checked={paymentMethod === 'bank'}
                    onChange={() => setPaymentMethod('bank')}
                  />
                  <span className="option-title">🏦 계좌이체</span>
                  <span className="option-desc">계좌로 주문 대금을 송금합니다.</span>
                </label>

                {/* 삼촌 배송 시 삼촌 대납 노출 */}
                {deliveryMethod === 'uncle' && (
                  <label className={`payment-option ${paymentMethod === 'uncle' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value="uncle"
                      checked={paymentMethod === 'uncle'}
                      onChange={() => setPaymentMethod('uncle')}
                    />
                    <span className="option-title">👨 삼촌 대납</span>
                    <span className="option-desc">매장 삼촌(대행인)이 현장에서 정산합니다.</span>
                  </label>
                )}

                {/* 매장 전달 시 해당 매장에서 대납 노출 */}
                {deliveryMethod === 'shop' && (
                  <label className={`payment-option ${paymentMethod === 'shopProxy' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="payment"
                      value="shopProxy"
                      checked={paymentMethod === 'shopProxy'}
                      onChange={() => setPaymentMethod('shopProxy')}
                    />
                    <span className="option-title">🏬 해당 매장에서 대납</span>
                    <span className="option-desc">전달받는 매장에서 대납 정산합니다.</span>
                  </label>
                )}
              </div>

              {/* 계좌이체 선택 시 노출 */}
              {paymentMethod === 'bank' && (
                <div className="bank-account-box">
                  <p className="bank-title">송금 계좌 정보</p>
                  <p className="bank-number">민들레은행 123-45678-90-123</p>
                  <p className="bank-owner">예금주: 민들레도매</p>
                  <p className="bank-notice">* 입금 시 꼭 [상호명] 이름으로 입금해 주세요.</p>
                </div>
              )}
            </div>

            {/* 5. 알림 동의 */}
            <div className="form-group">
              <label>5. 포장완료 알림받기 동의</label>
              <div className="notification-consent-box">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={notificationAgreed}
                    onChange={handleNotificationChange}
                  />
                  <span className="checkbox-text">
                    상품 포장이 완료되면 사용하는 휴대폰/컴퓨터 화면으로 알림창을 띄우는 것에 동의합니다.
                  </span>
                </label>

                {notificationAgreed && (
                  <div className={`notification-badge ${notificationStatus === '허용됨' ? 'success' : 'pending'}`}>
                    알림 설정 상태: <strong>{notificationStatus}</strong>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="submit-order-btn">
              도매 주문 완료하기 <br /> (총 {totalPrice.toLocaleString()}원)
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default OrderPage;
