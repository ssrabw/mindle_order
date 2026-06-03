# 🌼 민들레 도매 주문 사이트 — 에이전트 지침서

> **작성일**: 2026-06-03 (최종 갱신: 2026-06-04)  
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
| 백엔드 연동 | Supabase 실시간 연동 완료 (상품/옵션 관리, 고객 관리, 주문 처리) |

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
├── .env                        # 로컬 환경 변수 (Supabase, ImgBB API Key, 어드민 인증 정보)
└── src/
    ├── main.tsx                # React 루트 마운트
    ├── App.tsx                 # 앱 최상위: BrowserRouter, 라우트 정의, 헤더, CartDrawer, AdminPage
    ├── App.css                 # 전체 커스텀 CSS (모든 컴포넌트 스타일 포함)
    ├── index.css               # CSS 리셋 및 전역 변수
    │
    ├── types/
    │   └── product.ts          # Product, ProductVariant 인터페이스 정의
    │
    ├── store/
    │   └── useCartStore.ts     # Zustand 장바구니 전역 스토어
    │
    ├── api/
    │   ├── client.ts           # API 클라이언트 스텁
    │   └── supabase.ts         # Supabase 클라이언트 연동 인스턴스
    │
    ├── hooks/
    │   └── useProducts.ts      # 상품 조회 훅 스텁
    │
    ├── context/                # (현재 비어 있음)
    │
    └── components:
        ├── ProductList.tsx     # 메인 상품 목록 페이지 (Supabase 연동 + Fallback)
        ├── ProductDetail.tsx   # 상품 상세 페이지 (Supabase 연동 + Fallback)
        ├── OrderPage.tsx       # 주문 정보 입력 페이지 (핵심 페이지)
        ├── AdminPage.tsx       # 관리자 로그인 및 상품/거래처 관리
        ├── AdminOrdersPage.tsx # 어드민 주문 목록 조회 및 상태 변경 대시보드
        └── MyOrdersPage.tsx    # 거래처 주문서 상태 조회 페이지
