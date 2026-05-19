'use client';

import { useState, useEffect } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import OrderDetailModal from './OrderDetailModal';
import ReceiptView from '@/components/shared/ReceiptView';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Receipt, ChevronDown, ChevronUp, UtensilsCrossed, History, ShoppingCart } from 'lucide-react';
import type { Order, OrderStatus, TableSession } from '@/lib/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  confirmed: 'bg-blue-900/50 text-blue-400 border-blue-700',
  preparing: 'bg-orange-900/50 text-orange-400 border-orange-700',
  ready: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
  delivered: 'bg-zinc-800 text-zinc-500 border-zinc-600',
  cancelled: 'bg-red-900/50 text-red-400 border-red-700',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusFlow: OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered',
];

export default function OrdersTab() {
  const orders = useRestaurantStore((s) => s.orders);
  const tables = useRestaurantStore((s) => s.tables);
  const products = useRestaurantStore((s) => s.products);
  const sessions = useRestaurantStore((s) => s.sessions);
  const updateOrderStatus = useRestaurantStore((s) => s.updateOrderStatus);
  const removeOrderItem = useRestaurantStore((s) => s.removeOrderItem);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTableId, setReceiptTableId] = useState('');
  const [receiptSessionId, setReceiptSessionId] = useState('');
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 3000);
    const syncInterval = setInterval(() => {
      useRestaurantStore.getState().syncFromStorage();
    }, 5000);
    return () => { clearInterval(interval); clearInterval(syncInterval); };
  }, []);

  // Separate orders by session status
  const activeSessionIds = new Set(sessions.filter((s) => s.isActive).map((s) => s.id));
  const inactiveSessionIds = new Set(sessions.filter((s) => !s.isActive && !s.closedAt).map((s) => s.id));
  const closedSessionIds = new Set(sessions.filter((s) => s.closedAt).map((s) => s.id));

  // Active orders: from active or inactive sessions
  const openSessionIds = new Set([...activeSessionIds, ...inactiveSessionIds]);
  const activeOrders = orders.filter((o) => openSessionIds.has(o.sessionId));
  const historyOrders = orders.filter((o) => closedSessionIds.has(o.sessionId));

  const displayOrders = viewMode === 'active' ? activeOrders : historyOrders;

  const filteredOrders = displayOrders
    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group by SESSION, not table — this is the key fix for the history bug
  const ordersBySession = new Map<string, { session: TableSession | undefined; orders: Order[] }>();
  filteredOrders.forEach((order) => {
    const existing = ordersBySession.get(order.sessionId);
    if (existing) {
      existing.orders.push(order);
    } else {
      const session = sessions.find(s => s.id === order.sessionId);
      ordersBySession.set(order.sessionId, { session, orders: [order] });
    }
  });

  // Sort sessions: most recent order first
  const sortedSessionIds = Array.from(ordersBySession.keys()).sort((a, b) => {
    const aOrders = ordersBySession.get(a)?.orders || [];
    const bOrders = ordersBySession.get(b)?.orders || [];
    const aLatest = Math.max(...aOrders.map((o) => new Date(o.createdAt).getTime()));
    const bLatest = Math.max(...bOrders.map((o) => new Date(o.createdAt).getTime()));
    return bLatest - aLatest;
  });

  const activeStatusCounts: Record<string, number> = {
    all: activeOrders.length,
    pending: activeOrders.filter((o) => o.status === 'pending').length,
    confirmed: activeOrders.filter((o) => o.status === 'confirmed').length,
    preparing: activeOrders.filter((o) => o.status === 'preparing').length,
    ready: activeOrders.filter((o) => o.status === 'ready').length,
    delivered: activeOrders.filter((o) => o.status === 'delivered').length,
    cancelled: activeOrders.filter((o) => o.status === 'cancelled').length,
  };

  const handleOpenDetail = (order: Order) => {
    setDetailOrder(order);
    setDetailOpen(true);
  };

  const handleOpenReceipt = (tableId: string, sessionId: string) => {
    setReceiptTableId(tableId);
    setReceiptSessionId(sessionId);
    setReceiptOpen(true);
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Active / History toggle */}
      <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 h-12 rounded-none text-base ${
            viewMode === 'active'
              ? 'bg-amber-600 text-white hover:bg-amber-700 hover:text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
          onClick={() => { setViewMode('active'); setStatusFilter('all'); }}
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          Active
          {activeOrders.length > 0 && (
            <Badge className="ml-1.5 h-5 min-w-[20px] text-xs bg-white/20 text-white border-0">
              {activeOrders.length}
            </Badge>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 h-12 rounded-none text-base ${
            viewMode === 'history'
              ? 'bg-zinc-600 text-white hover:bg-zinc-700 hover:text-white'
              : 'text-zinc-400 hover:text-white'
          }`}
          onClick={() => { setViewMode('history'); setStatusFilter('all'); }}
        >
          <History className="h-4 w-4 mr-1.5" />
          History
          {historyOrders.length > 0 && (
            <Badge className="ml-1.5 h-5 min-w-[20px] text-xs bg-white/20 text-white border-0">
              {historyOrders.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {['all', 'pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map(
          (s) => {
            const counts = viewMode === 'active' ? activeStatusCounts : {
              all: historyOrders.length,
              pending: historyOrders.filter((o) => o.status === 'pending').length,
              confirmed: historyOrders.filter((o) => o.status === 'confirmed').length,
              preparing: historyOrders.filter((o) => o.status === 'preparing').length,
              ready: historyOrders.filter((o) => o.status === 'ready').length,
              delivered: historyOrders.filter((o) => o.status === 'delivered').length,
              cancelled: historyOrders.filter((o) => o.status === 'cancelled').length,
            };
            return (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                className={`whitespace-nowrap min-h-[40px] text-sm ${
                  statusFilter === s
                    ? viewMode === 'active'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-zinc-600 hover:bg-zinc-700 text-white'
                    : 'border-zinc-700 text-zinc-400'
                }`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'all' ? 'All' : statusLabels[s]}
                {counts[s] > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1.5 h-5 min-w-[20px] text-xs"
                  >
                    {counts[s]}
                  </Badge>
                )}
              </Button>
            );
          }
        )}
      </div>

      {/* Orders grouped by SESSION */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <p>{viewMode === 'active' ? 'No active orders' : 'No order history'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedSessionIds.map((sessionId) => {
            const sessionData = ordersBySession.get(sessionId);
            if (!sessionData) return null;
            const { session, orders: sessionOrders } = sessionData;
            const table = tables.find((t) => t.id === session?.tableId);
            const isExpanded = expandedSessions.has(sessionId);

            const sessionTotal = sessionOrders.reduce((sum, o) => sum + o.total, 0);
            const hasPending = sessionOrders.some((o) => o.status === 'pending');
            const isActive = session?.isActive;
            const isInactive = session && !session.isActive && !session.closedAt;

            // Session timestamp for display
            const sessionTime = session?.startedAt
              ? format(new Date(session.startedAt), 'HH:mm')
              : '';

            return (
              <div key={sessionId} className="space-y-0">
                {/* Session group header */}
                <div
                  className={`flex items-center justify-between p-4 rounded-t-xl border-2 cursor-pointer select-none ${
                    hasPending
                      ? 'bg-amber-900/20 border-amber-600/50'
                      : viewMode === 'active'
                      ? 'bg-zinc-900 border-zinc-800'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                  onClick={() => toggleSession(sessionId)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      viewMode === 'active' ? 'bg-amber-600' : 'bg-zinc-700'
                    }`}>
                      <UtensilsCrossed className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">
                        {table?.name || 'Unknown Table'}
                      </h3>
                      <p className="text-xs text-zinc-500">
                        {sessionOrders.length} order{sessionOrders.length !== 1 ? 's' : ''} — Total: <span className="font-semibold text-amber-400">&euro;{sessionTotal.toFixed(2)}</span>
                        {sessionTime && <span className="ml-2">Started {sessionTime}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPending && (
                      <Badge className="bg-red-600 text-white text-xs animate-order-pulse">
                        New Order
                      </Badge>
                    )}
                    {isActive && (
                      <Badge className="bg-emerald-900/50 text-emerald-400 text-xs border-emerald-700">
                        Active
                      </Badge>
                    )}
                    {isInactive && (
                      <Badge className="bg-zinc-800 text-zinc-400 text-xs border-zinc-600">
                        Inactive
                      </Badge>
                    )}
                    {viewMode === 'history' && (
                      <Badge className="bg-zinc-800 text-zinc-500 text-xs border-zinc-600">
                        Closed
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-zinc-500" />
                    )}
                  </div>
                </div>

                {/* Expanded: orders for this session */}
                {isExpanded && (
                  <div className="space-y-2 border-x-2 border-b-2 border-zinc-800 rounded-b-xl p-3 bg-zinc-900/50">
                    {sessionOrders.map((order) => {
                      const currentStatusIdx = statusFlow.indexOf(order.status);
                      const isTerminal = order.status === 'delivered' || order.status === 'cancelled';

                      return (
                        <Card
                          key={order.id}
                          className={`cursor-pointer hover:border-amber-600/30 transition-colors bg-zinc-900 border-zinc-800 ${
                            order.status === 'pending' ? 'ring-1 ring-amber-500/50' : ''
                          }`}
                          onClick={() => handleOpenDetail(order)}
                        >
                          <CardHeader className="pb-2 pt-3 px-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <CardTitle className="text-sm font-medium text-white">
                                #{order.id.substring(0, 8)}
                              </CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={statusColors[order.status]}
                                >
                                  {statusLabels[order.status]}
                                </Badge>
                                <span className="text-xs text-zinc-500">
                                  {format(new Date(order.createdAt), 'HH:mm')}
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="px-4 pb-3">
                            <div className="space-y-1 mb-2">
                              {order.items.map((item) => {
                                const product = products.find(
                                  (p) => p.id === item.productId
                                );
                                const isSoldOut =
                                  product &&
                                  !product.isAvailable &&
                                  !product.isArchived;

                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="flex items-center gap-1.5 text-zinc-300">
                                      {item.quantity}&times; {item.productName}
                                      {item.notes && (
                                        <span className="text-xs text-zinc-500">
                                          ({item.notes})
                                        </span>
                                      )}
                                      {isSoldOut && (
                                        <Badge
                                          variant="destructive"
                                          className="text-[10px] h-4"
                                        >
                                          Sold Out
                                        </Badge>
                                      )}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="text-zinc-500">
                                        &euro;{(item.price * item.quantity).toFixed(2)}
                                      </span>
                                      {isSoldOut && (
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          className="h-6 text-[10px] px-2"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeOrderItem(order.id, item.id);
                                          }}
                                        >
                                          Remove
                                        </Button>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-amber-400">
                                &euro;{order.total.toFixed(2)}
                              </span>
                              {!isTerminal && (
                                <div className="flex gap-1.5">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, 'cancelled');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  {currentStatusIdx < statusFlow.length - 1 && (
                                    <Button
                                      className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateOrderStatus(
                                          order.id,
                                          statusFlow[currentStatusIdx + 1]
                                        );
                                      }}
                                    >
                                      &rarr; {statusLabels[statusFlow[currentStatusIdx + 1]]}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}

                    {/* Receipt button */}
                    <Button
                      variant="outline"
                      className="w-full border-zinc-700 text-amber-400 hover:bg-zinc-800 h-11 text-sm"
                      onClick={() => handleOpenReceipt(table?.id || '', sessionId)}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      View Receipt
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        order={detailOrder}
      />

      {/* Receipt Modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Receipt className="h-5 w-5 text-amber-500" />
              Digital Receipt
            </DialogTitle>
          </DialogHeader>
          <ReceiptView
            tableId={receiptTableId}
            sessionId={receiptSessionId}
            showDownload={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
