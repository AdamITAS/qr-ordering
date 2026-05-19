'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRestaurantStore } from '@/lib/store';
import ProductCard from './ProductCard';
import CartDrawer from './CartDrawer';
import OrderStatusComponent from './OrderStatus';
import ReceiptView from '@/components/shared/ReceiptView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, UtensilsCrossed, AlertTriangle, Utensils, Receipt, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface CustomerMenuProps {
  tableNumber: number;
}

export default function CustomerMenu({ tableNumber }: CustomerMenuProps) {
  const autoConnectTable = useRestaurantStore((s) => s.autoConnectTable);
  const products = useRestaurantStore((s) => s.products);
  const cart = useRestaurantStore((s) => s.cart);
  const createOrder = useRestaurantStore((s) => s.createOrder);
  const orders = useRestaurantStore((s) => s.orders);
  const sessions = useRestaurantStore((s) => s.sessions);
  const tables = useRestaurantStore((s) => s.tables);
  const tokens = useRestaurantStore((s) => s.tokens);
  const markSessionInactive = useRestaurantStore((s) => s.markSessionInactive);
  const reactivateSession = useRestaurantStore((s) => s.reactivateSession);
  const removeFromCart = useRestaurantStore((s) => s.removeFromCart);

  const [cartOpen, setCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders' | 'receipt'>('menu');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setTick] = useState(0);
  const [connecting, setConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  // Store connected session info
  const [connectedSessionId, setConnectedSessionId] = useState<string>('');
  const [connectedTableId, setConnectedTableId] = useState<string>('');
  const [connectedToken, setConnectedToken] = useState<string>('');

  const prevSoldOutRef = useRef<Set<string>>(new Set());

  // Find the table by number
  const table = tables.find(t => t.number === tableNumber);

  // Auto-connect on mount
  useEffect(() => {
    const connect = async () => {
      setConnecting(true);
      setConnectionError(false);
      try {
        // First connection counts as QR scan if we have a table number in URL
        // (the only way to get here is by scanning QR)
        const result = await autoConnectTable(tableNumber, true);
        if (result) {
          setConnectedTableId(result.tableId);
          setConnectedSessionId(result.sessionId);
          setConnectedToken(result.token);
        } else {
          setConnectionError(true);
        }
      } catch {
        setConnectionError(true);
      }
      setConnecting(false);
    };
    connect();
  }, [tableNumber, autoConnectTable]);

  // Visibility change: mark session inactive/active when customer leaves/returns
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!connectedSessionId) return;

      if (document.visibilityState === 'hidden') {
        // Customer left the page — mark as inactive (but don't close)
        await markSessionInactive(connectedSessionId);
      } else if (document.visibilityState === 'visible') {
        // Customer came back — reactivate
        const session = sessions.find(s => s.id === connectedSessionId);
        if (session && !session.isActive && !session.closedAt) {
          await reactivateSession(connectedSessionId);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connectedSessionId, markSessionInactive, reactivateSession, sessions]);

  // Also handle beforeunload (tab close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (connectedSessionId) {
        // Best effort — use sendBeacon for reliability
        const session = sessions.find(s => s.id === connectedSessionId);
        if (session && session.isActive) {
          // We use navigator.sendBeacon for reliability on page close
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
          if (supabaseUrl && supabaseKey) {
            const payload = JSON.stringify({
              isActive: false,
            });
            navigator.sendBeacon(
              `${supabaseUrl}/rest/v1/sessions?id=eq.${connectedSessionId}`,
              payload
            );
          }
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [connectedSessionId, sessions]);

  // Poll for updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      useRestaurantStore.getState().syncFromStorage();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Check for sold-out items in cart
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

  // Get session status
  const currentSession = sessions.find(s => s.id === connectedSessionId);
  const isSessionClosed = currentSession ? !!currentSession.closedAt : false;
  const isSessionInactive = currentSession ? !currentSession.isActive && !currentSession.closedAt : false;

  const effectiveSessionId = connectedSessionId;

  const handleSubmitOrder = useCallback(async () => {
    if (isSubmitting) return;
    const currentCart = useRestaurantStore.getState().cart;
    if (currentCart.length === 0) return;

    setIsSubmitting(true);
    try {
      const order = await createOrder(effectiveSessionId, connectedTableId, currentCart);
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
  }, [isSubmitting, effectiveSessionId, connectedTableId, createOrder]);

  // Connecting state
  if (connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-600/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <UtensilsCrossed className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Connecting...</h1>
          <p className="text-zinc-400">Setting up your table</p>
        </div>
      </div>
    );
  }

  // Connection error
  if (connectionError || !table) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-900/50 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Session Ended</h1>
          <p className="text-zinc-400">
            {!table
              ? `Table #${tableNumber} doesn't exist. Please ask your server for assistance.`
              : 'Your session has been closed. Please scan the QR code on your table to start a new session.'}
          </p>
        </div>
      </div>
    );
  }

  // Session closed
  if (isSessionClosed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
            <Receipt className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Session Ended</h1>
          <p className="text-zinc-400 mb-4">
            Your session has been closed. Thank you for dining with us!
          </p>
          <ReceiptView
            tableId={connectedTableId}
            sessionId={effectiveSessionId}
            showDownload={true}
          />
        </div>
      </div>
    );
  }

  // Products filtering
  const availableProducts = products.filter((p) => !p.isArchived);
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
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-lg leading-tight">
                  Trattoria del Sole
                </h1>
                <p className="text-xs text-amber-500">{table.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isSessionInactive && (
                <Badge variant="outline" className="bg-zinc-800 text-zinc-400 border-zinc-600 text-xs">
                  <WifiOff className="h-3 w-3 mr-1" />
                  Reconnecting...
                </Badge>
              )}
              {!isSessionInactive && (
                <Badge variant="outline" className="bg-emerald-900/50 text-emerald-400 border-emerald-700 text-xs">
                  <Wifi className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex mt-3 bg-zinc-800 rounded-lg p-1">
            <button
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'menu'
                  ? 'bg-zinc-700 text-white shadow'
                  : 'text-zinc-400'
              }`}
              onClick={() => setActiveTab('menu')}
            >
              <Utensils className="inline h-4 w-4 mr-1" />
              Menu
            </button>
            <button
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-zinc-700 text-white shadow'
                  : 'text-zinc-400'
              }`}
              onClick={() => setActiveTab('orders')}
            >
              Orders
            </button>
            <button
              className={`flex-1 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'receipt'
                  ? 'bg-zinc-700 text-white shadow'
                  : 'text-zinc-400'
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
                className="bg-zinc-900 border-zinc-700 text-white h-11"
              />
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-4">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  size="sm"
                  className={`whitespace-nowrap min-h-[40px] text-sm ${
                    selectedCategory === cat
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'border-zinc-700 text-zinc-300'
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
              <div className="text-center py-12 text-zinc-500">
                <p>No products found</p>
              </div>
            )}
          </>
        ) : activeTab === 'orders' ? (
          <OrderStatusComponent sessionId={effectiveSessionId} />
        ) : (
          <ReceiptView
            tableId={connectedTableId}
            sessionId={effectiveSessionId}
            showDownload={true}
          />
        )}
      </main>

      {/* Floating cart button */}
      {cartItemCount > 0 && activeTab === 'menu' && (
        <div className="fixed bottom-6 right-6 z-40">
          <Button
            className="h-16 w-16 rounded-full shadow-lg shadow-amber-600/30 bg-amber-600 hover:bg-amber-700 relative"
            size="icon"
            onClick={() => setCartOpen(true)}
          >
            <ShoppingCart className="h-7 w-7 text-white" />
            <Badge className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 bg-red-500 text-white text-xs font-bold">
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
        sessionActive={!isSessionClosed && !isSessionInactive}
      />
    </div>
  );
}