```

---

## 4. 라우팅 구조

| URL 패턴 | 렌더링 컴포넌트 | 설명 |
|----------|---------------|------|
| `/` | `ProductList` | 전체 상품 목록 (그리드, 모바일 3열) |
| `/product/:id` | `ProductDetail` | 상품 상세 페이지 |
| `/order` | `OrderPage` | 주문 정보 입력 페이지 |
| `/admin` | `AdminPage` | 관리자 로그인 및 상품 등록/관리 대시보드 |
| `/admin/orders` | `AdminOrdersPage` | 접수된 주문 목록 대시보드 (상태 변경 및 날짜 필터링) |
| `/my-orders` | `MyOrdersPage` | 주문서 조회 및 품목별 실시간 포장 상태 확인 |

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

## 7. 상품 데이터 및 관리 (Supabase DB 연동)

모든 상품 정보는 Supabase 데이터베이스의 `products` 및 `product_variants` 테이블을 기반으로 작동하며, 로컬 Mock 데이터 없이 실시간 DB 통신으로 화면을 구성합니다.
대표 이미지 및 옵션 이미지 등은 업로드 시 ImgBB API를 통해 클라우드 CDN URL로 반환 및 저장되어 서비스됩니다.

---

## 8. 컴포넌트별 기능 상세

### 8-1. `App.tsx` — 앱 루트

- **`NavigationHeader`**: 상단 고정 헤더. 로고(민들레), 전체 상품 링크, 🔍 주문 조회 링크 (데스크톱 전용), 📦 담아둔 상품 주문하기 버튼(총 개수 표시)
  - **모바일 반응형 최적화**: 모바일 환경(768px 이하)에서는 화면 공간 제한을 해소하기 위해 긴 장바구니 버튼 문구가 `📦 장바구니 (N개)`로 축약됩니다. 모바일 화면의 가독성을 높이기 위해, 헤더 단축 버튼 대신 메인 페이지(`ProductList.tsx`) 상단에 시인성 높은 주문 조회 배너 버튼을 배치했습니다.
  - **장바구니 차단**: `/admin`으로 시작하는 관리자 대시보드 경로(예: `/admin`, `/admin/orders`)에서는 장바구니 트리거 버튼(`.checkout-btn-header`)이 화면에 노출되지 않도록 `useLocation` 경로 기반 필터 처리를 적용했습니다.
- **`CartDrawer`**: 우측에서 슬라이드 인 되는 장바구니 드로어
- **`MainLayout`**: 헤더 + CartDrawer + Routes + 푸터 조합
  - **실시간 포장 완료 푸시 알림**: `MainLayout`에 실시간 Supabase 리스너가 탑재되었습니다. 
  - 구매 고객의 최신 주문 ID(`last_order_id`)가 로컬 스토리지에 있고 알림 수신 동의 상태(`notification_agreed === 'true'`)인 경우, Supabase Realtime을 통해 해당 주문의 `status`가 `"포장 완료"`로 변경되는 것을 감지합니다.
  - 감지 즉시 브라우저 알림("주문하신 상품 포장이 완료되었습니다!")을 발생시키며, 중복 알림 방지를 위해 로컬 스토리지 키 및 realtime 채널 구독을 즉시 제거(Clean up)합니다.

---

### 8-2. `ProductList.tsx` — 상품 목록

- 데이터베이스 에러나 등록 상품이 없을 경우, 빈 상품 목록을 노출하며 "등록된 상품이 없습니다." 문구를 표시합니다.

---

### 8-3. `ProductDetail.tsx` — 상품 상세

- 특정 상품 ID에 해당하는 레코드를 단건 조회하여 메인 슬라이드쇼, 옵션 증감 선택, 확대 라이트박스 기능을 제공합니다.
- DB 에러나 상품 조회 실패 시 "상품을 찾을 수 없습니다." 안내 문구를 렌더링합니다.

---

### 8-4. `OrderPage.tsx` — 주문 페이지 (핵심)

**진입 조건**: `/order` 라우트, 장바구니에 상품이 있어야 의미 있음  
**마운트 시**: `window.scrollTo(0, 0)` 자동 호출 (최상단 이동)

#### 고객 조회 기능 (Supabase 연동)

- **조회 방식**: `phone` 입력 후 [조회] 클릭 시 `supabase.from('customers').select('*').eq('phone', parsedPhone).maybeSingle()` 호출.
- **신규 회원 처리**: Supabase DB에 고객 정보가 없는 경우 신규 고객(`new`)으로 판단하여 사용자 입력을 새로 받습니다.
- **결과 표시**: 
  - 회원 정보 존재 시: `회원!` 배지 표출 및 상호/주소 자동 완성 (필요 시 수정 가능)
  - 정보 부재 시: `신규!` 배지 표출

#### 주문 접수 프로세스 (handleOrderSubmit)

트랜잭션 방식의 데이터베이스 순차 등록이 수행됩니다:
1. **거래처(customers) 정보 업데이트**: 
   - 입력받은 지역/상호명 및 주소 정보를 `supabase.from('customers').upsert(...)`를 호출하여 등록하거나 최신 정보로 갱신합니다. (이때 전화번호에서 숫자만 추출하여 PK로 사용)
2. **주문(orders) 마스터 생성**:
   - `supabase.from('orders').insert(...)`로 신규 주문 레코드를 생성하고, 자동으로 발급된 주문 ID를 반환받습니다.
   - 주문 진행 상태(`status`)는 `'주문 완료'`로 기본 등록되며, 배송비 및 총 주문 금액이 함께 저장됩니다.
3. **주문 상품 상세(order_items) 등록**:
   - 장바구니의 모든 상품 품목들을 순회하며 위에서 반환받은 주문 ID를 FK(`order_id`)로 참조하는 `order_items` 행들을 생성하고, `supabase.from('order_items').insert(...)`를 통해 일괄 저장합니다. 만약 실패할 경우 이전에 입력된 orders 마스터 행을 롤백(삭제)합니다.
4. **로컬 스토리지 저장**:
   - 주문 완료 시 생성된 주문 ID를 `last_order_id`로, 알림 동의 여부를 `notification_agreed`로 로컬 스토리지에 저장하여 `App.tsx`의 실시간 감지기가 동작할 수 있도록 지원합니다.

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

### 8-5. `AdminPage.tsx` — 관리자 대시보드 (상품 및 거래처 관리)

**진입 조건**: `/admin` 라우트  
**인증 구조** (이중 검증 — 쿠키 + Supabase Auth):
1. **마운트 시 세션 검증**: 브라우저 쿠키에 `admin_auth = 'true'`가 있는지 확인하고, 존재하면 `supabase.auth.getSession()`으로 Supabase Auth 세션 유효성을 이중 검증합니다. 세션이 만료되었으면 쿠키를 삭제하고 로그인 화면을 노출합니다.
2. **비밀번호 검증**: DB의 `admin_auth` 테이블을 직접 조회하지 않고, `verify_admin_password` RPC 함수를 호출하여 서버사이드에서 비밀번호를 안전하게 검증합니다.
3. **Supabase Auth 로그인**: 비밀번호가 일치하면, `.env`에 정의된 `VITE_ADMIN_EMAIL`과 `VITE_ADMIN_PASSWORD` 계정 정보로 `supabase.auth.signInWithPassword()`를 호출하여 Supabase Auth의 JWT 인증 토큰 세션을 획득합니다.
4. **쿠키 기반 세션 유지**: 로그인 성공 시 `setCookie('admin_auth', 'true', 7)` — 7일 유효 쿠키를 설정하여 대시보드 접근을 유지합니다. (`SameSite=Lax`, HTTPS 환경에서 `Secure` 속성 자동 부여)
- 이 세션을 통하여 Supabase DB의 어드민 전용 쓰기/수정/삭제 RLS 정책(`auth.role() = 'authenticated'`)을 안전하게 통과할 수 있게 구성되었습니다.

> ⚠️ **주의**: 이전 버전에서는 `sessionStorage`를 사용했으나, 현재는 **쿠키 기반** 인증으로 변경되었습니다. 모바일 환경에서 탭 닫힘 후에도 세션이 유지되어야 하기 때문입니다.

**주요 기능**:
1. **인증 토큰 공유 및 헤더**:
   - 로그인 성공 시 쿠키(`admin_auth = 'true'`, 7일 유효)를 설정하여 `AdminPage`와 `AdminOrdersPage` 간 자격 증명을 공유합니다. 두 페이지 모두 동일한 쿠키 헬퍼 함수(`setCookie`, `getCookie`, `deleteCookie`)를 각각 내장하고 있습니다.
   - 네비게이션 헤더의 탈출 버튼을 `/admin/orders`로 리다이렉트하여 `📋 주문 목록 관리 보기` 기능을 직접 연결했습니다.
2. **모바일 최적화 탑 바 및 레이아웃**:
   - `◀ 사용자 쇼핑몰 화면으로 돌아가기` 버튼을 헤더 내부에서 독립된 `.admin-top-bar` 영역으로 분리하여 모바일 좁은 너비에서 레이아웃이 겹치거나 깨지는 문제를 방지했습니다.
3. **가로 슬라이드 탭 레이아웃**:
   - 탭 바(`.admin-tabs`)에 모바일 대응용 가로 슬라이드 스크롤(`overflow-x: auto`)을 적용했습니다. 탭이 줄어들지 않도록 `flex-shrink: 0` 속성을 부여했습니다.
   - `📂 상품 관리`: 로그인 시 기본 활성화되는 탭. DB에서 실시간 정보를 로드하여 제어합니다.
   - `📦 상품 등록`: 신규 상품 및 옵션을 일괄 등록하는 폼.
   - `🤝 거래처 관리`: 대기 상태 (플레이스홀더 구성, 거래처 관리 페이지 확장 설계 반영).
4. **등록된 상품 관리 기능**:
   - **상품 노출 제어**: 스위치 토글 클릭 시 즉시 DB `products` 테이블의 `is_visible` 컬럼을 커밋하여 쇼핑몰 노출 여부를 실시간으로 설정합니다.
   - **상품 삭제**: 클릭 시 연쇄적으로 `product_variants`까지 Cascade 삭제됩니다.
   - **색상 옵션 관리**: 각 상품 카드 하단에서 해당 상품의 옵션 목록을 실시간 열람합니다.
     - **색상 노출 제어**: `product_variants` 테이블의 `is_visible` 컬럼 값을 개별 토글로 켜고 끕니다.
     - **색상 삭제**: 개별 옵션에 대한 삭제를 즉각 수행합니다.
     - **인라인 새 색상 추가**: 파일 선택 시 ImgBB API를 통해 즉시 업로드한 후, 색상명을 입력해 DB에 옵션 데이터를 직접 등록(`insert`)할 수 있습니다.
5. **신규 상품 등록 폼**:
   - 상품 기본 정보 입력 (상품명, 가격, 카테고리, 설명).
   - 카테고리 직접 입력 기능 포함. 기본 카테고리 순서: `스카프` (기본값) → `두건` → `모자` → `잡화` → `직접 입력`.
   - **대표 이미지 다중 등록 (ImgBB 업로드 및 파일명 변환)**:
      - 파일 탐색기(`input type="file" multiple`) 제공.
      - 업로드 시 상품별로 자동 생성된 **5자리 고유 ID**를 파일 이름으로 지정하여 전송합니다. (파일명 형식: `prod_{ID}_main_{paddedIndex}`)
      - ImgBB API를 순차 호출하며 `업로드 중... (1/3)` 등의 로딩 상태 피드백 제공.
      - 업로드 성공 시 반환받은 CDN URL 리스트로 미리보기 이미지 타일 목록 렌더링. 개별 이미지 삭제 가능.
   - **색상 옵션(Variants) 일괄 등록 및 파일명 변환**:
      - `[📤 옵션 이미지 일괄 업로드]` 파일 탐색기를 통해 옵션 이미지 파일들을 다중 선택해 한 번에 업로드합니다.
      - 업로드 시 파일명을 `prod_{ID}_option_{paddedIndex}` 형식으로 변환하여 업로드합니다.
      - 업로드가 완료되면 업로드된 이미지 개수만큼 하단에 색상명 입력행(`옵션 001`, `옵션 002` 등 초기값 자동 배정)이 이미지 썸네일과 함께 동적으로 생성됩니다.
      - 이미지 옆에서 옵션(색상)명을 개별적으로 즉시 편집할 수 있으며, 불필요한 옵션 행은 우측의 [삭제] 버튼으로 제거 가능합니다.
6. **Supabase DB 저장 및 에러 핸들링**:
   - `products` 테이블에 신규 상품 삽입 시, 자동 생성된 5자리 고유 ID(`productId`)를 직접 `id` 칼럼에 할당하여 저장합니다.
   - 이후 `product_variants` 테이블에 해당 `id`를 `product_id` FK로 묶어 멀티플 로우 삽입합니다.
   - 데이터베이스 스키마에 `products` 테이블이 누락된 경우(`schema cache` 관련 오류 발생 시), 사용자에게 프로젝트 루트의 `schema.sql` 스크립트를 Supabase SQL Editor에 적용하라는 안내 팝업을 발생시켜 자가 해결을 지원합니다.
   - 성공 시 폼 초기화 및 알림.

---

### 8-6. `AdminOrdersPage.tsx` — 주문 목록 및 미송 관리 대시보드

**진입 조건**: `/admin/orders` 라우트  
**인증 구조** (AdminPage와 동일한 이중 검증):
- 마운트 시 브라우저 쿠키(`admin_auth`)와 `supabase.auth.getSession()`을 이중 검증합니다.
- 쿠키가 없거나 Supabase Auth 세션이 만료되었으면 로그인 화면을 내장하여 보여줍니다.
- 로그인 로직은 `AdminPage.tsx`와 동일합니다 (DB 비밀번호 검증 → Supabase Auth 로그인 → 쿠키 설정).

**주요 기능**:
1. **일반 주문 / 미송 주문 탭 분리**:
   - 도매 주문 현황 목록 바로 아래에 `[📦 일반 주문 목록]` 및 `[⏳ 미송 주문 목록]` 탭바가 존재합니다.
   - 탭 선택에 따라 각각 Supabase의 `orders` 및 `misong_orders` 테이블에서 목록을 페칭합니다.
2. **기간 필터링 Choice**:
   - 상단 필터 바를 통해 "최근 3일"(기본값), "최근 7일", "최근 30일", "전체 보기" 중 원하는 조회 범위를 선택해 실시간으로 Supabase에서 필터링 조회가 가능합니다.
3. **날짜 포맷팅 및 그룹화**:
   - 주문 생성 날짜를 `26년 06월 03일` 형태로 가공하여, 리스트 상에서 날짜별로 그룹화(Group by date)하여 일괄 표시합니다.
4. **주문 상세 정보 토글 표시**:
   - 기본 상태에서는 배송 및 결제 정보를 단순하게 `[배송방식] [결제방식] [총 금액]` 형태로 요약 바에 한 줄로 표시합니다.
   - 우측의 `[▼ 상세보기]` 버튼을 클릭했을 때만 하단으로 세부 정보(배송방식 : , 결제방식 : , 상세 주소, 알림 수신 동의 등)와 결제금액 요약 그리드가 확장되어 노출됩니다.
5. **포장 검증 체크박스 및 강조된 수량**:
   - 주문 상품 상세 항목에서 가격을 제거하고 수량 텍스트를 `수량` 글씨 없이 `N`(보라색) `개`(검은색)로 크고 굵게 강조하여 시인성을 극대화하였습니다.
   - 품목 우측에 개별 포장 여부를 관리자가 검증할 수 있는 체크박스가 제공됩니다.
   - 이미 DB 상태가 `'포장완료'`이거나 `'미송포장완료'`인 품목은 체크 및 비활성화(disabled) 상태로 렌더링되며, 미송으로 이월된 품목은 `'미송 이월됨'` 뱃지와 함께 체크박스가 비활성화됩니다.
6. **주문 상태 변경 비즈니스 로직 및 시간 기록**:
   - **일반 주문 탭 (포장 완료 변경 시)**:
     - **모든 활성 품목이 체크된 경우**: 포장 완료 확인창(`"포장을 완료하시겠어요? 거래처에 자동으로 알림이가요"`) 수락 시 주문 상태를 `'포장 완료'`로 변경하고 관련 품목의 `item_status`를 모두 `'포장완료'`로 업데이트하며, `status_updated_at`에 현재 변경 일시를 기록합니다.
     - **미체크 품목이 남아있는 경우**: 이월 확인창(`"모든 포장물품이 체크되지 않았어요! 남은 물건을 미송처리해서 저장할까요?"`) 수락 시 원본 주문을 `'포장 완료'`로 바꾸고, 체크된 품목은 `'포장완료'`, 체크되지 않은 품목은 `'미송'` 상태로 업데이트하며 두 품목 모두 `status_updated_at`에 변경 일시를 기록합니다. 이후 체크되지 않은 품목들로 구성된 새로운 미송 주문서(`misong_orders` 및 `misong_order_items`)를 생성하여 이월 처리합니다.
   - **미송 주문 탭 (미송포장완료 변경 시)**:
     - 미송 주문서 내 모든 품목이 체크되어 있을 때만 `'미송포장완료'`로 변경할 수 있습니다.
     - 변경 시 `misong_orders` 및 `misong_order_items`를 `'미송포장완료'`로 저장(상태 변경 시각도 함께 기록)하고, 원본 `order_items` 테이블의 연관된 품목들(`original_item_id`)의 `item_status`도 `'미송포장완료'`로 동기화 업데이트하고 변경 시각을 `status_updated_at`에 갱신합니다. (일반 주문서 및 거래처 주문 조회 화면에서도 실시간 반영)
7. **이미지 확대 팝업 (라이트박스)**:
   - 주문 상품 썸네일 클릭 시, 전체화면을 덮는 블러 배경의 팝업 창이 열려 옵션 사진을 크게 확대할 수 있습니다.

---

### 8-7. `MyOrdersPage.tsx` — 주문서 조회 페이지

**진입 조건**: `/my-orders` 라우트 (헤더 메뉴에서 `🔍 주문 조회` 링크 클릭)
**인증**: 불필요 — 전화번호 입력만으로 조회 가능 (비회원 공개 페이지)

**주요 기능**:
1. **전화번호 기반 주문 검색**:
   - 거래처 사장님이 주문 시 입력한 전화번호를 입력하면, `supabase.from('orders').select('*, order_items(*)').eq('customer_phone', parsedPhone)` 쿼리로 관련 주문 전체를 조회합니다.
   - 전화번호에서 숫자만 추출(`replace(/\D/g, '')`)하여 최소 9자리 이상인지 유효성 검증합니다.
2. **주문 목록 카드 표시**:
   - 조회 결과를 최신순(`ascending: false`)으로 카드형 리스트로 렌더링합니다.
   - 각 카드에 주문번호, 주문 날짜, 주문 전체 상태(`주문 완료` / `주문 확인` / `포장 완료`) 뱃지를 표시합니다.
3. **품목별 실시간 상태 표시 (아이템 수준)**:
   - 주문 내 개별 품목(`order_items`)의 `item_status` 값에 따라 4가지 상태 뱃지를 표시합니다:
     | `item_status` 값 | 표시 라벨 | 배경색 | 텍스트 색 |
     |-------------------|-----------|--------|----------|
     | `미포장` (기본값) | 준비중 | 반투명 흰색 | `--text-muted` |
     | `포장완료` | 완료 | 에메랄드 반투명 | `#10b981` |
     | `미송` | 미송 | 앰버 반투명 | `#f59e0b` |
     | `미송포장완료` | 미송완료 | 블루 반투명 | `#3b82f6` |
   - `status_updated_at`이 존재하면 상태 변경 일시를 `MM/DD HH:mm` 형식으로 뱃지 아래에 작게 표시합니다.
