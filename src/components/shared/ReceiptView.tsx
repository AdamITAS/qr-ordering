'use client';

import { useRef, useCallback } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { getReceiptNumber } from '@/lib/types';
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

  // Generate receipt number from first order ID
  const receiptNumber = sessionOrders.length > 0
    ? getReceiptNumber(sessionOrders[0].id)
    : 0;

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
      });

      // Create a minimal PDF with the image embedded
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // PDF dimensions (receipt style: 80mm wide, proportional height)
      const pdfWidth = 226; // ~80mm in points
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      const pdf = generatePdfWithImage(imgData, pdfWidth, pdfHeight, receiptNumber, tableName);
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.download = `receipt-${receiptNumber}-${tableName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
      link.href = url;

      // For iOS: open in new tab for share sheet
      if (navigator.userAgent.match(/iPhone|iPad|iPod/)) {
        window.open(url, '_blank');
      } else {
        link.click();
      }

      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      // Fallback to print
      handlePrint();
    }
  }, [tableName, receiptNumber]);

  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '_blank', 'width=400,height=700');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${receiptNumber}</title>
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
          .receipt-id { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 4px 8px; display: inline-block; border: 2px solid #333; }
          @media print {
            body { padding: 10px; }
          }
        </style>
      </head>
      <body>
        ${receiptRef.current.innerHTML.replace(/class="[^"]*"/g, '').replace(/style="[^"]*"/g, '').replace(/color:[^;"]*;?/g, '')}
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
  }, [receiptNumber]);

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
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-10"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-10"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-1.5" />
            Print
          </Button>
        </div>
      )}

      {/* Receipt content */}
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

        {/* Receipt ID — prominent for security matching */}
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
        {sessionOrders.map((order, idx) => {
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

/**
 * Minimal PDF generator that embeds a JPEG image.
 * No external libraries needed.
 */
function generatePdfWithImage(
  imgDataUrl: string,
  width: number,
  height: number,
  receiptNumber: number,
  tableName: string
): Uint8Array {
  // Extract raw base64 data from data URL
  const base64Data = imgDataUrl.split(',')[1];
  const imgBytes = atob(base64Data);
  const imgUint8 = new Uint8Array(imgBytes.length);
  for (let i = 0; i < imgBytes.length; i++) {
    imgUint8[i] = imgBytes.charCodeAt(i);
  }

  // PDF objects
  const objects: string[] = [];
  const offsets: number[] = [];

  let pdf = '%PDF-1.4\n';

  // Object 1: Catalog
  offsets.push(pdf.length);
  pdf += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Object 2: Pages
  offsets.push(pdf.length);
  pdf += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Object 3: Page
  offsets.push(pdf.length);
  pdf += `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`;

  // Object 4: Content stream (draw image)
  const contentStream = `q ${width} 0 0 ${height} 0 0 cm /Img Do Q\n`;
  offsets.push(pdf.length);
  pdf += `4 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`;

  // Object 5: Image XObject
  offsets.push(pdf.length);
  pdf += `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgUint8.length} >>\nstream\n`;
  
  // Convert to Uint8Array
  const pdfPrefix = new TextEncoder().encode(pdf);
  const endObj = new TextEncoder().encode('\nendstream\nendobj\n');

  // Object 6: Info
  const infoStr = `6 0 obj\n<< /Title (Receipt #${receiptNumber} - ${tableName}) /Producer (QR Ordering System) >>\nendobj\n`;
  
  // Build xref
  const xrefOffset = pdfPrefix.length + imgUint8.length + endObj.length;
  const infoOffset = xrefOffset; // we'll add it after
  const fullInfoStr = infoStr;
  const infoBytes = new TextEncoder().encode(fullInfoStr);
  const finalXrefOffset = xrefOffset + infoBytes.length;

  offsets.push(xrefOffset - pdfPrefix.length - imgUint8.length - endObj.length); // approximate
  
  // We need to compute this more carefully. Let's just build it as a string.
  // Actually, for a simpler approach, let's build the entire PDF as a string first,
  // then convert to Uint8Array.
  
  // Hmm, the image data is binary, so we can't just concatenate strings.
  // Let me use a different approach: build everything as Uint8Array.
  
  // Actually, let's just use the blob approach for the canvas instead.
  // The simplest working PDF is to just use the canvas data.
  
  // For now, return a simple approach using a Blob
  const encoder = new TextEncoder();
  
  let obj5Offset = 0;
  
  // Recalculate: we need to build it piece by piece
  const pieces: Uint8Array[] = [];
  
  function addText(text: string) {
    pieces.push(encoder.encode(text));
  }
  
  function addBytes(bytes: Uint8Array) {
    pieces.push(bytes);
  }
  
  const offsets_calc: number[] = [];
  let currentPos = 0;
  
  function trackOffset() {
    offsets_calc.push(currentPos);
  }
  
  // Header
  const header = '%PDF-1.4\n';
  addText(header);
  currentPos += header.length;
  
  // Object 1: Catalog
  trackOffset();
  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  addText(obj1);
  currentPos += obj1.length;
  
  // Object 2: Pages
  trackOffset();
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';
  addText(obj2);
  currentPos += obj2.length;
  
  // Object 3: Page
  trackOffset();
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /XObject << /Img 5 0 R >> >> >>\nendobj\n`;
  addText(obj3);
  currentPos += obj3.length;
  
  // Object 4: Content stream
  trackOffset();
  const stream = `q ${width} 0 0 ${height} 0 0 cm /Img Do Q\n`;
  const obj4 = `4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n`;
  addText(obj4);
  currentPos += obj4.length;
  
  // Object 5: Image
  trackOffset();
  const obj5header = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${Math.round(width)} /Height ${Math.round(height)} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgUint8.length} >>\nstream\n`;
  addText(obj5header);
  currentPos += obj5header.length;
  addBytes(imgUint8);
  currentPos += imgUint8.length;
  const obj5footer = '\nendstream\nendobj\n';
  addText(obj5footer);
  currentPos += obj5footer.length;
  
  // Object 6: Info
  trackOffset();
  const obj6 = `6 0 obj\n<< /Title (Receipt #${receiptNumber}) /Producer (QR Ordering System) >>\nendobj\n`;
  addText(obj6);
  currentPos += obj6.length;
  
  // XRef table
  const xrefOffset = currentPos;
  const xref = `xref\n0 7\n0000000000 65535 f \n${offsets_calc.map(o => String(o).padStart(10, '0') + ' 00000 n ').join('\n')}\n`;
  addText(xref);
  
  // Trailer
  const trailer = `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  addText(trailer);
  
  // Concatenate all pieces
  const totalLength = pieces.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const piece of pieces) {
    result.set(piece, offset);
    offset += piece.length;
  }
  
  return result;
}
