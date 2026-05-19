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
import type { Order, OrderStatus } from '@/lib/types';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-orange-100 text-orange-800 border-orange-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  delivered: 'bg-gray-100 text-gray-600 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
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
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'active' | 'history'>('active');
  const [, setTick] = useState(0);

  // Poll for updates every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 3000);
    const syncInterval = setInterval(() => {
      useRestaurantStore.getState().syncFromStorage();
    }, 5000);
    return () => { clearInterval(interval); clearInterval(syncInterval); };
  }, []);

  // Separate active orders (from active sessions) vs history (from closed sessions)
  const activeSessionIds = new Set(sessions.filter((s) => s.isActive).map((s) => s.id));

  const activeOrders = orders.filter((o) => activeSessionIds.has(o.sessionId));
  const historyOrders = orders.filter((o) => !activeSessionIds.has(o.sessionId));

  // Current display list
  const displayOrders = viewMode === 'active' ? activeOrders : historyOrders;

  // Filter orders by status
  const filteredOrders = displayOrders
    .filter((o) => statusFilter === 'all' || o.status === statusFilter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Group orders by table
  const ordersByTable = new Map<string, Order[]>();
  filteredOrders.forEach((order) => {
    const existing = ordersByTable.get(order.tableId) || [];
    existing.push(order);
    ordersByTable.set(order.tableId, existing);
  });

  // Sort tables: most recent order first
  const sortedTableIds = Array.from(ordersByTable.keys()).sort((a, b) => {
    const aOrders = ordersByTable.get(a) || [];
    const bOrders = ordersByTable.get(b) || [];
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

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Active / History toggle */}
      <div className="flex border rounded-lg overflow-hidden">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 h-10 rounded-none ${
            viewMode === 'active'
              ? 'bg-amber-600 text-white hover:bg-amber-700 hover:text-white'
              : 'text-muted-foreground'
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
          className={`flex-1 h-10 rounded-none ${
            viewMode === 'history'
              ? 'bg-gray-600 text-white hover:bg-gray-700 hover:text-white'
              : 'text-muted-foreground'
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
                className={`whitespace-nowrap min-h-[36px] ${
                  statusFilter === s
                    ? viewMode === 'active'
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-gray-600 hover:bg-gray-700 text-white'
                    : 'border-amber-200'
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

      {/* Orders grouped by table */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>{viewMode === 'active' ? 'No active orders' : 'No order history'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedTableIds.map((tableId) => {
            const table = tables.find((t) => t.id === tableId);
            const tableOrders = ordersByTable.get(tableId) || [];
            const isExpanded = expandedTables.has(tableId);

            // Calculate session total
            const allTableDisplayOrders = displayOrders.filter((o) => o.tableId === tableId);
            const sessionTotal = allTableDisplayOrders.reduce((sum, o) => sum + o.total, 0);

            // Find active session for this table
            const activeSession = sessions.find(
              (s) => s.tableId === tableId && s.isActive
            );

            const hasPending = tableOrders.some((o) => o.status === 'pending');

            return (
              <div key={tableId} className="space-y-0">
                {/* Table group header */}
                <div
                  className={`flex items-center justify-between p-3 rounded-t-xl border-2 cursor-pointer select-none ${
                    hasPending
                      ? 'bg-amber-50 border-amber-300'
                      : viewMode === 'active'
                      ? 'bg-white border-amber-100'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => toggleTable(tableId)}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      viewMode === 'active' ? 'bg-amber-600' : 'bg-gray-400'
                    }`}>
                      <UtensilsCrossed className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 text-sm">
                        {table?.name || 'Unknown Table'}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {tableOrders.length} order{tableOrders.length !== 1 ? 's' : ''} — Session total: <span className="font-semibold text-amber-700">&euro;{sessionTotal.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPending && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs animate-pulse">
                        New Order
                      </Badge>
                    )}
                    {activeSession && viewMode === 'active' && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        Active
                      </Badge>
                    )}
                    {viewMode === 'history' && (
                      <Badge className="bg-gray-100 text-gray-600 text-xs">
                        Closed
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded: orders for this table */}
                {isExpanded && (
                  <div className="space-y-2 border-x-2 border-b-2 border-amber-100 rounded-b-xl p-3 bg-amber-50/30">
                    {tableOrders.map((order) => {
                      const currentStatusIdx = statusFlow.indexOf(order.status);
                      const isTerminal = order.status === 'delivered' || order.status === 'cancelled';

                      return (
                        <Card
                          key={order.id}
                          className={`cursor-pointer hover:shadow-md transition-shadow border-amber-100 ${
                            order.status === 'pending' ? 'ring-1 ring-yellow-300' : ''
                          }`}
                          onClick={() => handleOpenDetail(order)}
                        >
                          <CardHeader className="pb-2 pt-3 px-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-medium">
                                  #{order.id.substring(0, 8)}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className={statusColors[order.status]}
                                >
                                  {statusLabels[order.status]}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
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
                                    <span className="flex items-center gap-1.5">
                                      {item.quantity}&times; {item.productName}
                                      {item.notes && (
                                        <span className="text-xs text-muted-foreground">
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
                                      <span className="text-muted-foreground">
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
                              <span className="font-semibold text-amber-700">
                                &euro;{order.total.toFixed(2)}
                              </span>
                              {!isTerminal && (
                                <div className="flex gap-1.5">
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, 'cancelled');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                  {currentStatusIdx < statusFlow.length - 1 && (
                                    <Button
                                      className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
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
                      className="w-full border-amber-300 text-amber-700 min-h-[40px]"
                      onClick={() => {
                        // Use the first order's sessionId for receipt
                        const firstOrder = tableOrders[0];
                        if (firstOrder) {
                          handleOpenReceipt(tableId, firstOrder.sessionId);
                        }
                      }}
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
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-amber-600" />
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
