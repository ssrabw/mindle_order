export interface ProductVariant {
  id: string;
  colorName: string;
  image: string;
  isVisible?: boolean;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  mainImages: string[]; // 상세페이지용 메인 이미지 슬라이드 리스트 (main_01, main_02 등)
  variants: ProductVariant[]; // 색상별 주문 옵션 이미지 및 정보
  category: string;
  isDeleted?: boolean;
  isVisible?: boolean;
}