4. **배송 및 결제 요약**:
   - 카드 하단에 배송 방식(`택배`/`삼촌 대행`/`매장 전달`)과 결제 방식(`계좌이체`/`삼촌 대납`/`매장 대납`)을 요약 표시합니다.
   - 총 주문 금액을 accent 색상으로 강조합니다.
5. **빈 결과 처리**:
   - 검색 결과가 없을 경우 안내 메시지(`접수된 주문서가 없습니다.`)를 표시합니다.

## 9. 외부 인프라 및 DB 연동

### 9-1. 환경 변수 (`.env`)
프로젝트 루트 폴더에 위치하며, 빌드타임 시 `VITE_` 접두어 환경변수가 주입됩니다.

| 변수명 | 용도 | 비고 |
|--------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | 필수 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable Key (anon key) | 필수 |
| `VITE_IMGBB_API_KEY` | ImgBB 이미지 업로드 API 키 | 상품 등록 시 필수 |
| `VITE_ADMIN_EMAIL` | 어드민 Supabase Auth 이메일 | 어드민 로그인 시 필수 |
| `VITE_ADMIN_PASSWORD` | 어드민 Supabase Auth 비밀번호 | 어드민 로그인 시 필수 |

> ⚠️ **보안 주의**: `.env` 파일에는 API 키와 어드민 계정 비밀번호가 포함되어 있으므로, **절대로 Git에 커밋하거나 외부에 노출해서는 안 됩니다**. `.gitignore`에 `.env`가 등록되어 있는지 반드시 확인하세요.

