export interface Category {
  id: string;
  name: string;
  order_index: number;
}

export interface Item {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: number; // 0 or 1
  complement_categories?: ComplementCategory[];
}

export interface ComplementCategory {
  id: string;
  name: string;
  is_required: number; // 0 or 1
  min_select: number;
  max_select: number;
  items?: Complement[];
  linked_products_count?: number;
}

export interface Complement {
  id: string;
  category_id: string;
  name: string;
  price: number;
  max_quantity: number;
  is_visible: number;
}

export interface OrderItemComplement {
  id: string;
  order_item_id: string;
  complement_id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  price_at_time: number;
  item_name: string;
  complements?: OrderItemComplement[];
}

export interface PaymentMethods {
  pix: boolean;
  credit_card: boolean;
  debit_card: boolean;
  cash: boolean;
  pix_key?: string;
  pix_key_type?: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
}

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  status: 'pending' | 'preparing' | 'ready' | 'delivering' | 'completed' | 'cancelled';
  order_type: 'delivery' | 'pickup';
  total: number;
  created_at: string;
  items?: OrderItem[];
  payment_method?: string;
  payment_timing?: 'online' | 'delivery' | 'pickup';
  change_for?: number;
}

export interface BusinessHourRange {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

export interface DaySchedule {
  isOpen: boolean;
  ranges: BusinessHourRange[];
}

export interface BusinessHours {
  [key: string]: DaySchedule; // "0" (Sunday) to "6" (Saturday)
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  complement?: string;
  reference?: string;
  created_at: string;
}

export interface Settings {
  id: number;
  name: string;
  currency: string;
  delivery_fee: number;
  min_order: number;
  free_shipping_min_order?: number;
  phone: string;
  address: string; // Keep for backward compatibility or full string representation
  cep?: string;
  street?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  complement?: string;
  reference?: string;
  business_hours?: BusinessHours;
  payment_methods?: PaymentMethods;
}
