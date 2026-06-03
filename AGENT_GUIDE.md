# 🌼 민들레 도매 주문 사이트 — 에이전트 지침서

> **작성일**: 2026-06-03  
> **목적**: 이 문서는 이 프로젝트를 처음 접하는 AI 에이전트가 전체 구조와 기능을 빠르게 파악할 수 있도록 작성된 지침서입니다.  
> **개발 서버**: `npm run dev` (포트 5173, `--host` 옵션으로 LAN 접근 가능)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **서비스명** | 민들레 도매 주문 사이트 |
| **주요 사용자** | 도매 거래처 사장님 (고령층 포함) → UI는 **크고 명확하게** 유지 |
| **목적** | 도매 상품을 모바일 웹에서 간편하게 조회·선택·주문하는 B2B 주문 사이트 |
| **주요 플랫폼** | **모바일 웹** 우선 (모바일 최적화 필수) |

---

## 2. 기술 스택

| 항목 | 버전 / 라이브러리 |
|------|------------------|
| 빌드 도구 | Vite `^8.0.12` |
| UI 프레임워크 | React `^19.2.6` + TypeScript `~6.0.2` |
| 라우팅 | React Router DOM `^7.16.0` |
| 전역 상태 관리 | Zustand `^5.0.14` |
| 스타일링 | 순수 CSS (`App.css`, `index.css`) — Tailwind 미사용 |
| 폰트 | Google Fonts — `Outfit`, `Plus Jakarta Sans` |
| 외부 API | 카카오 우편번호 API (Daum Postcode, 동적 스크립트 로드) |
| 백엔드 연동 | ⚠️ 현재 미구현. `src/api/client.ts` 는 스텁(stub) 상태 |

---

## 3. 디렉터리 구조

```
mindle_project/
├── index.html                  # HTML 엔트리포인트 (Google Fonts 로드)
├── package.json
├── vite.config.ts
├── AGENT_GUIDE.md              # ← 이 파일
│
├── public/
│   ├── favicon.svg
│   └── Products/               # 상품 이미지 정적 파일 폴더 (경로: /Products/파일명)
│       ├── 꽃레이스두건_main_01.jpg ~ _05.jpg
│       ├── 꽃레이스두건_00001.jpg ~ _00005.jpg (색상 옵션 이미지)
│       ├── 레인보우벙거지_main_*.jpg / _000*.jpg
│       ├── 텐셀삼각_main_*.jpg / _000*.jpg
│       └── 프릴레이스카라_main_*.jpg / _000*.jpg
│
└── src/
    ├── main.tsx                # React 루트 마운트
    ├── App.tsx                 # 앱 최상위: BrowserRouter, 라우트 정의, 헤더, CartDrawer
    ├── App.css                 # 전체 커스텀 CSS (모든 컴포넌트 스타일 포함)
    ├── index.css               # CSS 리셋 및 전역 변수
    │
    ├── types/
    │   └── product.ts          # Product, ProductVariant 인터페이스 정의
    │
    ├── data/
    │   └── mockProducts.ts     # 상품 목 데이터 (현재 4개 상품)
    │
    ├── store/
    │   └── useCartStore.ts     # Zustand 장바구니 전역 스토어
    │
    ├── api/
    │   └── client.ts           # API 클라이언트 스텁 (TODO: 실제 fetch 구현 필요)
    │
    ├── hooks/
    │   └── useProducts.ts      # 상품 조회 훅 스텁 (TODO: 실제 쿼리 구현 필요)
    │
    ├── context/                # (현재 비어 있음)
    │
    └── components/
        ├── ProductList.tsx     # 메인 상품 목록 페이지 (그리드)
        ├── ProductDetail.tsx   # 상품 상세 페이지 (슬라이드쇼 + 옵션 선택)
        └── OrderPage.tsx       # 주문 정보 입력 페이지 (핵심 페이지)
```

---

## 4. 라우팅 구조

| URL 패턴 | 렌더링 컴포넌트 | 설명 |
|----------|---------------|------|
| `/` | `ProductList` | 전체 상품 목록 (그리드, 모바일 3열) |
| `/product/:id` | `ProductDetail` | 상품 상세 페이지 |
| `/order` | `OrderPage` | 주문 정보 입력 페이지 |

> **라우터 구조**: `App.tsx` 내 `MainLayout` 컴포넌트 안에 `<Routes>` 정의.  
> 모든 페이지는 `NavigationHeader`와 `CartDrawer`를 공유함.

---

## 5. 타입 정의

### `src/types/product.ts`

