'use client';

import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import { supabase } from './supabase';
import type {
  Table,
  Token,
  TableSession,
  Product,
  Order,
  OrderItem,
  OrderStatus,
  AuditLogEntry,
  AuditAction,
  CartItem,
} from './types';

// Helper: convert DB row to app type (camelCase)
function rowToTable(row: any): Table {
  return {
    id: row.id,
    name: row.name,
    number: row.number,
    currentTokenId: row.currentTokenId,
    currentSessionId: row.currentSessionId,
  };
}

function rowToToken(row: any): Token {
  return {
    id: row.id,
    tableId: row.tableId,
    token: row.token,
    isValid: row.isValid,
    createdAt: row.createdAt,
    invalidatedAt: row.invalidatedAt,
    restoredAt: row.restoredAt,
  };
}

function rowToSession(row: any): TableSession {
  return {
    id: row.id,
    tableId: row.tableId,
    tokenId: row.tokenId,
    startedAt: row.startedAt,
    closedAt: row.closedAt,
    isActive: row.isActive,
  };
}

function rowToProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    price: Number(row.price),
    category: row.category,
    imageUrl: row.imageUrl || '',
    isAvailable: row.isAvailable,
    isArchived: row.isArchived,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToOrder(row: any, items: OrderItem[] = []): Order {
  return {
    id: row.id,
    sessionId: row.sessionId,
    tableId: row.tableId,
    items,
    status: row.status as OrderStatus,
    total: Number(row.total),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function rowToOrderItem(row: any): OrderItem {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName,
    price: Number(row.price),
    quantity: row.quantity,
    notes: row.notes || '',
  };
}

function rowToAuditLog(row: any): AuditLogEntry {
  return {
    id: row.id,
    action: row.action as AuditAction,
    details: row.details || '',
    timestamp: row.timestamp,
  };
}

interface RestaurantState {
  tables: Table[];
  tokens: Token[];
  sessions: TableSession[];
  products: Product[];
  orders: Order[];
  auditLog: AuditLogEntry[];
  cart: CartItem[];
  initialized: boolean;
  loading: boolean;

  // Table actions
  addTable: (name: string, number: number) => Promise<void>;
  generateToken: (tableId: string) => Promise<string>;
  invalidateToken: (tokenId: string) => Promise<void>;
  restoreToken: (tokenId: string) => Promise<void>;
  freeTable: (tableId: string) => Promise<void>;

  // Session actions
  startSession: (tableId: string, tokenId: string) => Promise<string>;
  closeSession: (sessionId: string) => Promise<void>;

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  archiveProduct: (id: string) => Promise<void>;
  markProductSoldOut: (id: string) => Promise<void>;
  markProductAvailable: (id: string) => Promise<void>;

  // Order actions
  createOrder: (sessionId: string, tableId: string, items: CartItem[]) => Promise<Order | null>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  removeOrderItem: (orderId: string, itemId: string) => Promise<void>;

  // Cart actions (local only)
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartNotes: (productId: string, notes: string) => void;
  clearCart: () => void;

  // Audit
  addAuditLog: (action: AuditAction, details: string) => Promise<void>;

  // Getters
  getTableByToken: (tokenStr: string) => Table | undefined;
  getTokenByString: (tokenStr: string) => Token | undefined;
  getActiveSession: (tableId: string) => TableSession | undefined;
  getOrdersForSession: (sessionId: string) => Order[];
  getOrdersForTable: (tableId: string) => Order[];
  getAvailableProducts: () => Product[];
  isProductSoldOut: (productId: string) => boolean;

  // Data fetching
  fetchAllData: () => Promise<void>;
  syncFromStorage: () => Promise<void>;

  // Init
  initializeSeedData: () => Promise<void>;
}

export const useRestaurantStore = create<RestaurantState>()(
  (set, get) => ({
    tables: [],
    tokens: [],
    sessions: [],
    products: [],
    orders: [],
    auditLog: [],
    cart: [],
    initialized: false,
    loading: false,

    // =============================================
    // FETCH ALL DATA FROM SUPABASE
    // =============================================
    fetchAllData: async () => {
      try {
        const [tablesRes, tokensRes, sessionsRes, productsRes, ordersRes, itemsRes, auditRes] = await Promise.all([
          supabase.from('tables').select('*').order('number'),
          supabase.from('tokens').select('*').order('createdAt', { ascending: false }),
          supabase.from('sessions').select('*').order('startedAt', { ascending: false }),
          supabase.from('products').select('*').order('category, name'),
          supabase.from('orders').select('*').order('createdAt', { ascending: false }),
          supabase.from('order_items').select('*'),
          supabase.from('audit_log').select('*').order('timestamp', { ascending: false }),
        ]);

        const allItems = (itemsRes.data || []).map(rowToOrderItem);

        const orders = (ordersRes.data || []).map((row) => {
          const orderItems = allItems.filter((i) => i.id !== undefined && allItems.some(ai => ai.id === i.id && (itemsRes.data || []).find(r => r.id === i.id && r.orderId === row.id)));
          // Simpler approach: group items by orderId
          const itemsForOrder = (itemsRes.data || [])
            .filter((r: any) => r.orderId === row.id)
            .map(rowToOrderItem);
          return rowToOrder(row, itemsForOrder);
        });

        set({
          tables: (tablesRes.data || []).map(rowToTable),
          tokens: (tokensRes.data || []).map(rowToToken),
          sessions: (sessionsRes.data || []).map(rowToSession),
          products: (productsRes.data || []).map(rowToProduct),
          orders,
          auditLog: (auditRes.data || []).map(rowToAuditLog),
          initialized: true,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to fetch data from Supabase:', err);
        set({ loading: false });
      }
    },

    // Alias for backward compatibility
    syncFromStorage: async () => {
      await get().fetchAllData();
    },

    // =============================================
    // TABLE ACTIONS
    // =============================================
    addTable: async (name: string, number: number) => {
      const id = uuid();
      const { error } = await supabase.from('tables').insert({
        id,
        name,
        number,
        currentTokenId: null,
        currentSessionId: null,
      });
      if (error) { console.error('addTable error:', error); return; }
      set((state) => ({ tables: [...state.tables, { id, name, number, currentTokenId: null, currentSessionId: null }] }));
      await get().addAuditLog('table_freed', `Table "${name}" (#${number}) created`);
    },

    generateToken: async (tableId: string) => {
      const tokenStr = uuid().replace(/-/g, '').substring(0, 12);
      const id = uuid();
      const now = new Date().toISOString();
      const table = get().tables.find((t) => t.id === tableId);

      const { error } = await supabase.from('tokens').insert({
        id,
        tableId,
        token: tokenStr,
        isValid: true,
        createdAt: now,
        invalidatedAt: null,
        restoredAt: null,
      });
      if (error) { console.error('generateToken error:', error); return ''; }

      // Update table's currentTokenId
      await supabase.from('tables').update({ currentTokenId: id }).eq('id', tableId);

      set((state) => ({
        tokens: [...state.tokens, { id, tableId, token: tokenStr, isValid: true, createdAt: now, invalidatedAt: null, restoredAt: null }],
        tables: state.tables.map((t) =>
          t.id === tableId ? { ...t, currentTokenId: id } : t
        ),
      }));

      await get().addAuditLog('token_created', `Token generated for ${table?.name || 'Unknown table'}: ${tokenStr}`);
      return tokenStr;
    },

    invalidateToken: async (tokenId: string) => {
      const token = get().tokens.find((t) => t.id === tokenId);
      if (!token) return;
      const table = get().tables.find((t) => t.id === token.tableId);
      const now = new Date().toISOString();

      const { error } = await supabase.from('tokens').update({
        isValid: false,
        invalidatedAt: now,
      }).eq('id', tokenId);
      if (error) { console.error('invalidateToken error:', error); return; }

      set((state) => ({
        tokens: state.tokens.map((t) =>
          t.id === tokenId ? { ...t, isValid: false, invalidatedAt: now } : t
        ),
      }));
      await get().addAuditLog('token_invalidated', `Token invalidated for ${table?.name || 'Unknown table'}: ${token.token}`);
    },

    restoreToken: async (tokenId: string) => {
      const token = get().tokens.find((t) => t.id === tokenId);
      if (!token) return;
      const table = get().tables.find((t) => t.id === token.tableId);
      const now = new Date().toISOString();

      // Check for closed session to reopen
      const closedSession = get().sessions.find(
        (s) => s.tableId === token.tableId && !s.isActive && s.tokenId === tokenId
      );

      const { error } = await supabase.from('tokens').update({
        isValid: true,
        restoredAt: now,
      }).eq('id', tokenId);
      if (error) { console.error('restoreToken error:', error); return; }

      // Update table's currentTokenId
      await supabase.from('tables').update({ currentTokenId: tokenId }).eq('id', token.tableId);

      // Reopen session if exists
      if (closedSession) {
        await supabase.from('sessions').update({
          isActive: true,
          closedAt: null,
        }).eq('id', closedSession.id);

        await supabase.from('tables').update({ currentSessionId: closedSession.id }).eq('id', token.tableId);
      }

      set((state) => ({
        tokens: state.tokens.map((t) =>
          t.id === tokenId ? { ...t, isValid: true, restoredAt: now } : t
        ),
        tables: state.tables.map((t) =>
          t.id === token.tableId
            ? { ...t, currentTokenId: tokenId, ...(closedSession ? { currentSessionId: closedSession.id } : {}) }
            : t
        ),
        sessions: closedSession
          ? state.sessions.map((s) =>
              s.id === closedSession.id ? { ...s, isActive: true, closedAt: null } : s
            )
          : state.sessions,
      }));

      await get().addAuditLog('token_restored', `Token restored for ${table?.name || 'Unknown table'}: ${token.token}${closedSession ? ' (session reopened)' : ''}`);
    },

    freeTable: async (tableId: string) => {
      const table = get().tables.find((t) => t.id === tableId);
      if (!table) return;

      // Close active session if any
      if (table.currentSessionId) {
        await get().closeSession(table.currentSessionId);
      }

      const { error } = await supabase.from('tables').update({
        currentTokenId: null,
        currentSessionId: null,
      }).eq('id', tableId);
      if (error) { console.error('freeTable error:', error); return; }

      set((state) => ({
        tables: state.tables.map((t) =>
          t.id === tableId ? { ...t, currentTokenId: null, currentSessionId: null } : t
        ),
      }));
      await get().addAuditLog('table_freed', `Table "${table.name}" freed`);
    },

    // =============================================
    // SESSION ACTIONS
    // =============================================
    startSession: async (tableId: string, tokenId: string) => {
      const id = uuid();
      const now = new Date().toISOString();
      const table = get().tables.find((t) => t.id === tableId);

      const { error } = await supabase.from('sessions').insert({
        id,
        tableId,
        tokenId,
        startedAt: now,
        closedAt: null,
        isActive: true,
      });
      if (error) { console.error('startSession error:', error); return ''; }

      // Update table's currentSessionId
      await supabase.from('tables').update({ currentSessionId: id }).eq('id', tableId);

      set((state) => ({
        sessions: [...state.sessions, { id, tableId, tokenId, startedAt: now, closedAt: null, isActive: true }],
        tables: state.tables.map((t) =>
          t.id === tableId ? { ...t, currentSessionId: id } : t
        ),
      }));
      await get().addAuditLog('table_session_started', `Session started for ${table?.name || 'Unknown table'}`);
      return id;
    },

    closeSession: async (sessionId: string) => {
      const session = get().sessions.find((s) => s.id === sessionId);
      if (!session) return;
      const table = get().tables.find((t) => t.id === session.tableId);
      const now = new Date().toISOString();

      const { error } = await supabase.from('sessions').update({
        isActive: false,
        closedAt: now,
      }).eq('id', sessionId);
      if (error) { console.error('closeSession error:', error); return; }

      // Clear table's currentSessionId if it matches
      if (table?.currentSessionId === sessionId) {
        await supabase.from('tables').update({ currentSessionId: null }).eq('id', session.tableId);
      }

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, isActive: false, closedAt: now } : s
        ),
        tables: state.tables.map((t) =>
          t.id === session.tableId && t.currentSessionId === sessionId
            ? { ...t, currentSessionId: null }
            : t
        ),
      }));
      await get().addAuditLog('table_session_closed', `Session closed for ${table?.name || 'Unknown table'}`);
    },

    // =============================================
    // PRODUCT ACTIONS
    // =============================================
    addProduct: async (product) => {
      const id = uuid();
      const now = new Date().toISOString();
      const newProduct: Product = { ...product, id, isArchived: false, createdAt: now, updatedAt: now };

      const { error } = await supabase.from('products').insert({
        id,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        imageUrl: product.imageUrl,
        isAvailable: product.isAvailable,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });
      if (error) { console.error('addProduct error:', error); return; }

      set((state) => ({ products: [...state.products, newProduct] }));
      await get().addAuditLog('product_created', `Product created: ${product.name}`);
    },

    updateProduct: async (id, updates) => {
      const now = new Date().toISOString();
      const updateData: any = { ...updates, updatedAt: now };

      const { error } = await supabase.from('products').update(updateData).eq('id', id);
      if (error) { console.error('updateProduct error:', error); return; }

      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, ...updates, updatedAt: now } : p
        ),
      }));
      const product = get().products.find((p) => p.id === id);
      await get().addAuditLog('product_updated', `Product updated: ${product?.name || id}`);
    },

    archiveProduct: async (id) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('products').update({ isArchived: true, updatedAt: now }).eq('id', id);
      if (error) { console.error('archiveProduct error:', error); return; }

      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, isArchived: true, updatedAt: now } : p
        ),
      }));
      const product = get().products.find((p) => p.id === id);
      await get().addAuditLog('product_archived', `Product archived: ${product?.name || id}`);
    },

    markProductSoldOut: async (id) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('products').update({ isAvailable: false, updatedAt: now }).eq('id', id);
      if (error) { console.error('markProductSoldOut error:', error); return; }

      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, isAvailable: false, updatedAt: now } : p
        ),
        cart: state.cart.filter((c) => c.productId !== id),
      }));
      const product = get().products.find((p) => p.id === id);
      await get().addAuditLog('product_marked_sold_out', `Product marked sold out: ${product?.name || id}`);
    },

    markProductAvailable: async (id) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('products').update({ isAvailable: true, updatedAt: now }).eq('id', id);
      if (error) { console.error('markProductAvailable error:', error); return; }

      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, isAvailable: true, updatedAt: now } : p
        ),
      }));
      const product = get().products.find((p) => p.id === id);
      await get().addAuditLog('product_marked_available', `Product marked available: ${product?.name || id}`);
    },

    // =============================================
    // ORDER ACTIONS
    // =============================================
    createOrder: async (sessionId, tableId, items) => {
      const session = get().sessions.find((s) => s.id === sessionId);
      if (!session || !session.isActive) return null;

      const products = get().products;
      const orderItems: OrderItem[] = items.map((item) => {
        const product = products.find((p) => p.id === item.productId);
        return {
          id: uuid(),
          productId: item.productId,
          productName: product?.name || 'Unknown Product',
          price: product?.price || 0,
          quantity: item.quantity,
          notes: item.notes,
        };
      });

      const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const now = new Date().toISOString();
      const orderId = uuid();

      // Insert order
      const { error: orderError } = await supabase.from('orders').insert({
        id: orderId,
        sessionId,
        tableId,
        status: 'pending',
        total,
        createdAt: now,
        updatedAt: now,
      });
      if (orderError) { console.error('createOrder error:', orderError); return null; }

      // Insert order items
      const itemsData = orderItems.map((item) => ({
        id: item.id,
        orderId,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(itemsData);
      if (itemsError) { console.error('createOrder items error:', itemsError); }

      const order: Order = {
        id: orderId,
        sessionId,
        tableId,
        items: orderItems,
        status: 'pending',
        total,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => ({
        orders: [order, ...state.orders],
        cart: [],
      }));

      const table = get().tables.find((t) => t.id === tableId);
      await get().addAuditLog('order_created', `Order created for ${table?.name || 'Unknown table'} - €${total.toFixed(2)}`);
      return order;
    },

    updateOrderStatus: async (orderId, status) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('orders').update({ status, updatedAt: now }).eq('id', orderId);
      if (error) { console.error('updateOrderStatus error:', error); return; }

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, status, updatedAt: now } : o
        ),
      }));
      await get().addAuditLog('order_status_changed', `Order ${orderId.substring(0, 8)} status changed to ${status}`);
    },

    removeOrderItem: async (orderId, itemId) => {
      const order = get().orders.find((o) => o.id === orderId);
      if (!order) return;

      const item = order.items.find((i) => i.id === itemId);
      if (!item) return;

      // Only allow removal if product is currently sold out
      const product = get().products.find((p) => p.id === item.productId);
      if (!product || product.isAvailable) return;

      // Delete from Supabase
      const { error } = await supabase.from('order_items').delete().eq('id', itemId);
      if (error) { console.error('removeOrderItem error:', error); return; }

      const newItems = order.items.filter((i) => i.id !== itemId);
      const total = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const now = new Date().toISOString();

      // Update order total
      await supabase.from('orders').update({ total, updatedAt: now }).eq('id', orderId);

      set((state) => ({
        orders: state.orders.map((o) =>
          o.id === orderId ? { ...o, items: newItems, total, updatedAt: now } : o
        ),
      }));
      await get().addAuditLog('order_item_removed_by_admin', `Removed sold-out item "${item.productName}" from order ${orderId.substring(0, 8)}`);
    },

    // =============================================
    // CART ACTIONS (local only, no Supabase)
    // =============================================
    addToCart: (productId) => {
      set((state) => {
        const existing = state.cart.find((c) => c.productId === productId);
        if (existing) {
          return {
            cart: state.cart.map((c) =>
              c.productId === productId ? { ...c, quantity: c.quantity + 1 } : c
            ),
          };
        }
        return {
          cart: [...state.cart, { productId, quantity: 1, notes: '' }],
        };
      });
    },

    removeFromCart: (productId) => {
      set((state) => ({
        cart: state.cart.filter((c) => c.productId !== productId),
      }));
    },

    updateCartQuantity: (productId, quantity) => {
      if (quantity <= 0) {
        get().removeFromCart(productId);
        return;
      }
      set((state) => ({
        cart: state.cart.map((c) =>
          c.productId === productId ? { ...c, quantity } : c
        ),
      }));
    },

    updateCartNotes: (productId, notes) => {
      set((state) => ({
        cart: state.cart.map((c) =>
          c.productId === productId ? { ...c, notes } : c
        ),
      }));
    },

    clearCart: () => {
      set({ cart: [] });
    },

    // =============================================
    // AUDIT
    // =============================================
    addAuditLog: async (action, details) => {
      const id = uuid();
      const timestamp = new Date().toISOString();

      const { error } = await supabase.from('audit_log').insert({
        id,
        action,
        details,
        timestamp,
      });
      if (error) { console.error('addAuditLog error:', error); return; }

      set((state) => ({
        auditLog: [{ id, action, details, timestamp }, ...state.auditLog],
      }));
    },

    // =============================================
    // GETTERS
    // =============================================
    getTableByToken: (tokenStr) => {
      const token = get().tokens.find((t) => t.token === tokenStr);
      if (!token) return undefined;
      return get().tables.find((t) => t.id === token.tableId);
    },

    getTokenByString: (tokenStr) => {
      return get().tokens.find((t) => t.token === tokenStr);
    },

    getActiveSession: (tableId) => {
      return get().sessions.find(
        (s) => s.tableId === tableId && s.isActive
      );
    },

    getOrdersForSession: (sessionId) => {
      return get().orders.filter((o) => o.sessionId === sessionId);
    },

    getOrdersForTable: (tableId) => {
      return get().orders.filter((o) => o.tableId === tableId);
    },

    getAvailableProducts: () => {
      return get().products.filter((p) => p.isAvailable && !p.isArchived);
    },

    isProductSoldOut: (productId) => {
      const product = get().products.find((p) => p.id === productId);
      return !!product && !product.isAvailable && !product.isArchived;
    },

    // =============================================
    // INIT — fetch from Supabase instead of seed
    // =============================================
    initializeSeedData: async () => {
      if (get().initialized) return;
      if (get().loading) return;
      set({ loading: true });
      await get().fetchAllData();
    },
  })
);

// Realtime subscriptions for live updates
if (typeof window !== 'undefined') {
  // Subscribe to all table changes
  const channels = [
    supabase.channel('tables-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => {
      useRestaurantStore.getState().fetchAllData();
    }).subscribe(),
    supabase.channel('tokens-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => {
      useRestaurantStore.getState().fetchAllData();
    }).subscribe(),
    supabase.channel('sessions-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
      useRestaurantStore.getState().fetchAllData();
    }).subscribe(),
    supabase.channel('products-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
      useRestaurantStore.getState().fetchAllData();
    }).subscribe(),
    supabase.channel('orders-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
      useRestaurantStore.getState().fetchAllData();
    }).subscribe(),
    supabase.channel('order-items-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
      useRestaurantStore.getState().fetchAllData();
    }).subscribe(),
    supabase.channel('audit-log-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log' }, () => {
      useRestaurantStore.getState().fetchAllData();
    }).subscribe(),
  ];
}
