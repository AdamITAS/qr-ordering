'use client';

import { useRestaurantStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-orange-100 text-orange-800 border-orange-300',
  ready: 'bg-green-100 text-green-800 border-green-300',
  delivered: 'bg-gray-100 text-gray-600 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
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
  const tables = useRestaurantStore((s) => s.tables);

  const sessionOrders = orders.filter((o) => o.sessionId === sessionId);

  if (sessionOrders.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm">No orders yet</p>
        <p className="text-xs mt-1">Your orders will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessionOrders.map((order) => (
        <Card key={order.id} className="border-amber-100">
          <CardHeader className="pb-2 pt-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Order #{order.id.substring(0, 8)}
              </CardTitle>
              <Badge
                variant="outline"
                className={statusColors[order.status]}
              >
                {statusLabels[order.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
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
                  <span>
                    {item.quantity}× {item.productName}
                    {item.notes && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({item.notes})
                      </span>
                    )}
                  </span>
                  <span className="text-muted-foreground">
                    €{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-semibold text-sm mt-2 pt-2 border-t">
              <span>Total</span>
              <span className="text-amber-700">€{order.total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
