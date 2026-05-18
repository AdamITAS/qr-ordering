'use client';

import { useRef } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';

interface ReceiptViewProps {
  tableId: string;
  sessionId: string;
  showDownload?: boolean;
}

export default function ReceiptView({ tableId, sessionId, showDownload = true }: ReceiptViewProps) {
  const tables = useRestaurantStore((s) => s.tables);
  const orders = useRestaurantStore((s) => s.orders);
  const sessions = useRestaurantStore((s) => s.sessions);
  const receiptRef = useRef<HTMLDivElement>(null);

  const table = tables.find((t) => t.id === tableId);
  const session = sessions.find((s) => s.id === sessionId);
  const sessionOrders = orders
    .filter((o) => o.sessionId === sessionId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const sessionTotal = sessionOrders.reduce((sum, o) => sum + o.total, 0);

  const tableName = table?.name || 'table';

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const link = document.createElement('a');
      link.download = `receipt-${tableName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      window.print();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (sessionOrders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No orders yet</p>
        <p className="text-xs mt-1">Your receipt will appear here after ordering</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showDownload && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 min-h-[40px]"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-700 min-h-[40px]"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        </div>
      )}

      {/* Receipt content — designed to look good as a screenshot */}
      <div
        ref={receiptRef}
        className="bg-white rounded-xl border-2 border-dashed border-amber-200 p-6 max-w-md mx-auto font-mono text-sm"
        style={{ fontFamily: "'Geist Mono', 'Courier New', monospace" }}
      >
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-amber-900">TRATTORIA DEL SOLE</h2>
          <p className="text-xs text-gray-500 mt-0.5">Authentic Italian Dining</p>
          <div className="border-b-2 border-amber-200 mt-3" />
        </div>

        {/* Table & Session Info */}
        <div className="flex justify-between text-xs text-gray-600 mb-3">
          <span>{table?.name || 'Unknown Table'}</span>
          <span>
            {session?.startedAt
              ? format(new Date(session.startedAt), 'dd/MM/yyyy HH:mm')
              : ''}
          </span>
        </div>

        {/* Orders */}
        {sessionOrders.map((order, idx) => (
          <div key={order.id} className="mb-3">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-xs font-semibold text-amber-800">
                Ordine #{idx + 1}
              </span>
              <span className="text-[10px] text-gray-400">
                {format(new Date(order.createdAt), 'HH:mm')}
              </span>
            </div>

            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between text-xs py-0.5">
                <span className="flex-1 truncate">
                  {item.quantity}x {item.productName}
                  {item.notes && (
                    <span className="text-gray-400 ml-1">({item.notes})</span>
                  )}
                </span>
                <span className="ml-2 whitespace-nowrap">
                  {(item.price * item.quantity).toFixed(2)} EUR
                </span>
              </div>
            ))}

            <div className="flex justify-between text-xs font-semibold mt-1 pt-1 border-t border-dashed border-gray-200">
              <span>Subtotale</span>
              <span>{order.total.toFixed(2)} EUR</span>
            </div>
          </div>
        ))}

        {/* Total */}
        <div className="border-t-2 border-amber-800 mt-2 pt-2">
          <div className="flex justify-between font-bold text-base text-amber-900">
            <span>TOTALE</span>
            <span>{sessionTotal.toFixed(2)} EUR</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 border-t border-dashed border-gray-200 pt-3">
          <p className="text-[10px] text-gray-400">Grazie per la visita!</p>
          <p className="text-[10px] text-gray-400">Thank you for dining with us!</p>
          <p className="text-[9px] text-gray-300 mt-1">
            Generated {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      </div>
    </div>
  );
}
