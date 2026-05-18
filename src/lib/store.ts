'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
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
import { generateSeedData } from './seed';

interface RestaurantState {
  tables: Table[];
  tokens: Token[];
  sessions: TableSession[];
  products: Product[];
  orders: Order[];
  auditLog: AuditLogEntry[];
  cart: CartItem[];
  initialized: boolean;

  // Table actions
  addTable: (name: string, number: number) => void;
  generateToken: (tableId: string) => string;
  invalidateToken: (tokenId: string) => void;
  restoreToken: (tokenId: string) => void;
  freeTable: (tableId: string) => void;

  // Session actions
  startSession: (tableId: string, tokenId: string) => string;
  closeSession: (sessionId: string) => void;

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  archiveProduct: (id: string) => void;
  markProductSoldOut: (id: string) => void;
  markProductAvailable: (id: string) => void;

  // Order actions
  createOrder: (sessionId: string, tableId: string, items: CartItem[]) => Order | null;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  removeOrderItem: (orderId: string, itemId: string) => void;

  // Cart actions
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  updateCartNotes: (productId: string, notes: string) => void;
  clearCart: () => void;

  // Audit
  addAuditLog: (action: AuditAction, details: string) => void;

  // Getters
  getTableByToken: (tokenStr: string) => Table | undefined;
  getTokenByString: (tokenStr: string) => Token | undefined;
  getActiveSession: (tableId: string) => TableSession | undefined;
  getOrdersForSession: (sessionId: string) => Order[];
  getOrdersForTable: (tableId: string) => Order[];
  getAvailableProducts: () => Product[];
  isProductSoldOut: (productId: string) => boolean;

  // Cross-tab sync
  syncFromStorage: () => void;

  // Init
  initializeSeedData: () => void;
}

