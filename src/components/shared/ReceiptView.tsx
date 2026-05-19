'use client';

import { useRef, useCallback, useState } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { getReceiptNumber } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, Share2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

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
  const [saving, setSaving] = useState(false);

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
    if (!receiptRef.current || saving) return;
    setSaving(true);

    try {
      // Generate high-quality PNG image of the receipt
      const dataUrl = await toPng(receiptRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        cacheBust: true,
        // Skip fonts that might cause issues
        fontEmbedCSS: '',
        skipAutoScale: true,
      });

      // Try Web Share API first (best for mobile — opens share sheet)
      if (navigator.share && navigator.canShare) {
        try {
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `receipt-${receiptNumber}.png`, { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Receipt #${receiptNumber}`,
              text: `Receipt for ${tableName}`,
            });
            toast.success('Receipt shared!');
            return;
          }
        } catch (shareErr: any) {
          // User cancelled share dialog — that's fine, don't show error
          if (shareErr?.name === 'AbortError') {
            return;
          }
          // Other share errors — fall through to download
        }
      }

      // Fallback: download as PNG file
      const link = document.createElement('a');
      link.download = `receipt-${receiptNumber}-${tableName.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = dataUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      // Cleanup after a delay to ensure download starts
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      toast.success('Receipt saved as image!');
    } catch (err) {
      console.error('Failed to save receipt image:', err);

      // Fallback: open receipt in new tab so user can long-press save (iOS Safari)
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow && receiptRef.current) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Receipt #${receiptNumber}</title></head>
            <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#fff;">
              ${receiptRef.current.outerHTML}
              <p style="position:fixed;bottom:10px;left:0;right:0;text-align:center;color:#999;font-size:12px;">
                Long-press the image to save it to your device
              </p>
            </body></html>
          `);
          printWindow.document.close();
          toast.info('Receipt opened in new tab — long-press to save');
        }
      } catch (fallbackErr) {
        toast.error('Could not save receipt. Please take a screenshot instead.');
      }
    } finally {
      setSaving(false);
    }
  }, [tableName, receiptNumber, saving]);

  const handleShare = useCallback(async () => {
    if (!receiptRef.current || saving) return;
    setSaving(true);

    try {
      const dataUrl = await toPng(receiptRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 3,
        cacheBust: true,
        fontEmbedCSS: '',
        skipAutoScale: true,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], `receipt-${receiptNumber}.png`, { type: 'image/png' });

      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: `Receipt #${receiptNumber}`,
            text: `Receipt for ${tableName} — Total: ${sessionTotal.toFixed(2)} EUR`,
          });
          toast.success('Receipt shared!');
        } catch (shareErr: any) {
          if (shareErr?.name !== 'AbortError') {
            toast.error('Share failed. Try "Save Image" instead.');
          }
        }
      } else {
        // No Web Share API — download instead
        const link = document.createElement('a');
        link.download = `receipt-${receiptNumber}-${tableName.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = dataUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
        toast.success('Receipt downloaded!');
      }
    } catch (err) {
      console.error('Failed to share receipt:', err);
      toast.error('Could not share receipt. Try "Save Image" instead.');
    } finally {
      setSaving(false);
    }
  }, [tableName, receiptNumber, sessionTotal, saving]);

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
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Image'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11 px-4"
            onClick={handleShare}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4 mr-2" />
            )}
            Share
          </Button>
        </div>
      )}

      {/* Receipt content — white background for clean image capture */}
      {/* IMPORTANT: Use ONLY inline styles here (no Tailwind classes) */}
      {/* because html-to-image cannot resolve CSS custom properties used by Tailwind */}
      <div
        ref={receiptRef}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '2px dashed #d4d4d4',
          padding: '24px',
          maxWidth: '384px',
          margin: '0 auto',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '12px',
          color: '#000000',
        }}
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
          <p style={{ fontSize: '9px', color: '#666', margin: 0 }}>Grazie per la visita!</p>
          <p style={{ fontSize: '9px', color: '#666', margin: 0 }}>Thank you for dining with us!</p>
          <p style={{ fontSize: '8px', color: '#999', marginTop: '4px', margin: '4px 0 0 0' }}>
            Receipt #{receiptNumber} — {format(new Date(), 'dd/MM/yyyy HH:mm')}
          </p>
        </div>
      </div>
    </div>
  );
}