### 9-2. Supabase DB 스키마 구조

#### `products` 테이블 (상품 정보)
- `id` (int8, PK, Auto Increment)
- `name` (text, Not Null)
- `price` (int8, Not Null)
- `description` (text)
- `category` (text)
- `main_images` (text[], ImgBB CDN URL 리스트)
- `is_visible` (boolean, default: true, Not Null)
- `created_at` (timestamptz, default: now())

#### `product_variants` 테이블 (색상 옵션 정보)
- `id` (text, PK, 예: "{product_id}-opt{옵션순번}")
- `product_id` (int8, FK -> `products.id` on delete cascade)
- `color_name` (text, Not Null)
- `image` (text, ImgBB CDN URL)
- `is_visible` (boolean, default: true, Not Null)

#### `customers` 테이블 (거래처 정보)
- `phone` (text, PK, 숫자 형태만 저장됨 예: '01093863222')
- `shop_name` (text, Not Null)
- `postcode` (text, Not Null)
- `address` (text, Not Null)
- `detail_address` (text, Not Null)
- `created_at` (timestamptz, default: now())

#### `orders` 테이블 (주문 마스터 정보)
- `id` (int8, PK, Auto Increment)
- `customer_phone` (text, FK -> `customers.phone` ON DELETE RESTRICT)
- `delivery_method` (text, Not Null)
- `payment_method` (text, Not Null)
- `shop_delivery_info` (text, Nullable)
- `notification_agreed` (boolean, default: false)
- `delivery_fee` (int8, default: 0)
- `total_price` (int8, Not Null)
- `status` (text, default: '주문 완료' - '주문 완료' | '주문 확인' | '포장 완료')
- `created_at` (timestamptz, default: now())