export const useRestaurantStore = create<RestaurantState>()(
  persist(
    (set, get) => ({
      tables: [],
      tokens: [],
      sessions: [],
      products: [],
      orders: [],
      auditLog: [],
      cart: [],
      initialized: false,

      // Table actions
      addTable: (name: string, number: number) => {
        const table: Table = {
          id: uuid(),
          name,
          number,
          currentTokenId: null,
          currentSessionId: null,
        };
        set((state) => ({ tables: [...state.tables, table] }));
        get().addAuditLog('table_freed', `Table "${name}" (#${number}) created`);
      },

      generateToken: (tableId: string) => {
        const tokenStr = uuid().replace(/-/g, '').substring(0, 12);
        const token: Token = {
          id: uuid(),
          tableId,
          token: tokenStr,
          isValid: true,
          createdAt: new Date().toISOString(),
          invalidatedAt: null,
          restoredAt: null,
        };
        const table = get().tables.find((t) => t.id === tableId);
        set((state) => ({
          tokens: [...state.tokens, token],
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, currentTokenId: token.id } : t
          ),
        }));
        get().addAuditLog('token_created', `Token generated for ${table?.name || 'Unknown table'}: ${tokenStr}`);
        return tokenStr;
      },

      invalidateToken: (tokenId: string) => {
        const token = get().tokens.find((t) => t.id === tokenId);
        if (!token) return;
        const table = get().tables.find((t) => t.id === token.tableId);
        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.id === tokenId
              ? { ...t, isValid: false, invalidatedAt: new Date().toISOString() }
              : t
          ),
        }));
        get().addAuditLog('token_invalidated', `Token invalidated for ${table?.name || 'Unknown table'}: ${token.token}`);
      },

      restoreToken: (tokenId: string) => {
        const token = get().tokens.find((t) => t.id === tokenId);
        if (!token) return;
        const table = get().tables.find((t) => t.id === token.tableId);

        // Check if there's a closed session for this table that should be reopened
        const closedSession = get().sessions.find(
          (s) => s.tableId === token.tableId && !s.isActive && s.tokenId === tokenId
        );

        set((state) => ({
          tokens: state.tokens.map((t) =>
            t.id === tokenId
              ? { ...t, isValid: true, restoredAt: new Date().toISOString() }
              : t
          ),
          tables: state.tables.map((t) =>
            t.id === token.tableId ? { ...t, currentTokenId: tokenId } : t
          ),
          // Reopen the closed session if one exists for this token
          sessions: closedSession
            ? state.sessions.map((s) =>
                s.id === closedSession.id
                  ? { ...s, isActive: true, closedAt: null }
                  : s
              )
            : state.sessions,
        }));

        // If we reopened a session, also update the table's currentSessionId
        if (closedSession) {
          set((state) => ({
            tables: state.tables.map((t) =>
              t.id === token.tableId ? { ...t, currentSessionId: closedSession.id } : t
            ),
          }));
        }

        get().addAuditLog('token_restored', `Token restored for ${table?.name || 'Unknown table'}: ${token.token}${closedSession ? ' (session reopened)' : ''}`);
      },

      freeTable: (tableId: string) => {
        const table = get().tables.find((t) => t.id === tableId);
        if (!table) return;

        // Close active session if any
        if (table.currentSessionId) {
          get().closeSession(table.currentSessionId);
        }

        set((state) => ({
          tables: state.tables.map((t) =>
            t.id === tableId
              ? { ...t, currentTokenId: null, currentSessionId: null }
              : t
          ),
        }));
        get().addAuditLog('table_freed', `Table "${table.name}" freed`);
      },

      // Session actions
      startSession: (tableId: string, tokenId: string) => {
        const session: TableSession = {
          id: uuid(),
          tableId,
          tokenId,
          startedAt: new Date().toISOString(),
          closedAt: null,
          isActive: true,
        };
        const table = get().tables.find((t) => t.id === tableId);
        set((state) => ({
          sessions: [...state.sessions, session],
          tables: state.tables.map((t) =>
            t.id === tableId ? { ...t, currentSessionId: session.id } : t
          ),
        }));
        get().addAuditLog('table_session_started', `Session started for ${table?.name || 'Unknown table'}`);
        return session.id;
      },

      closeSession: (sessionId: string) => {
        const session = get().sessions.find((s) => s.id === sessionId);
        if (!session) return;
        const table = get().tables.find((t) => t.id === session.tableId);
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? { ...s, isActive: false, closedAt: new Date().toISOString() }
              : s
          ),
          tables: state.tables.map((t) =>
            t.id === session.tableId && t.currentSessionId === sessionId
              ? { ...t, currentSessionId: null }
              : t
          ),
        }));
        get().addAuditLog('table_session_closed', `Session closed for ${table?.name || 'Unknown table'}`);
      },

      // Product actions
      addProduct: (product) => {
        const now = new Date().toISOString();
        const newProduct: Product = {
          ...product,
          id: uuid(),
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ products: [...state.products, newProduct] }));
        get().addAuditLog('product_created', `Product created: ${product.name}`);
      },

      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
        }));
        const product = get().products.find((p) => p.id === id);
        get().addAuditLog('product_updated', `Product updated: ${product?.name || id}`);
      },

      archiveProduct: (id) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, isArchived: true, updatedAt: new Date().toISOString() } : p
          ),
        }));
        const product = get().products.find((p) => p.id === id);
        get().addAuditLog('product_archived', `Product archived: ${product?.name || id}`);
      },

      markProductSoldOut: (id) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, isAvailable: false, updatedAt: new Date().toISOString() } : p
          ),
          // Remove from cart if present (same-tab removal)
          cart: state.cart.filter((c) => c.productId !== id),
        }));
        const product = get().products.find((p) => p.id === id);
        get().addAuditLog('product_marked_sold_out', `Product marked sold out: ${product?.name || id}`);
      },

      markProductAvailable: (id) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, isAvailable: true, updatedAt: new Date().toISOString() } : p
          ),
        }));
        const product = get().products.find((p) => p.id === id);
        get().addAuditLog('product_marked_available', `Product marked available: ${product?.name || id}`);
      },

      // Order actions
      createOrder: (sessionId, tableId, items) => {
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

        const order: Order = {
          id: uuid(),
          sessionId,
          tableId,
          items: orderItems,
          status: 'pending',
          total,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          orders: [...state.orders, order],
          cart: [],
        }));
        const table = get().tables.find((t) => t.id === tableId);
        get().addAuditLog('order_created', `Order created for ${table?.name || 'Unknown table'} - €${total.toFixed(2)}`);
        return order;
      },

      updateOrderStatus: (orderId, status) => {
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o
          ),
        }));
        get().addAuditLog('order_status_changed', `Order ${orderId.substring(0, 8)} status changed to ${status}`);
      },

      removeOrderItem: (orderId, itemId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;

        const item = order.items.find((i) => i.id === itemId);
        if (!item) return;

        // Only allow removal if product is currently sold out
        const product = get().products.find((p) => p.id === item.productId);
        if (!product || product.isAvailable) return;

        const newItems = order.items.filter((i) => i.id !== itemId);
        const total = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId ? { ...o, items: newItems, total, updatedAt: new Date().toISOString() } : o
          ),
        }));
        get().addAuditLog('order_item_removed_by_admin', `Removed sold-out item "${item.productName}" from order ${orderId.substring(0, 8)}`);
      },

      // Cart actions
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

      // Audit
      addAuditLog: (action, details) => {
        const entry: AuditLogEntry = {
          id: uuid(),
          action,
          details,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          auditLog: [...state.auditLog, entry],
        }));
      },

      // Getters
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

      // Cross-tab sync: re-read persisted state from localStorage
      syncFromStorage: () => {
        try {
          const raw = localStorage.getItem('restaurant-store');
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (parsed?.state) {
            const syncedState = parsed.state;
            // Only sync shared data (not cart - cart is per-session/per-tab)
            set({
              tables: syncedState.tables || [],
              tokens: syncedState.tokens || [],
              sessions: syncedState.sessions || [],
              products: syncedState.products || [],
              orders: syncedState.orders || [],
              auditLog: syncedState.auditLog || [],
              initialized: syncedState.initialized ?? true,
            });
          }
        } catch {
          // Ignore parse errors
        }
      },

      initializeSeedData: () => {
        if (get().initialized) return;
        const seed = generateSeedData();
        set({
          tables: seed.tables,
          tokens: seed.tokens,
          products: seed.products,
          sessions: [],
          orders: [],
          auditLog: [],
          cart: [],
          initialized: true,
        });
      },
    }),
    {
      name: 'restaurant-store',
      storage: createJSONStorage(() => {
        try {
          return localStorage;
        } catch {
          // Fallback for SSR
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
      }),
      partialize: (state) => ({
        tables: state.tables,
        tokens: state.tokens,
        sessions: state.sessions,
        products: state.products,
        orders: state.orders,
        auditLog: state.auditLog,
        initialized: state.initialized,
      }),
    }
  )
);

// Cross-tab sync: listen for localStorage changes from other tabs
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'restaurant-store' && e.newValue) {
      useRestaurantStore.getState().syncFromStorage();
    }
  });
}
