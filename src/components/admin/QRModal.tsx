'use client';

import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';

interface QRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableNumber: number;
  tableName: string;
}

export default function QRModal({
  open,
  onOpenChange,
  tableNumber,
  tableName,
}: QRModalProps) {
  // Permanent QR URL based on table number — this never changes!
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/#/menu/table-${tableNumber}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadSVG = () => {
    const svgEl = document.querySelector('.qr-printable svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `qr-table-${tableNumber}.svg`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('QR code downloaded!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">QR Code — {tableName}</DialogTitle>
          <p className="text-xs text-zinc-500 mt-1">
            This QR code is permanent. Print it once and place it on the table.
            When a customer scans it, a new session starts automatically.
          </p>
        </DialogHeader>
        <div className="qr-printable flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-zinc-400 font-medium">{tableName}</p>
          <div className="bg-white p-4 rounded-xl border border-zinc-700 shadow-lg">
            <QRCodeSVG
              value={url}
              size={220}
              level="H"
              includeMargin
              fgColor="#1a1a1a"
            />
          </div>
          <p className="text-xs text-zinc-600 break-all text-center max-w-xs">
            {url}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button
            variant="outline"
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11"
            onClick={handleDownloadSVG}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white h-11"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