#### `order_items` 테이블 (주문 상세 상품 정보)
- `id` (int8, PK, Auto Increment)
- `order_id` (int8, FK -> `orders.id` ON DELETE CASCADE)
- `product_id` (int8, FK -> `products.id` ON DELETE SET NULL)
- `product_name` (text, Not Null)
- `variant_id` (text, Nullable)
- `variant_name` (text, Not Null)
- `image` (text, Not Null)
- `quantity` (int8, Not Null)
- `price` (int8, Not Null)
- `item_status` (text, default: '미포장', Not Null) — `'미포장'` | `'포장완료'` | `'미송'` | `'미송포장완료'`
- `status_updated_at` (timestamptz, Nullable) — 품목의 포장 상태가 변경된 최종 일시

> **참고**: `item_status`와 `status_updated_at`은 원본 `CREATE TABLE` 문에 포함되지 않고 `ALTER TABLE`로 추가됩니다.

#### `admin_auth` 테이블 (어드민 비밀번호 검증용)
- `id` (int8, PK, Auto Increment)
- `password_hash` (text, Not Null) - bcrypt로 암호화된 비밀번호 해시값 (입력 비밀번호는 `'012560'`)
- `created_at` (timestamptz, default: now())

#### `misong_orders` 테이블 (미송 주문 마스터 정보)
- `id` (int8, PK, Auto Increment)
- `original_order_id` (int8, FK -> `orders.id` ON DELETE SET NULL)
- `customer_phone` (text, FK -> `customers.phone` ON DELETE RESTRICT)
- `delivery_method` (text, Not Null)
- `payment_method` (text, Not Null)
- `shop_delivery_info` (text, Nullable)
- `notification_agreed` (boolean, default: false)
- `delivery_fee` (int8, default: 0)
- `total_price` (int8, Not Null - 미송 품목들의 가격 합산)
- `status` (text, default: '미송' - `'미송'` | `'미송포장완료'`)
- `created_at` (timestamptz, default: now())

