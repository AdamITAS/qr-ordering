'use client';

import { useRestaurantStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
  confirmed: 'bg-blue-900/50 text-blue-400 border-blue-700',
  preparing: 'bg-orange-900/50 text-orange-400 border-orange-700',
  ready: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
  delivered: 'bg-zinc-800 text-zinc-500 border-zinc-600',
  cancelled: 'bg-red-900/50 text-red-400 border-red-700',
};

const statusLabels: Record<string, string> = {
  pending: '⏳ Pending',
  confirmed: '✅ Confirmed',
  preparing: '👨‍🍳 Preparing',
  ready: '🔔 Ready',
  delivered: '✅ Delivered',
  cancelled: '❌ Cancelled',
};

interface OrderStatusProps {
  sessionId: string;
}

export default function OrderStatus({ sessionId }: OrderStatusProps) {
  const orders = useRestaurantStore((s) => s.orders);

  const sessionOrders = orders.filter((o) => o.sessionId === sessionId);

  if (sessionOrders.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-500">
        <p className="text-sm">No orders yet</p>
        <p className="text-xs mt-1">Your orders will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessionOrders.map((order) => (
        <Card key={order.id} className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-white">
                Order #{order.id.substring(0, 8)}
              </CardTitle>
              <Badge
                variant="outline"
                className={statusColors[order.status]}
              >
                {statusLabels[order.status]}
              </Badge>
            </div>
            <p className="text-xs text-zinc-500">
              {format(new Date(order.createdAt), 'HH:mm')}
            </p>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between text-sm"
                >
                  <span className="text-zinc-300">
                    {item.quantity}× {item.productName}
                    {item.notes && (
                      <span className="text-xs text-zinc-500 ml-1">
                        ({item.notes})
                      </span>
                    )}
                  </span>
                  <span className="text-zinc-500">
                    €{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold text-sm mt-2 pt-2 border-t border-zinc-800">
              <span className="text-white">Total</span>
              <span className="text-amber-400">€{order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
