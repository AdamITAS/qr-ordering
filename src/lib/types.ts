export interface Table {
  id: string;
  name: string;
  number: number;
  currentTokenId: string | null;
  currentSessionId: string | null;
}

export interface Token {
  id: string;
  tableId: string;
  token: string;
  isValid: boolean;
  createdAt: string;
  invalidatedAt: string | null;
  restoredAt: string | null;
}

export interface TableSession {
  id: string;
  tableId: string;
  tokenId: string;
  startedAt: string;
  closedAt: string | null;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  spiceLevel: number; // 0=none, 1=mild, 2=medium, 3=hot
  isAvailable: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  notes: string;
}

export interface Order {
  id: string;
  sessionId: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export type SessionStatus = 'active' | 'inactive' | 'closed';

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  details: string;
  timestamp: string;
}

export type AuditAction =
  | 'token_created'
  | 'token_invalidated'
  | 'token_restored'
  | 'table_session_started'
  | 'table_session_closed'
  | 'table_session_inactive'
  | 'table_session_reactivated'
  | 'product_created'
  | 'product_updated'
  | 'product_archived'
  | 'product_marked_sold_out'
  | 'product_marked_available'
  | 'order_created'
  | 'order_status_changed'
  | 'order_item_removed_by_admin'
  | 'table_freed'
  | 'table_paid';

export interface CartItem {
  productId: string;
  quantity: number;
  notes: string;
}

// Utility: derive a 4-digit receipt number from an order ID
export function getReceiptNumber(orderId: string): number {
  const hex = orderId.replace(/-/g, '').substring(0, 8);
  const num = parseInt(hex, 16);
  return (num % 9000) + 1000; // 4-digit number between 1000-9999
}
