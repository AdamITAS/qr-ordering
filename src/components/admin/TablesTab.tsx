'use client';

import { useState } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import QRModal from './QRModal';
import ReceiptView from '@/components/shared/ReceiptView';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  QrCode,
  Plus,
  XCircle,
  CheckCircle,
  Receipt,
  Clock,
  Users,
  Moon,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Table } from '@/lib/types';

export default function TablesTab() {
  const tables = useRestaurantStore((s) => s.tables);
  const sessions = useRestaurantStore((s) => s.sessions);
  const orders = useRestaurantStore((s) => s.orders);
  const addTable = useRestaurantStore((s) => s.addTable);
  const freeTable = useRestaurantStore((s) => s.freeTable);
  const payAndFreeTable = useRestaurantStore((s) => s.payAndFreeTable);
  const getSessionStatus = useRestaurantStore((s) => s.getSessionStatus);

  const [newTableName, setNewTableName] = useState('');
  const [newTableNumber, setNewTableNumber] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrTableNumber, setQrTableNumber] = useState(0);
  const [qrTableName, setQrTableName] = useState('');
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTableId, setReceiptTableId] = useState('');
  const [receiptSessionId, setReceiptSessionId] = useState('');

  const handleAddTable = async () => {
    if (!newTableName.trim() || !newTableNumber.trim()) return;
    await addTable(newTableName.trim(), parseInt(newTableNumber));
    setNewTableName('');
    setNewTableNumber('');
    toast.success('Table added!');
  };

  const handleShowQR = (table: Table) => {
    setQrTableNumber(table.number);
    setQrTableName(table.name);
    setQrModalOpen(true);
  };

  const getTableStatus = (table: Table) => {
    const activeSession = sessions.find(s => s.tableId === table.id && s.isActive);
    const inactiveSession = sessions.find(s => s.tableId === table.id && !s.isActive && !s.closedAt);

    if (activeSession) return 'occupied';
    if (inactiveSession) return 'inactive';
    return 'free';
  };

  const getTableSessionInfo = (table: Table) => {
    const activeSession = sessions.find(s => s.tableId === table.id && s.isActive);
    const inactiveSession = sessions.find(s => s.tableId === table.id && !s.isActive && !s.closedAt);
    const session = activeSession || inactiveSession;
    if (!session) return null;

    const sessionOrders = orders.filter(o => o.sessionId === session.id);
    const total = sessionOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingCount = sessionOrders.filter(o => o.status === 'pending').length;

    return { session, orders: sessionOrders, total, pendingCount, isActive: !!activeSession };
  };

  const statusConfig: Record<string, { label: string; icon: any; className: string; cardBorder: string; headerBg: string }> = {
    free: {
      label: 'Free',
      icon: CheckCircle,
      className: 'bg-emerald-900/50 text-emerald-400 border-emerald-700',
      cardBorder: 'border-zinc-800',
      headerBg: 'bg-zinc-900',
    },
    occupied: {
      label: 'Occupied',
      icon: Users,
      className: 'bg-amber-900/50 text-amber-400 border-amber-700',
      cardBorder: 'border-amber-700/50',
      headerBg: 'bg-amber-900/20',
    },
    inactive: {
      label: 'Inactive',
      icon: Moon,
      className: 'bg-zinc-800 text-zinc-400 border-zinc-600',
      cardBorder: 'border-zinc-700',
      headerBg: 'bg-zinc-900',
    },
  };

  return (
    <div className="space-y-4">
      {/* Add table form */}
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <Input
            placeholder="Table name"
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white h-11"
          />
        </div>
        <div className="w-28">
          <Input
            placeholder="Number"
            type="number"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            className="bg-zinc-900 border-zinc-700 text-white h-11"
          />
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white h-11 text-base px-6"
          onClick={handleAddTable}
          disabled={!newTableName.trim() || !newTableNumber.trim()}
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Table
        </Button>
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => {
          const status = getTableStatus(table);
          const config = statusConfig[status];
          const StatusIcon = config.icon;
          const sessionInfo = getTableSessionInfo(table);

          return (
            <Card key={table.id} className={`bg-zinc-900 border-2 ${config.cardBorder} overflow-hidden`}>
              {/* Card header with colored background */}
              <div className={`${config.headerBg} px-4 pt-4 pb-3 border-b border-zinc-800`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{table.number}</span>
                    </div>
                    <div>
                      <CardTitle className="text-white text-lg">{table.name}</CardTitle>
                      <p className="text-xs text-zinc-500">Table #{table.number}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`${config.className} text-xs font-semibold`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                </div>
              </div>

              <CardContent className="px-4 py-3 space-y-3">
                {/* Session info */}
                {sessionInfo && (
                  <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400">
                        {sessionInfo.isActive ? 'Active session' : 'Session (customer left)'}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {sessionInfo.orders.length} order{sessionInfo.orders.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">
                        Total: €{sessionInfo.total.toFixed(2)}
                      </span>
                      {sessionInfo.pendingCount > 0 && (
                        <Badge className="bg-red-600 text-white text-xs animate-order-pulse">
                          {sessionInfo.pendingCount} pending
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white h-11 text-sm flex-1"
                    onClick={() => handleShowQR(table)}
                  >
                    <QrCode className="h-4 w-4 mr-2" />
                    QR Code
                  </Button>

                  {status === 'occupied' && (
                    <>
                      <Button
                        variant="outline"
                        className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/30 h-11 text-sm flex-1"
                        onClick={() => {
                          if (sessionInfo) {
                            setReceiptTableId(table.id);
                            setReceiptSessionId(sessionInfo.session.id);
                            setReceiptOpen(true);
                          }
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm flex-1 font-semibold"
                        onClick={() => {
                          if (window.confirm(`Mark "${table.name}" as paid and free the table?`)) {
                            payAndFreeTable(table.id);
                            toast.success(`Table "${table.name}" marked as paid and freed`);
                          }
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Paid
                      </Button>
                    </>
                  )}

                  {(status === 'occupied' || status === 'inactive') && (
                    <Button
                      variant="outline"
                      className="border-red-800 text-red-400 hover:bg-red-900/30 h-11 text-sm"
                      onClick={() => {
                        if (window.confirm(`Free "${table.name}"? This will close the session and the customer will need to re-scan the QR code.`)) {
                          freeTable(table.id);
                          toast.success(`Table "${table.name}" freed`);
                        }
                      }}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Free
                    </Button>
                  )}
                </div>

                {/* Inactive notice */}
                {status === 'inactive' && (
                  <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-2">
                    <Clock className="h-4 w-4 text-zinc-500" />
                    <span className="text-xs text-zinc-400">
                      Customer left page — session preserved
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* QR Modal */}
      <QRModal
        open={qrModalOpen}
        onOpenChange={setQrModalOpen}
        tableNumber={qrTableNumber}
        tableName={qrTableName}
      />

      {/* Receipt Modal */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Receipt className="h-5 w-5 text-amber-500" />
              Receipt
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Session receipt for {tables.find(t => t.id === receiptTableId)?.name || 'table'}
            </DialogDescription>
          </DialogHeader>
          <ReceiptView
            tableId={receiptTableId}
            sessionId={receiptSessionId}
            showDownload={true}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
