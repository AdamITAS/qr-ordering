'use client';

import { useRestaurantStore } from '@/lib/store';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { Order, OrderStatus } from '@/lib/types';

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

interface OrderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export default function OrderDetailModal({
  open,
  onOpenChange,
  order,
}: OrderDetailModalProps) {
  const updateOrderStatus = useRestaurantStore((s) => s.updateOrderStatus);
  const removeOrderItem = useRestaurantStore((s) => s.removeOrderItem);
  const products = useRestaurantStore((s) => s.products);
  const tables = useRestaurantStore((s) => s.tables);

  if (!order) return null;

  const table = tables.find((t) => t.id === order.tableId);
  const currentStatusIdx = statusFlow.indexOf(order.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            Order #{order.id.substring(0, 8)}
            <Badge variant="outline" className={statusColors[order.status]}>
              {statusLabels[order.status]}
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Order for {table?.name || 'Unknown'} — €{order.total.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-sm text-zinc-400 space-y-1">
            <p>Table: {table?.name || 'Unknown'}</p>
            <p>Created: {format(new Date(order.createdAt), 'PPpp')}</p>
            <p>Updated: {format(new Date(order.updatedAt), 'PPpp')}</p>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2 text-zinc-300">Status Progress</h4>
            <div className="flex gap-1 flex-wrap">
              {statusFlow.map((s, idx) => (
                <div
                  key={s}
                  className={`flex-1 min-w-[60px] h-2 rounded-full ${
                    idx <= currentStatusIdx ? 'bg-amber-500' : 'bg-zinc-700'
                  }`}
                  title={statusLabels[s]}
                />
              ))}
            </div>
            <div className="flex gap-1 flex-wrap mt-1">
              {statusFlow.map((s) => (
                <span key={s} className="flex-1 min-w-[60px] text-[10px] text-center text-zinc-500">
                  {statusLabels[s]}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-sm mb-2 text-zinc-300">Items</h4>
            <div className="space-y-2">
              {order.items.map((item) => {
                const product = products.find((p) => p.id === item.productId);
                const isSoldOut = product && !product.isAvailable && !product.isArchived;
                return (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-800 rounded-lg p-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-white">
                          {item.quantity}× {item.productName}
                        </span>
                        {isSoldOut && <Badge variant="destructive" className="text-xs">Sold Out</Badge>}
                      </div>
                      {item.notes && <p className="text-xs text-zinc-500 mt-0.5">Note: {item.notes}</p>}
                      <p className="text-xs text-zinc-500">€{item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">€{(item.price * item.quantity).toFixed(2)}</span>
                      {isSoldOut && (
                        <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => removeOrderItem(order.id, item.id)}>Remove</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between font-semibold text-lg border-t border-zinc-700 pt-3">
            <span className="text-white">Total</span>
            <span className="text-amber-400">€{order.total.toFixed(2)}</span>
          </div>

          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="space-y-2 pt-2">
              <h4 className="font-medium text-sm text-zinc-300">Change Status</h4>
              <div className="flex gap-2 flex-wrap">
                {order.status !== 'cancelled' && (
                  <Button variant="destructive" size="sm" className="min-h-[44px]" onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                    Cancel Order
                  </Button>
                )}
                {currentStatusIdx < statusFlow.length - 1 && (
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px]" size="sm" onClick={() => updateOrderStatus(order.id, statusFlow[currentStatusIdx + 1])}>
                    Mark as {statusLabels[statusFlow[currentStatusIdx + 1]]}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}