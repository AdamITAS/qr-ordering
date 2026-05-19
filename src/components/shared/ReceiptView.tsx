'use client';

import { useRef, useCallback } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Download, Printer } from 'lucide-react';
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

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current) return;

    try {
      // Use canvas-based approach for better mobile support
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Convert to blob for better mobile compatibility
      canvas.toBlob((blob) => {
        if (!blob) {
          fallbackPrint();
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `receipt-${tableName.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`;
        link.href = url;

        // For iOS Safari compatibility
        if (navigator.userAgent.match(/iPhone|iPad|iPod/)) {
          // Open in new tab for iOS share sheet
          window.open(url, '_blank');
        } else {
          link.click();
        }

        // Cleanup after delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }, 'image/png');
    } catch {
      fallbackPrint();
    }
  }, [tableName]);

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) {
      fallbackPrint();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${tableName}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            padding: 20px;
            max-width: 320px;
            margin: 0 auto;
            font-size: 12px;
            color: #000;
            background: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .small { font-size: 10px; color: #666; }
          .divider { border-top: 1px dashed #999; margin: 8px 0; }
          .divider-thick { border-top: 2px solid #333; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; padding: 2px 0; }
          .total { font-size: 16px; font-weight: bold; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        ${receiptRef.current.innerHTML.replace(/class="[^"]*"/g, '').replace(/style="[^"]*"/g, '')}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }, [tableName]);

  const fallbackPrint = () => {
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
        <div className="flex gap-2 justify-end no-print">
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

      {/* Receipt content — designed to render properly on all devices */}
      <div
        ref={receiptRef}
        className="bg-white rounded-xl border-2 border-dashed border-amber-200 p-6 max-w-sm mx-auto"
        style={{ fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#000' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#78350f' }}>TRATTORIA DEL SOLE</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Authentic Italian Dining</div>
          <div style={{ borderTop: '2px solid #d4a574', marginTop: '12px' }} />
        </div>

        {/* Table & Session Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#555', marginBottom: '12px' }}>
          <span>{table?.name || 'Unknown Table'}</span>
          <span>
            {session?.startedAt
              ? format(new Date(session.startedAt), 'dd/MM/yyyy HH:mm')
              : ''}
          </span>
        </div>

        {/* Orders */}
        {sessionOrders.map((order, idx) => (
          <div key={order.id} style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#92400e' }}>
                Ordine #{idx + 1}
              </span>
              <span style={{ fontSize: '9px', color: '#999' }}>
                {format(new Date(order.createdAt), 'HH:mm')}
              </span>
            </div>

            {order.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: '11px' }}>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                  {item.quantity}x {item.productName}
                  {item.notes && (
                    <span style={{ color: '#999', marginLeft: '4px' }}>({item.notes})</span>
                  )}
                </span>
                <span style={{ whiteSpace: 'nowrap' }}>
                  {(item.price * item.quantity).toFixed(2)} EUR
                </span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #ddd' }}>
              <span>Subtotale</span>
              <span>{order.total.toFixed(2)} EUR</span>
            </div>
          </div>
        ))}

        {/* Total */}
        <div style={{ borderTop: '2px solid #78350f', marginTop: '8px', paddingTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: '#78350f' }}>
            <span>TOTALE</span>
            <span>{sessionTotal.toFixed(2)} EUR</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px dashed #ddd', paddingTop: '12px' }}>
          <p style={{ fontSize: '9px', color: '#999' }}>Grazie per la visita!</p>
          <p style={{ fontSize: '9px', color: '#999' }}>Thank you for dining with us!</p>
          <p style={{ fontSize: '8px', color: '#ccc', marginTop: '4px' }}>
            Generated {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      </div>
    </div>
  );
}
