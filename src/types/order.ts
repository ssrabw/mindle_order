export interface Customer {
  phone: string;
  shop_name: string;
  postcode: string;
  address: string;
  detail_address: string;
}

export interface OrderItem {
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
  is_checked?: boolean;
  original_item_id?: number | null;
  status_updated_at?: string | null;
}

export interface Order {
  id: number;
  customer_phone: string;
  delivery_method: string;
  payment_method: string;
  shop_delivery_info: string | null;
  notification_agreed: boolean;
  delivery_fee: number;
  total_price: number;
  status: string; // '주문 완료' | '주문 확인' | '포장 완료' | '미송' | '미송포장완료' | '주문 취소'
  created_at: string;
  customers: Customer | null;
  order_items: OrderItem[];
}