```typescript
interface ProductVariant {
  id: string;         // 예: "1-opt1"
  colorName: string;  // 예: "옵션 01"
  image: string;      // 예: "/Products/꽃레이스두건_00001.jpg"
}

interface Product {
  id: number;
  name: string;
  price: number;          // 단위: 원 (KRW)
  description: string;
  mainImages: string[];   // 상세페이지 슬라이드쇼용 이미지 (main_01, main_02 등)
  variants: ProductVariant[]; // 색상 옵션별 이미지/정보
  category: string;       // 예: "두건", "모자", "잡화"
}
```

---

## 6. 전역 상태 관리 (Zustand)

### `src/store/useCartStore.ts`

```typescript
interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

interface CartState {
  cart: CartItem[];
  isCartOpen: boolean;             // CartDrawer 열림/닫힘 상태
  setIsCartOpen: (isOpen: boolean) => void;
  addToCart: (product, variant, quantity) => void; // 음수 전달시 수량 감소, 0 이하면 제거
  removeFromCart: (productId, variantId) => void;
  clearCart: () => void;
}
```

> **중요 규칙**:
> - `cart`는 `product` × `variant` 조합으로 구별됨 (같은 상품이라도 옵션이 다르면 별도 항목)
> - `addToCart`에 음수 quantity를 전달하면 수량이 감소하고, 0 이하가 되면 자동 삭제
> - `isCartOpen`은 전역으로 관리 — `OrderPage`에서도 `setIsCartOpen(false)` 호출 가능

---

## 7. 상품 데이터 (`src/data/mockProducts.ts`)

현재 **4개 상품** 하드코딩 (백엔드 연동 시 실제 API로 교체 예정):

| id | 상품명 | 가격 | 카테고리 | 옵션 수 |
|----|--------|------|----------|---------|
| 1 | 꽃레이스두건 | 18,000원 | 두건 | 5 |
| 2 | 레인보우벙거지 | 28,000원 | 모자 | 3 |
| 3 | 텐셀삼각 | 16,000원 | 두건 | 7 |
| 4 | 프릴레이스카라 | 15,000원 | 잡화 | 2 |

이미지 경로 규칙:
- **메인 이미지** (슬라이드쇼): `/Products/{상품명}_main_0N.jpg`
- **옵션 이미지** (색상 선택): `/Products/{상품명}_000N.jpg`

---

## 8. 컴포넌트별 기능 상세

### 8-1. `App.tsx` — 앱 루트

- **`NavigationHeader`**: 상단 고정 헤더. 로고(민들레), 전체 상품 링크, 📦 담아둔 상품 주문하기 버튼(총 개수 표시)
- **`CartDrawer`**: 우측에서 슬라이드 인 되는 장바구니 드로어
  - 상품을 그룹별로 표시 (상품명 → 옵션 목록)
  - 각 옵션별 수량 증감(`+`/`-`) 및 개별 삭제 가능
  - 총 금액 표시
  - `도매 주문 접수하기` 버튼 → `/order` 라우트로 이동 + 드로어 닫힘
  - `전체 비우기` 버튼으로 장바구니 초기화
- **`MainLayout`**: 헤더 + CartDrawer + Routes + 푸터 조합

---

### 8-2. `ProductList.tsx` — 상품 목록

- `mockProducts`에서 데이터 가져와 그리드 렌더링
- CSS 클래스: `.product-grid` (모바일 3열 그리드)
- 각 카드(`.product-card`) 클릭 → `/product/:id` 이동
- 각 카드에 대표 이미지(`mainImages[0]`), 상품명, 가격 표시

---

### 8-3. `ProductDetail.tsx` — 상품 상세

**주요 기능:**

| 기능 | 설명 |
|------|------|
| 이미지 슬라이드쇼 | `mainImages` 배열을 3초 간격 자동 전환 |
| 수동 이동 | ◀/▶ 버튼으로 이전/다음 이미지 이동 |
| 썸네일 | 하단에 작은 썸네일 목록, 클릭 시 해당 이미지로 이동 |
| 자동재생 제어 | `⏸ / ▶` 버튼으로 슬라이드쇼 일시정지·재개 |
| 이미지 확대 (라이트박스) | 메인 이미지 또는 옵션 이미지 클릭 → 전체화면 팝업 모달 |
| 색상 옵션 선택 | 각 variant 행에서 `-`/`+` 버튼으로 수량 조절 → 장바구니에 반영 |
| 뒤로가기 버튼 | `back-btn` 클래스, **스크롤을 따라다니는** `position: sticky` 스타일 |

