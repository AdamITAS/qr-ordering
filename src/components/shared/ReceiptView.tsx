'use client';

import { useRef, useCallback } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { getReceiptNumber } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, Share2, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';

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

  const receiptNumber = sessionOrders.length > 0
    ? getReceiptNumber(sessionOrders[0].id)
    : 0;

  const handleSaveImage = useCallback(async () => {
    if (!receiptRef.current) return;

    try {
      const dataUrl = await toPng(receiptRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        cacheBust: true,
      });

      // Try Web Share API first (best for mobile)
      if (navigator.share && navigator.canShare) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], `receipt-${receiptNumber}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Receipt #${receiptNumber}`,
              text: `Receipt for ${tableName}`,
            });
            return;
          }
        } catch (shareErr) {
          // User cancelled share or not supported — fall through to download
        }
      }

      // Fallback: download as PNG file
      const link = document.createElement('a');
      link.download = `receipt-${receiptNumber}-${tableName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to save receipt image:', err);
    }
  }, [tableName, receiptNumber]);

  if (sessionOrders.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500">
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
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11 px-4"
            onClick={handleSaveImage}
          >
            <Download className="h-4 w-4 mr-2" />
            Save Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11 px-4"
            onClick={handleSaveImage}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      )}

      {/* Receipt content — white background for clean image capture */}
      <div
        ref={receiptRef}
        className="bg-white rounded-xl border-2 border-dashed border-zinc-300 p-6 max-w-sm mx-auto"
        style={{ fontFamily: "'Courier New', monospace", fontSize: '12px', color: '#000' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#000' }}>TRATTORIA DEL SOLE</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>Authentic Italian Dining</div>
          <div style={{ borderTop: '2px solid #333', marginTop: '12px' }} />
        </div>

        {/* Receipt ID */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'inline-block', border: '2px solid #333', padding: '4px 12px', fontWeight: 'bold', fontSize: '14px' }}>
            Receipt #{receiptNumber}
          </div>
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
        {sessionOrders.map((order) => {
          const orderReceiptNum = getReceiptNumber(order.id);
          return (
            <div key={order.id} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>
                  Order #{orderReceiptNum}
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
                <span>Subtotal</span>
                <span>{order.total.toFixed(2)} EUR</span>
              </div>
            </div>
          );
        })}

        {/* Total */}
        <div style={{ borderTop: '2px solid #333', marginTop: '8px', paddingTop: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '16px', color: '#000' }}>
            <span>TOTALE</span>
            <span>{sessionTotal.toFixed(2)} EUR</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '16px', borderTop: '1px dashed #ddd', paddingTop: '12px' }}>
          <p style={{ fontSize: '9px', color: '#666' }}>Grazie per la visita!</p>
          <p style={{ fontSize: '9px', color: '#666' }}>Thank you for dining with us!</p>
          <p style={{ fontSize: '8px', color: '#999', marginTop: '4px' }}>
            Receipt #{receiptNumber} — {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      </div>
    </div>
  );
}
