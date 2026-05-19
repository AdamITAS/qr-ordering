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
    spiceLevel: row.spiceLevel ?? 0,
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
  lastOrderCount: number;

  // Table actions
  addTable: (name: string, number: number) => Promise<void>;
  generateToken: (tableId: string) => Promise<string>;
  invalidateToken: (tokenId: string) => Promise<void>;
  restoreToken: (tokenId: string) => Promise<void>;
  freeTable: (tableId: string) => Promise<void>;
  payAndFreeTable: (tableId: string) => Promise<void>;

  // Session actions
  startSession: (tableId: string, tokenId: string) => Promise<string>;
  closeSession: (sessionId: string) => Promise<void>;
  markSessionInactive: (sessionId: string) => Promise<void>;
  reactivateSession: (sessionId: string) => Promise<void>;

  // Auto-connect: when customer scans QR for a table number
  autoConnectTable: (tableNumber: number) => Promise<{ tableId: string; sessionId: string; token: string } | null>;

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isArchived'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  archiveProduct: (id: string) => Promise<void>;
  unarchiveProduct: (id: string) => Promise<void>;
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
  getInactiveSession: (tableId: string) => TableSession | undefined;
  getSessionStatus: (session: TableSession) => 'active' | 'inactive' | 'closed';
  getOrdersForSession: (sessionId: string) => Order[];
  getOrdersForTable: (tableId: string) => Order[];
  getAvailableProducts: () => Product[];
  isProductSoldOut: (productId: string) => boolean;
  getTableByNumber: (number: number) => Table | undefined;

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
    lastOrderCount: 0,

    // =============================================
    // FETCH ALL DATA FROM SUPABASE
    // =============================================
    fetchAllData: async () => {
      if (fetchInProgress) return;
      fetchInProgress = true;
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

        const rawTokens = (tokensRes.data || []).map(rowToToken);
        const tokenMap = new Map<string, Token>();
        for (const t of rawTokens) {
          const existing = tokenMap.get(t.token);
          if (!existing || t.createdAt > existing.createdAt) {
            tokenMap.set(t.token, t);
          }
        }
        const dedupedTokens = Array.from(tokenMap.values());

        const orders = (ordersRes.data || []).map((row) => {
          const itemsForOrder = (itemsRes.data || [])
            .filter((r: any) => r.orderId === row.id)
            .map(rowToOrderItem);
          return rowToOrder(row, itemsForOrder);
        });

        // Sound notification: detect new orders
        const prevCount = get().lastOrderCount;
        const newCount = orders.filter((o: Order) => o.status === 'pending').length;
        if (prevCount > 0 && newCount > prevCount) {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('new-order-sound'));
          }
        }

        set({
          tables: (tablesRes.data || []).map(rowToTable),
          tokens: dedupedTokens,
          sessions: (sessionsRes.data || []).map(rowToSession),
          products: (productsRes.data || []).map(rowToProduct),
          orders,
          auditLog: (auditRes.data || []).map(rowToAuditLog),
          lastOrderCount: newCount,
          initialized: true,
          loading: false,
        });
      } catch (err) {
        console.error('Failed to fetch data from Supabase:', err);
        set({ loading: false });
      } finally {
        fetchInProgress = false;
      }
    },

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

      const { error } = await supabase.from('tokens').update({
        isValid: true,
        restoredAt: now,
      }).eq('id', tokenId);
      if (error) { console.error('restoreToken error:', error); return; }

      await supabase.from('tables').update({ currentTokenId: tokenId }).eq('id', token.tableId);

      set((state) => ({
        tokens: state.tokens.map((t) =>
          t.id === tokenId ? { ...t, isValid: true, restoredAt: now } : t
        ),
        tables: state.tables.map((t) =>
          t.id === token.tableId
            ? { ...t, currentTokenId: tokenId }
            : t
        ),
      }));

      await get().addAuditLog('token_restored', `Token restored for ${table?.name || 'Unknown table'}: ${token.token}`);
    },

    freeTable: async (tableId: string) => {
      const table = get().tables.find((t) => t.id === tableId);
      if (!table) return;
      const now = new Date().toISOString();

      // Close active session
      if (table.currentSessionId) {
        await supabase.from('sessions').update({ isActive: false, closedAt: now }).eq('id', table.currentSessionId);
      }

      // Invalidate current token
      if (table.currentTokenId) {
        await supabase.from('tokens').update({ isValid: false, invalidatedAt: now }).eq('id', table.currentTokenId);
      }

      // Clear table references
      const { error } = await supabase.from('tables').update({
        currentTokenId: null,
        currentSessionId: null,
      }).eq('id', tableId);
      if (error) { console.error('freeTable error:', error); return; }

      set((state) => ({
        tables: state.tables.map((t) =>
          t.id === tableId ? { ...t, currentTokenId: null, currentSessionId: null } : t
        ),
        sessions: table.currentSessionId
          ? state.sessions.map((s) =>
              s.id === table.currentSessionId ? { ...s, isActive: false, closedAt: now } : s
            )
          : state.sessions,
        tokens: table.currentTokenId
          ? state.tokens.map((t) =>
              t.id === table.currentTokenId ? { ...t, isValid: false, invalidatedAt: now } : t
            )
          : state.tokens,
      }));
      await get().addAuditLog('table_freed', `Table "${table.name}" freed`);
    },

    // "Pagato" — marks as paid, closes session, frees table
    payAndFreeTable: async (tableId: string) => {
      const table = get().tables.find((t) => t.id === tableId);
      if (!table) return;
      const now = new Date().toISOString();

      // Close active session
      if (table.currentSessionId) {
        await supabase.from('sessions').update({ isActive: false, closedAt: now }).eq('id', table.currentSessionId);
      }

      // Invalidate current token
      if (table.currentTokenId) {
        await supabase.from('tokens').update({ isValid: false, invalidatedAt: now }).eq('id', table.currentTokenId);
      }

      // Clear table references
      const { error } = await supabase.from('tables').update({
        currentTokenId: null,
        currentSessionId: null,
      }).eq('id', tableId);
      if (error) { console.error('payAndFreeTable error:', error); return; }

      set((state) => ({
        tables: state.tables.map((t) =>
          t.id === tableId ? { ...t, currentTokenId: null, currentSessionId: null } : t
        ),
        sessions: table.currentSessionId
          ? state.sessions.map((s) =>
              s.id === table.currentSessionId ? { ...s, isActive: false, closedAt: now } : s
            )
          : state.sessions,
        tokens: table.currentTokenId
          ? state.tokens.map((t) =>
              t.id === table.currentTokenId ? { ...t, isValid: false, invalidatedAt: now } : t
            )
          : state.tokens,
      }));
      await get().addAuditLog('table_paid', `Table "${table.name}" paid and freed`);
    },

    // =============================================
    // SESSION ACTIONS
    // =============================================
    startSession: async (tableId: string, tokenId: string) => {
      const id = uuid();
      const now = new Date().toISOString();
      const table = get().tables.find((t) => t.id === tableId);

      const existingActive = get().sessions.find(
        (s) => s.tableId === tableId && s.isActive
      );
      if (existingActive) {
        return existingActive.id;
      }

      const { error } = await supabase.from('sessions').insert({
        id,
        tableId,
        tokenId,
        startedAt: now,
        closedAt: null,
        isActive: true,
      });
      if (error) { console.error('startSession error:', error); return ''; }

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

    // Mark session as inactive (customer left page but didn't close)
    markSessionInactive: async (sessionId: string) => {
      const session = get().sessions.find((s) => s.id === sessionId);
      if (!session || !session.isActive) return;

      const table = get().tables.find((t) => t.id === session.tableId);

      // Set isActive = false but DON'T set closedAt (this distinguishes inactive from closed)
      const { error } = await supabase.from('sessions').update({
        isActive: false,
      }).eq('id', sessionId);
      if (error) { console.error('markSessionInactive error:', error); return; }

      // Clear table's currentSessionId
      if (table?.currentSessionId === sessionId) {
        await supabase.from('tables').update({ currentSessionId: null }).eq('id', session.tableId);
      }

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, isActive: false } : s
        ),
        tables: state.tables.map((t) =>
          t.id === session.tableId && t.currentSessionId === sessionId
            ? { ...t, currentSessionId: null }
            : t
        ),
      }));
      await get().addAuditLog('table_session_inactive', `Session for ${table?.name || 'Unknown table'} marked inactive (customer left)`);
    },

    // Reactivate an inactive session (customer returned)
    reactivateSession: async (sessionId: string) => {
      const session = get().sessions.find((s) => s.id === sessionId);
      if (!session || session.isActive || session.closedAt) return;

      const table = get().tables.find((t) => t.id === session.tableId);

      const { error } = await supabase.from('sessions').update({
        isActive: true,
      }).eq('id', sessionId);
      if (error) { console.error('reactivateSession error:', error); return; }

      // Re-set table's currentSessionId
      await supabase.from('tables').update({ currentSessionId: sessionId }).eq('id', session.tableId);

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, isActive: true } : s
        ),
        tables: state.tables.map((t) =>
          t.id === session.tableId
            ? { ...t, currentSessionId: sessionId }
            : t
        ),
      }));
      await get().addAuditLog('table_session_reactivated', `Session for ${table?.name || 'Unknown table'} reactivated (customer returned)`);
    },

    // =============================================
    // AUTO-CONNECT: Customer scans QR for a table number
    // =============================================
    autoConnectTable: async (tableNumber: number) => {
      const table = get().tables.find((t) => t.number === tableNumber);
      if (!table) return null;

      // Check if table has an active session
      const activeSession = get().sessions.find(
        (s) => s.tableId === table.id && s.isActive
      );
      if (activeSession) {
        // Reconnect to existing session
        const token = get().tokens.find((t) => t.id === activeSession.tokenId);
        if (token && token.isValid) {
          return { tableId: table.id, sessionId: activeSession.id, token: token.token };
        }
        // Token invalid but session active — generate new token for same session
        const newTokenStr = await get().generateToken(table.id);
        // Update session's tokenId to new token
        await supabase.from('sessions').update({ tokenId: get().tokens.find(t => t.token === newTokenStr)?.id || activeSession.tokenId }).eq('id', activeSession.id);
        return { tableId: table.id, sessionId: activeSession.id, token: newTokenStr };
      }

      // Check for inactive session (customer left and came back)
      const inactiveSession = get().sessions.find(
        (s) => s.tableId === table.id && !s.isActive && !s.closedAt
      );
      if (inactiveSession) {
        // Reactivate the session
        await get().reactivateSession(inactiveSession.id);
        const token = get().tokens.find((t) => t.id === inactiveSession.tokenId);
        if (token) {
          // Restore token if needed
          if (!token.isValid) {
            await get().restoreToken(token.id);
          }
          return { tableId: table.id, sessionId: inactiveSession.id, token: token.token };
        }
        // Generate new token if old one is gone
        const newTokenStr = await get().generateToken(table.id);
        const newToken = get().tokens.find(t => t.token === newTokenStr);
        if (newToken) {
          await supabase.from('sessions').update({ tokenId: newToken.id }).eq('id', inactiveSession.id);
        }
        return { tableId: table.id, sessionId: inactiveSession.id, token: newTokenStr };
      }

      // No active or inactive session — create new one
      const tokenStr = await get().generateToken(table.id);
      const newToken = get().tokens.find(t => t.token === tokenStr);
      if (!newToken) return null;

      const sessionId = await get().startSession(table.id, newToken.id);
      if (!sessionId) return null;

      return { tableId: table.id, sessionId, token: tokenStr };
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
        spiceLevel: product.spiceLevel || 0,
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

    unarchiveProduct: async (id) => {
      const now = new Date().toISOString();
      const { error } = await supabase.from('products').update({ isArchived: false, updatedAt: now }).eq('id', id);
      if (error) { console.error('unarchiveProduct error:', error); return; }

      set((state) => ({
        products: state.products.map((p) =>
          p.id === id ? { ...p, isArchived: false, updatedAt: now } : p
        ),
      }));
      const product = get().products.find((p) => p.id === id);
      await get().addAuditLog('product_updated', `Product unarchived: ${product?.name || id}`);
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
        lastOrderCount: state.lastOrderCount + 1,
      }));

      const table = get().tables.find((t) => t.id === tableId);
      await get().addAuditLog('order_created', `Order created for ${table?.name || 'Unknown table'} - \u20AC${total.toFixed(2)}`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('new-order-sound'));
      }

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

      const product = get().products.find((p) => p.id === item.productId);
      if (!product || product.isAvailable) return;

      const { error } = await supabase.from('order_items').delete().eq('id', itemId);
      if (error) { console.error('removeOrderItem error:', error); return; }

      const newItems = order.items.filter((i) => i.id !== itemId);
      const total = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const now = new Date().toISOString();

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

    getInactiveSession: (tableId) => {
      return get().sessions.find(
        (s) => s.tableId === tableId && !s.isActive && !s.closedAt
      );
    },

    getSessionStatus: (session) => {
      if (session.isActive) return 'active';
      if (session.closedAt) return 'closed';
      return 'inactive';
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

    getTableByNumber: (number) => {
      return get().tables.find((t) => t.number === number);
    },

    // =============================================
    // INIT
    // =============================================
    initializeSeedData: async () => {
      if (get().initialized) return;
      if (get().loading) return;
      set({ loading: true });
      await get().fetchAllData();
    },
  })
);

// Debounce Realtime refetches
let realtimeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let fetchInProgress = false;

function scheduleRefetch() {
  if (realtimeDebounceTimer) clearTimeout(realtimeDebounceTimer);
  realtimeDebounceTimer = setTimeout(() => {
    if (!fetchInProgress) {
      useRestaurantStore.getState().fetchAllData();
    }
  }, 600);
}

// Realtime subscriptions
if (typeof window !== 'undefined') {
  const tables = ['tables', 'tokens', 'sessions', 'products', 'orders', 'order_items', 'audit_log'];
  tables.forEach((table) => {
    supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        scheduleRefetch();
      })
      .subscribe();
  });
}