#### `misong_order_items` 테이블 (미송 주문 상세 상품 정보)
- `id` (int8, PK, Auto Increment)
- `misong_order_id` (int8, FK -> `misong_orders.id` ON DELETE CASCADE)
- `original_item_id` (int8, FK -> `order_items.id` ON DELETE SET NULL)
- `product_id` (int8, FK -> `products.id` ON DELETE SET NULL)
- `product_name` (text, Not Null)
- `variant_id` (text, Nullable)
- `variant_name` (text, Not Null)
- `image` (text, Not Null)
- `quantity` (int8, Not Null)
- `price` (int8, Not Null)
- `status` (text, default: '미송' — `'미송'` | `'미송포장완료'`)
- `status_updated_at` (timestamptz, Nullable) — 미송 품목의 상태 변경 최종 일시

#### DB 마이그레이션 및 실시간 활성화 SQL
기존에 구축된 DB 인스턴스에 `is_visible`, 미송 및 신규 주문 관련 테이블들이 없는 경우, Supabase SQL Editor에서 프로젝트 루트의 `schema.sql` 스크립트를 통째로 실행해야 합니다. 기존 테이블이 존재하고 컬럼 및 실시간 복제 설정을 수동 적용 시 아래 구문을 실행합니다:
```sql
-- 기존 products/product_variants 테이블에 컬럼 추가
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

-- orders 테이블의 실시간 업데이트 활성화 (실시간 포장알림 발송용)
alter publication supabase_realtime add table public.orders;

-- admin_auth 비밀번호 검증용 RPC 함수 등록 (pgcrypto의 crypt 함수 사용, 보안 강화)
-- 실행 전에 Supabase 대시보드에서 `CREATE EXTENSION IF NOT EXISTS pgcrypto;`가 실행되어 있어야 합니다.
CREATE OR REPLACE FUNCTION public.verify_admin_password(input_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_auth 
    WHERE crypt(input_password, password_hash) = password_hash
  );
END;
$$;
```

#### RLS 정책 보안 현황

`schema.sql` 13번 섹션에서 주요 테이블의 쓰기(INSERT/UPDATE/DELETE) 권한을 어드민 전용(`auth.role() = 'authenticated'`)으로 재구성합니다.

| 테이블 | SELECT | INSERT | UPDATE | DELETE | 비고 |
|--------|--------|--------|--------|--------|------|
| `products` | 🔓 공개 | 🔒 어드민 | 🔒 어드민 | 🔒 어드민 | |
| `product_variants` | 🔓 공개 | 🔒 어드민 | 🔒 어드민 | 🔒 어드민 | |
| `customers` | 🔓 공개 | 🔓 공개 | 🔓 공개 | 🔓 공개 | ⚠️ 주문 접수 시 upsert 필요 |
| `orders` | 🔓 공개 | 🔓 공개 | 🔒 어드민 | 🔒 어드민 | 주문 접수(insert)는 공개 |
| `order_items` | 🔓 공개 | 🔓 공개 | 🔒 어드민 | 🔒 어드민 | |
| `misong_orders` | 🔓 공개 | 🔓 공개 | 🔓 공개 | 🔓 공개 | ⚠️ 보안 미적용 |
| `misong_order_items` | 🔓 공개 | 🔓 공개 | 🔓 공개 | 🔓 공개 | ⚠️ 보안 미적용 |
| `admin_auth` | ❌ 차단 (SELECT 없음) | ❌ 없음 | ❌ 없음 | ❌ 없음 | RPC 함수(`verify_admin_password`)를 통해서만 서버사이드 비교 가능 |

