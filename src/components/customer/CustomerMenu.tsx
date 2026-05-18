'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRestaurantStore } from '@/lib/store';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';
import OrderStatusComponent from './OrderStatus';
import ReceiptView from '@/components/shared/ReceiptView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, UtensilsCrossed, AlertTriangle, Utensils, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface CustomerMenuProps {
  token: string;
}

export default function CustomerMenu({ token }: CustomerMenuProps) {
  const getTokenByString = useRestaurantStore((s) => s.getTokenByString);
  const getTableByToken = useRestaurantStore((s) => s.getTableByToken);
  const getActiveSession = useRestaurantStore((s) => s.getActiveSession);
  const startSession = useRestaurantStore((s) => s.startSession);
  const products = useRestaurantStore((s) => s.products);
  const cart = useRestaurantStore((s) => s.cart);
  const createOrder = useRestaurantStore((s) => s.createOrder);
  const orders = useRestaurantStore((s) => s.orders);
  const sessions = useRestaurantStore((s) => s.sessions);
  const tables = useRestaurantStore((s) => s.tables);
  const tokens = useRestaurantStore((s) => s.tokens);
  const removeFromCart = useRestaurantStore((s) => s.removeFromCart);

  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'receipt'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);
  const sessionRef = useRef<string | null>(null);

  // Track previously known sold-out product IDs to detect newly sold-out items
  const prevSoldOutRef = useRef<Set<string>>(new Set());

  // Poll for updates (cross-tab sync + simulated real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      // Sync from Supabase (for cross-tab/real-time updates)
      useRestaurantStore.getState().syncFromStorage();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Use tokens selector to ensure re-renders when token validity changes
  const tokenObj = tokens.find((t) => t.token === token);
  const table = getTableByToken(token);

  // Check for newly sold-out items in cart and remove them with toast
  useEffect(() => {
    const currentSoldOut = new Set<string>();
    cart.forEach((cartItem) => {
      const product = products.find((p) => p.id === cartItem.productId);
      if (product && !product.isAvailable && !product.isArchived) {
        currentSoldOut.add(cartItem.productId);
        if (!prevSoldOutRef.current.has(cartItem.productId)) {
          toast.error(`${product.name} is now sold out and has been removed from your cart`);
          removeFromCart(cartItem.productId);
        }
      }
    });
    prevSoldOutRef.current = currentSoldOut;
  }, [products, cart, removeFromCart]);

  // Get or create session
  const activeSession = table ? getActiveSession(table.id) : undefined;
  const sessionId = activeSession?.id || sessionRef.current;

  const currentSession = sessionId
    ? sessions.find((s) => s.id === sessionId)
    : null;

  // A session is considered closed only if it exists AND is not active
  // AND there's no active session for the table (it might have been reopened)
  const isSessionClosed = currentSession
    ? !currentSession.isActive && !activeSession
    : false;

  useEffect(() => {
    if (tokenObj && table && tokenObj.isValid) {
      // If there's an active session, sync the ref
      if (activeSession) {
        sessionRef.current = activeSession.id;
      } else if (!sessionRef.current || (currentSession && !currentSession.isActive)) {
        // No active session - either first visit or session was closed
        // If current session is closed, clear the ref so a new one is created
        if (currentSession && !currentSession.isActive) {
          sessionRef.current = null;
        }
        // Start a new session if we don't have one
        if (!sessionRef.current) {
          startSession(table.id, tokenObj.id).then((newSessionId) => {
            sessionRef.current = newSessionId;
          });
        }
      }
    }
  }, [tokenObj, table, activeSession, startSession, currentSession]);

  const effectiveSessionId = activeSession?.id || sessionRef.current || '';

  const handleSubmitOrder = useCallback(async () => {
    if (isSubmitting) return;
    const currentCart = useRestaurantStore.getState().cart;
    if (currentCart.length === 0) return;

    setIsSubmitting(true);
    try {
      const order = await createOrder(effectiveSessionId, table?.id || '', currentCart);
      if (order) {
        toast.success('Order submitted successfully!', {
          description: `Total: €${order.total.toFixed(2)}`,
        });
        setCartOpen(false);
        setActiveTab('orders');
      } else {
        toast.error('Failed to create order. Session may be closed.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, effectiveSessionId, table, createOrder]);

  // Invalid token
  if (!tokenObj || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-900 mb-2">Invalid QR Code</h1>
          <p className="text-red-700">
            This QR code is not recognized. Please scan the QR code on your table.
          </p>
        </div>
      </div>
    );
  }

  if (!tokenObj.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-orange-900 mb-2">QR Code No Longer Valid</h1>
          <p className="text-orange-700">
            This QR code has been invalidated. Please ask your server for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Products filtering
  const availableProducts = products.filter(
    (p) => !p.isArchived
  );
  const categories = ['All', ...Array.from(new Set(availableProducts.map((p) => p.category)))];

  const filteredProducts = availableProducts.filter((p) => {
    const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-amber-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-amber-900 text-lg leading-tight">
                  Trattoria del Sole
                </h1>
                <p className="text-xs text-amber-600">{table.name}</p>
              </div>
            </div>
            {isSessionClosed && (
              <Badge variant="destructive" className="text-xs">
                Session Ended
              </Badge>
            )}
          </div>

          {/* Tab switcher — now 3 tabs */}
          <div className="flex mt-2 bg-amber-50 rounded-lg p-1">
            <button
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'menu'
                  ? 'bg-white shadow text-amber-900'
                  : 'text-amber-600'
              }`}
              onClick={() => setActiveTab('menu')}
            >
              <Utensils className="inline h-4 w-4 mr-1" />
              Menu
            </button>
            <button
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-white shadow text-amber-900'
                  : 'text-amber-600'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'receipt'
                  ? 'bg-white shadow text-amber-900'
                  : 'text-amber-600'
              }`}
              onClick={() => setActiveTab('receipt')}
            >
              <Receipt className="inline h-4 w-4 mr-1" />
              Receipt
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-4">
        {activeTab === 'menu' ? (
          <>
            {/* Search */}
            <div className="mb-3">
              <Input
                placeholder="Search menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white border-amber-200"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`whitespace-nowrap min-h-[36px] ${
                    selectedCategory === cat
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'border-amber-200 text-amber-700'
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No products found</p>
              </div>
            )}
          </>
        ) : activeTab === 'orders' ? (
          <OrderStatusComponent sessionId={effectiveSessionId} />
        ) : (
          <ReceiptView
            tableId={table.id}
            sessionId={effectiveSessionId}
            showDownload={true}
          />
        )}
      </main>

      {/* Floating cart button */}
      {cartItemCount > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            className="h-14 w-14 rounded-full shadow-lg bg-amber-600 hover:bg-amber-700 relative"
            size="icon"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-6 w-6 text-white" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-orange-500 text-white text-xs">
              {cartItemCount}
            </Badge>
          </Button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer
        open={cartOpen}
        onOpenChange={setCartOpen}
        onSubmitOrder={handleSubmitOrder}
        isSubmitting={isSubmitting}
        sessionActive={!isSessionClosed}
      />
    </div>
  );
}