**상태 변수:**
```typescript
activeIndex: number       // 현재 슬라이드 인덱스
isPlaying: boolean        // 자동재생 여부
zoomedImage: string|null  // 확대 모달에 표시할 이미지 URL (null이면 모달 닫힘)
```

---

### 8-4. `OrderPage.tsx` — 주문 페이지 (핵심)

**진입 조건**: `/order` 라우트, 장바구니에 상품이 있어야 의미 있음  
**마운트 시**: `window.scrollTo(0, 0)` 자동 호출 (최상단 이동)

#### 폼 상태 변수

```typescript
shopName: string          // 지역 및 상호명 (예: 서울 민들레)
phone: string             // 전화번호 입력 (화면에 표시되는 원문)
postcode: string          // 우편번호 (카카오 API 자동 입력)
address: string           // 도로명/지번 주소 (카카오 API 자동 입력)
detailAddress: string     // 상세 주소 (직접 입력)
deliveryMethod:           // 'courier' | 'uncle' | 'shop'
paymentMethod:            // 'bank' | 'uncle' | 'shopProxy'
shopDeliveryInfo: string  // 근처 매장명+호수 (deliveryMethod === 'shop' 일 때만)
notificationAgreed: bool  // 포장완료 알림 동의 여부
notificationStatus: string// 알림 권한 상태 표시 문자열
lookupStatus:             // 'idle' | 'searching' | 'member' | 'new'
isOrdered: boolean        // 주문 완료 후 결과 화면 표시 여부
submittedData: any        // 주문 완료 후 화면에 보여줄 요약 데이터
```

#### 배송 및 결제 방식 비즈니스 로직

```
deliveryMethod === 'courier' (택배)
  └─ paymentMethod: 계좌이체('bank') 고정
  └─ deliveryFee: +3,000원 추가

deliveryMethod === 'uncle' (삼촌)
  └─ paymentMethod: 계좌이체('bank') OR 삼촌대납('uncle') 선택

deliveryMethod === 'shop' (근처 매장에 전달)
  └─ paymentMethod: 계좌이체('bank') OR 해당 매장 대납('shopProxy') 선택
  └─ shopDeliveryInfo 입력 필드 노출 (매장명 및 호수, 예: 민들레 아트지하 106호)
```

#### 전화번호 처리 규칙

- **표시**: `010-9386-3222` 등 자유 형식으로 입력 가능
- **DB 저장용 파싱**: `phone.replace(/\D/g, '')` → `01093863222` (숫자만)
- **DB 기본키(PK)**: 파싱된 전화번호 (`phoneParsedPK`)

#### 고객 조회 기능 (현재 Mock)

```typescript
// MOCK_CUSTOMER_DB 객체 (OrderPage.tsx 상단에 하드코딩)
// 키: 파싱된 전화번호 (숫자만)
// 값: { shopName, postcode, address, detailAddress }

// 실제 연동 시: handlePhoneLookup() 함수 내부의 mock 로직을
// 백엔드 API 호출로 교체해야 함
```

조회 결과 표시:
- **회원** → `회원!` 배지 표시 + 상호명·주소 자동 완성 (수정 가능)
- **신규** → `신규!` 배지 표시

#### 포장완료 알림 (Web Push Notification)

- 체크박스 동의 시 `Notification.requestPermission()` 호출
- 브라우저 권한 상태: `허용됨` / `거부됨` / `지원안됨` / `오류`

#### 주소 검색 (카카오 우편번호 API)

- 외부 스크립트 동적 로드: `https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js`
- `useEffect`에서 마운트 시 로드, 언마운트 시 제거
- `handleAddressSearch()` → `window.daum.Postcode` 팝업 열기
- 선택 완료 시 `postcode`, `address` 자동 입력, `detailAddress` 필드 포커스 이동

#### 유효성 검사 (handleOrderSubmit)

| 검사 항목 | 조건 |
|----------|------|
| 전화번호 | 필수, 숫자 파싱 후 9자리 이상 |
| 상호명 | 필수 |
| 주소 | postcode + address 필수 |
| 택배 선택 시 | 주소 입력 필수 (배송지 필요) |
| 근처 매장 전달 | shopDeliveryInfo 필수 |

#### 주문 완료 화면

`isOrdered === true`이면 성공 화면으로 전환:
- DB 저장 내역 요약 테이블 표시
- 담긴 상품 목록 표시
- `clearCart()` 호출로 장바구니 비움

---

## 9. 스타일링 가이드

### 주요 CSS 파일