---

## 10. 사용자 화면 조회 설계

- **`ProductList.tsx`**:
  - 마운트 시 `supabase.from('products').select('*, product_variants(*)')` 조인 쿼리 실행.
  - 성공적으로 데이터를 가져오면 카멜케이스 객체 형태로 매핑하여 리스트 그리드에 렌더링.
  - Supabase 조회 에러가 발생하거나 등록 상품이 없는 경우, 빈 상품 목록 화면을 보여줍니다.
- **`ProductDetail.tsx`**:
  - URL 파라미터 `id`로 상품 단건 상세 조회.
  - DB 에러 또는 부재 시 상품을 찾을 수 없다는 안내 문구를 보여줍니다.
- **`OrderPage.tsx` (거래처 조회)**:
  - 전화번호 입력 시 `supabase.from('customers').select('*').eq('phone', cleaned).maybeSingle()`을 조회하여, DB에 거래처가 있으면 주소 및 상호를 자동 완성시킵니다. DB에 조회 결과가 없으면 즉시 신규 회원(`new`)으로 간주하여 신규 가입 양식을 띄웁니다.
- **`App.tsx` (실시간 푸시 알림)**:
  - Supabase Realtime 채널을 연결해 구매 고객의 마지막 주문 상태가 `'포장 완료'`로 변경되는 것을 브라우저가 실시간 감지하여, 백그라운드 푸시 알림(Web Notification)을 발생시킵니다.

---

## 11. 스타일링 가이드

### 주요 CSS 파일

| 파일 | 역할 |
|------|------|
| `src/index.css` | CSS 변수 정의, 전역 리셋 |
| `src/App.css` | 모든 컴포넌트 및 관리자 페이지 스타일 (약 45KB) |

### 주요 CSS 클래스 (관리자 관련 추가)

```
.admin-auth-container      관리자 로그인 페이지 컨테이너
.auth-card                 로그인 글래스모피즘 카드
.admin-dashboard-container 관리자 전체 페이지 레이아웃
.admin-header              상단 바 (타이틀, 나가기 단추)
.admin-tabs                상단 탭 바 (상품 등록 / 거래처 관리)
.product-register-form     상품 등록 폼 전체 영역
.file-uploader-box         대표 이미지 드래그/선택 박스 (다중 파일)
.preview-thumbnail-container  업로드 완료된 대표 이미지 미리보기 타일
.variant-form-row          옵션 행 단위 레이아웃
.row-uploaded-preview      옵션 이미지 업로드 완료 미리보기 썸네일 바
.submit-product-btn        전체 DB 저장 버튼 (그라데이션 호버 애니메이션)
.orders-filter-bar         주문 목록 기간 필터링 컨테이너
.filter-tag-btn            필터링 태그 버튼 (최근 3일/7일 등)
.order-sheet-card          개별 주문서 카드
.order-status-controller   주문 상태 컨트롤러 셀렉트박스 영역
.zoom-lightbox             확대 이미지 라이트박스 팝업 오버레이
```

---

## 12. 현재 미구현 / TODO 항목

| 파일 | 상태 | 내용 |
|------|------|------|
| `src/api/client.ts` | ⚠️ 스텁 | 실제 fetch/axios 로직 구현 필요 |
| `src/hooks/useProducts.ts` | ⚠️ 스텁 | TanStack Query 등으로 상품 목록 API 연동 필요 |
| `src/context/` | 🚧 비어 있음 | 필요 시 Context 추가 |

---

## 13. 보안 현황 및 주의사항

### 13-1. 인증 체계 요약

```
[사용자] → OrderPage (주문 접수) → 인증 없이 INSERT 가능 (customers, orders, order_items)
[관리자] → AdminPage / AdminOrdersPage → 이중 검증 필요:
   ① 쿠키 admin_auth = 'true' 확인
   ② supabase.auth.getSession()으로 JWT 세션 유효성 검증
   → 미인증 시 로그인 화면 렌더링
```

### 13-2. 현존 보안 위험 요소

| 위험도 | 항목 | 현황 | 권장 조치 | 처리 상태
|--------|------|------|----------|---------|
| 🔴 높음 | `.env` 파일 Git 노출 | `.gitignore`에 `.env`가 **미등록** 상태 | `.gitignore`에 `.env` 추가 필수 | 처리완료 |
| 🔴 높음 | `admin_auth.password_hash` 평문 | 해시가 아닌 평문(`012560`)으로 저장 | bcrypt 등으로 해시화 권장 | 처리완료 |
| 🟡 중간 | `misong_orders` RLS 미잠금 | UPDATE/DELETE가 `public`으로 열림 | 어드민 전용 정책으로 변경 필요 | 처리완료 |
| 🟡 중간 | `misong_order_items` RLS 미잠금 | UPDATE/DELETE가 `public`으로 열림 | 어드민 전용 정책으로 변경 필요 | 처리완료 |
| 🟡 중간 | `customers` 테이블 전체 공개 | UPDATE/DELETE가 `public`으로 열림 | INSERT/UPDATE만 공개, DELETE는 어드민 전용으로 변경 권장 | 처리완료 |
| 🟡 중간 | admin_auth SELECT 공개 | 비밀번호 평문을 누구나 조회 가능 | 서버사이드 함수(RPC)로 검증 이동 | 처리완료 |
| 🟢 낮음 | `VITE_` 환경변수 클라이언트 노출 | Vite 빌드 시 `VITE_` 접두어 변수는 번들에 포함됨 | Publishable Key와 ImgBB Key는 클라이언트 노출 설계이므로 허용, 단 어드민 비밀번호는 RLS + Auth로 보호 | |

