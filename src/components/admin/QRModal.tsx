'use client';

import { QRCodeSVG } from 'qrcode.react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Printer } from 'lucide-react';
import { toast } from 'sonner';

interface QRModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tokenStr: string;
  tableName: string;
}

export default function QRModal({
  open,
  onOpenChange,
  tokenStr,
  tableName,
}: QRModalProps) {
  const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/#/menu/${tokenStr}`;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code — {tableName}</DialogTitle>
        </DialogHeader>
        <div className="qr-printable flex flex-col items-center gap-4 py-4">
          <p className="text-sm text-muted-foreground">{tableName}</p>
          <div className="bg-white p-4 rounded-xl border shadow-sm">
            <QRCodeSVG
              value={url}
              size={220}
              level="H"
              includeMargin
              fgColor="#78350f"
            />
          </div>
          <p className="text-xs text-muted-foreground break-all text-center max-w-xs">
            {url}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            className="border-amber-300 text-amber-700"
            onClick={handleCopyLink}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Link
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
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