| 파일 | 역할 |
|------|------|
| `src/index.css` | CSS 변수 정의, 전역 리셋 |
| `src/App.css` | 모든 컴포넌트 스타일 (약 35KB) |

### 핵심 CSS 변수 (index.css에서 확인)

- 주요 컬러: 오렌지 계열 포인트 (브랜드 컬러)
- 변수명: `--primary`, `--text`, `--bg`, `--border` 등

### 주요 CSS 클래스

```
.main-header          헤더 영역
.cart-drawer          슬라이드 장바구니 드로어
.cart-overlay         드로어 배경 오버레이
.product-grid         상품 목록 그리드 (모바일 3열)
.product-card         개별 상품 카드
.product-detail-container  상세 페이지 컨테이너
.back-btn             뒤로가기 (sticky 포지션, 스크롤 따라다님)
.slideshow-container  이미지 슬라이드쇼 영역
.zoom-overlay         이미지 확대 모달 오버레이
.variant-order-row    옵션(색상) 선택 행
.order-page-container 주문 페이지 전체 컨테이너
.delivery-selector    배송 방식 선택 카드 그룹
.lookup-btn           전화번호 조회 버튼
.badge-member         회원! 배지
.badge-new            신규! 배지
.order-success-container  주문 완료 화면 컨테이너
.db-summary-table     DB 저장 내역 요약 테이블
```

---

## 10. 현재 미구현 / TODO 항목

| 파일 | 상태 | 내용 |
|------|------|------|
| `src/api/client.ts` | ⚠️ 스텁 | 실제 fetch/axios 로직 구현 필요 |
| `src/hooks/useProducts.ts` | ⚠️ 스텁 | TanStack Query 등으로 상품 목록 API 연동 필요 |
| `OrderPage.tsx` > `handlePhoneLookup` | ⚠️ Mock | 실제 백엔드 고객 조회 API 연동 필요 |
| `OrderPage.tsx` > `handleOrderSubmit` | ⚠️ Mock | 실제 DB 저장 API 연동 필요 (현재 로컬 상태만 저장) |
| `src/context/` | 🚧 비어 있음 | 필요 시 Context 추가 |

---

## 11. 개발 시 주의사항 (에이전트 필독)

1. **UI 크기**: 사용자가 고령층 포함이므로 버튼·텍스트·터치 영역을 **크게** 유지할 것
2. **모바일 우선**: 레이아웃 변경 시 모바일(412px 기준) 에서 먼저 확인
3. **CSS 위치**: 스타일은 반드시 `src/App.css`에 추가 (인라인 스타일은 최소화)
4. **상태 관리**: 장바구니 관련 로직은 반드시 `useCartStore`를 통해 처리
5. **이미지 경로**: 상품 이미지는 `/public/Products/` 폴더에 있으며 URL은 `/Products/파일명` 형태
6. **카카오 API**: Daum Postcode 스크립트는 `OrderPage.tsx`의 `useEffect`에서 동적 로드됨 — 중복 로드 방지 로직 있음
7. **전화번호 PK**: DB 저장 시 반드시 `.replace(/\D/g, '')` 파싱 후 저장
8. **라우터 스크롤**: 페이지 이동 시 `window.scrollTo(0, 0)` 필요 (OrderPage에 구현됨, 다른 페이지 추가 시도 적용 고려)
9. **장바구니 오버레이 버튼**: 이전에 장바구니 담기 후 하단에 표시되던 오렌지색 플로팅 UI는 제거됨 — 다시 추가 금지

---

## 12. 빠른 작업 참조

### 상품 추가하기
1. `public/Products/`에 이미지 파일 추가
2. `src/data/mockProducts.ts`에 새 `Product` 객체 추가

### 새 페이지(라우트) 추가하기
1. `src/components/`에 새 `.tsx` 컴포넌트 생성
2. `src/App.tsx` > `MainLayout` > `<Routes>` 안에 `<Route>` 추가
3. 상단으로 스크롤 필요 시 컴포넌트 내 `useEffect(() => { window.scrollTo(0,0); }, [])` 추가

### 스타일 추가하기
- `src/App.css` 파일 하단에 클래스 추가
- CSS 변수는 `src/index.css`에서 정의된 것 활용

### 백엔드 API 연동하기
- `src/api/client.ts`에 axios 또는 fetch 기반 함수 구현
- `OrderPage.tsx` > `handlePhoneLookup()` 내 mock 코드 → API 호출로 교체
- `OrderPage.tsx` > `handleOrderSubmit()` 내 → API 호출로 교체