### 13-3. RLS 보안 강화 적용 SQL

아래 SQL을 Supabase SQL Editor에서 실행하면 주요 테이블의 쓰기 권한을 어드민 전용으로 잠글 수 있습니다.

```sql
-- misong_orders RLS 보안 강화
DROP POLICY IF EXISTS "Allow public insert on misong_orders" ON public.misong_orders;
DROP POLICY IF EXISTS "Allow public update on misong_orders" ON public.misong_orders;
DROP POLICY IF EXISTS "Allow public delete on misong_orders" ON public.misong_orders;
CREATE POLICY "Allow admin insert on misong_orders" ON public.misong_orders FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin update on misong_orders" ON public.misong_orders FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin delete on misong_orders" ON public.misong_orders FOR DELETE USING (auth.role() = 'authenticated');

-- misong_order_items RLS 보안 강화
DROP POLICY IF EXISTS "Allow public insert on misong_order_items" ON public.misong_order_items;
DROP POLICY IF EXISTS "Allow public update on misong_order_items" ON public.misong_order_items;
DROP POLICY IF EXISTS "Allow public delete on misong_order_items" ON public.misong_order_items;
CREATE POLICY "Allow admin insert on misong_order_items" ON public.misong_order_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow admin update on misong_order_items" ON public.misong_order_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow admin delete on misong_order_items" ON public.misong_order_items FOR DELETE USING (auth.role() = 'authenticated');

-- customers 테이블 DELETE 보안 강화
DROP POLICY IF EXISTS "Allow public delete on customers" ON public.customers;
CREATE POLICY "Allow admin delete on customers" ON public.customers FOR DELETE USING (auth.role() = 'authenticated');
```

---

## 14. 개발 시 주의사항 (에이전트 필독)

1. **UI 크기**: 사용자가 고령층 포함이므로 버튼·텍스트·터치 영역을 **크게** 유지할 것
2. **모바일 우선**: 레이아웃 변경 시 모바일(412px 기준) 에서 먼저 확인
3. **CSS 위치**: 스타일은 반드시 `src/App.css`에 추가 (인라인 스타일은 최소화)
4. **상태 관리**: 장바구니 관련 로직은 반드시 `useCartStore`를 통해 처리
5. **이미지 경로**: 상품 등록 시에는 ImgBB API를 통해 반환된 CDN URL이 `products`의 `main_images` 및 `product_variants`의 `image` 컬럼에 저장되며, 사용자 화면에서는 로컬 경로 `/Products/...` 외에도 해당 외부 CDN URL 이미지가 정상 렌더링되도록 구현됨
6. **카카오 API**: Daum Postcode 스크립트는 `OrderPage.tsx`의 `useEffect`에서 동적 로드됨 — 중복 로드 방지 로직 있음
7. **전화번호 PK**: DB 저장 시 반드시 `.replace(/\D/g, '')` 파싱 후 저장
8. **라우터 스크롤**: 페이지 이동 시 `window.scrollTo(0, 0)` 필요 (OrderPage, ProductDetail에 구현됨)
9. **장바구니 오버레이 버튼**: 이전에 장바구니 담기 후 하단에 표시되던 오렌지색 플로팅 UI는 제거됨 — 다시 추가 금지
10. **ImgBB API Key**: 업로드 기능을 구현할 때 반드시 `.env` 파일의 `VITE_IMGBB_API_KEY` 값을 참조하여 요청을 전송하도록 처리
11. **어드민 인증 방식**: 쿠키 기반(`admin_auth`)이며, `sessionStorage`가 아님. 쿠키 유효기간은 7일. 두 어드민 페이지(`AdminPage`, `AdminOrdersPage`) 모두 동일한 쿠키 헬퍼 함수를 내장
12. **어드민 비밀번호**: DB `admin_auth` 테이블의 `password_hash` 값은 bcrypt 해시로 안전하게 저장되어 있으며, 입력하는 실제 비밀번호는 `012560`입니다. AGENT_GUIDE 외부에 노출 금지
13. **`.env` 보안**: `.env` 파일의 실제 값을 코드나 문서에 하드코딩하지 말 것. 변수명과 용도만 기재

---

## 15. 빠른 작업 참조

### 상품 추가하기 (자동 - DB 저장)
- 브라우저에서 `/admin` 접속 → 비밀번호(`012560`) 입력 → 상품 정보 기입 및 대표/옵션 이미지 업로드 → [등록 완료] 클릭

### 스타일 추가하기
- `src/App.css` 파일 하단에 클래스 추가
- CSS 변수는 `src/index.css`에서 정의된 것 활용
