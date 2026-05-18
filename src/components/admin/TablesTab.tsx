'use client';

import { useState } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import QRModal from './QRModal';
import {
  QrCode,
  Copy,
  RotateCcw,
  Ban,
  Plus,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import type { Table } from '@/lib/types';

export default function TablesTab() {
  const tables = useRestaurantStore((s) => s.tables);
  const tokens = useRestaurantStore((s) => s.tokens);
  const sessions = useRestaurantStore((s) => s.sessions);
  const addTable = useRestaurantStore((s) => s.addTable);
  const generateToken = useRestaurantStore((s) => s.generateToken);
  const invalidateToken = useRestaurantStore((s) => s.invalidateToken);
  const restoreToken = useRestaurantStore((s) => s.restoreToken);
  const freeTable = useRestaurantStore((s) => s.freeTable);
  const getActiveSession = useRestaurantStore((s) => s.getActiveSession);

  const [newTableName, setNewTableName] = useState('');
  const [newTableNumber, setNewTableNumber] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [qrTableName, setQrTableName] = useState('');
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const handleAddTable = async () => {
    if (!newTableName.trim() || !newTableNumber.trim()) return;
    await addTable(newTableName.trim(), parseInt(newTableNumber));
    setNewTableName('');
    setNewTableNumber('');
    toast.success('Table added!');
  };

  const handleGenerateQR = async (table: Table) => {
    const currentToken = table.currentTokenId
      ? tokens.find((t) => t.id === table.currentTokenId)
      : null;

    if (currentToken && currentToken.isValid) {
      setQrToken(currentToken.token);
      setQrTableName(table.name);
      setQrModalOpen(true);
    } else {
      // Generate a new token first
      const tokenStr = await generateToken(table.id);
      setQrToken(tokenStr);
      setQrTableName(table.name);
      setQrModalOpen(true);
    }
  };

  const handleCopyLink = (tokenStr: string) => {
    const url = `${window.location.origin}/#/menu/${tokenStr}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Link copied!');
    });
  };

  const getTableStatus = (table: Table) => {
    const session = getActiveSession(table.id);
    const currentToken = table.currentTokenId
      ? tokens.find((t) => t.id === table.currentTokenId)
      : null;

    if (session) {
      // Session exists but check if token is still valid
      if (currentToken && !currentToken.isValid) {
        return 'session_invalid_token';
      }
      return 'occupied';
    }
    if (table.currentTokenId) {
      if (currentToken && !currentToken.isValid) return 'closed';
    }
    return 'free';
  };

  const statusBadgeMap: Record<string, { label: string; className: string }> = {
    free: { label: 'Free', className: 'bg-green-100 text-green-800 border-green-300' },
    occupied: { label: 'Occupied', className: 'bg-orange-100 text-orange-800 border-orange-300' },
    session_invalid_token: { label: 'Token Invalid', className: 'bg-red-100 text-red-700 border-red-300' },
    closed: { label: 'Closed', className: 'bg-red-100 text-red-800 border-red-300' },
  };

  const getTableTokens = (tableId: string) => {
    return tokens.filter((t) => t.tableId === tableId);
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
          />
        </div>
        <div className="w-24">
          <Input
            placeholder="Number"
            type="number"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
          />
        </div>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white min-h-[40px]"
          onClick={handleAddTable}
          disabled={!newTableName.trim() || !newTableNumber.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Table
        </Button>
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map((table) => {
          const status = getTableStatus(table);
          const badge = statusBadgeMap[status];
          const currentToken = table.currentTokenId
            ? tokens.find((t) => t.id === table.currentTokenId)
            : null;
          const tableTokens = getTableTokens(table.id);
          const isExpanded = expandedTable === table.id;

          return (
            <Card key={table.id} className="border-amber-100">
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{table.name}</CardTitle>
                  <Badge variant="outline" className={badge.className}>
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Table #{table.number}
                </p>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {/* Current token info */}
                {currentToken && (
                  <div className="bg-muted/50 rounded-lg p-2.5 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Current Token:
                      </span>
                      {!currentToken.isValid ? (
                        <Badge variant="destructive" className="text-xs">
                          Invalidated
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          Active
                        </Badge>
                      )}
                    </div>
                    <code className="text-xs font-mono break-all block">
                      {currentToken.token}
                    </code>
                    <div className="flex gap-1.5 flex-wrap">
                      {currentToken.isValid ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-amber-300"
                            onClick={() => handleCopyLink(currentToken.token)}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy Link
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-red-300 text-red-600"
                            onClick={() => invalidateToken(currentToken.id)}
                          >
                            <Ban className="h-3 w-3 mr-1" />
                            Invalidate
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                            className="h-7 text-xs border-green-300 text-green-600"
                          onClick={() => restoreToken(currentToken.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore Token
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    className="bg-amber-600 hover:bg-amber-700 text-white h-9 text-xs"
                    size="sm"
                    onClick={() => handleGenerateQR(table)}
                  >
                    <QrCode className="h-3.5 w-3.5 mr-1" />
                    Generate QR
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-amber-300"
                    onClick={async () => {
                      // If current token is valid, invalidate it first
                      if (currentToken?.isValid) {
                        await invalidateToken(currentToken.id);
                      }
                      await generateToken(table.id);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    New Token
                  </Button>

                  {status === 'occupied' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => freeTable(table.id)}
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Free Table
                    </Button>
                  )}
                </div>

                {/* Token history */}
                {tableTokens.length > 1 && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs w-full justify-between"
                      onClick={() =>
                        setExpandedTable(isExpanded ? null : table.id)
                      }
                    >
                      Token History ({tableTokens.length})
                      {isExpanded ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                    {isExpanded && (
                      <div className="mt-1 space-y-1 max-h-40 overflow-y-auto">
                        {tableTokens
                          .slice()
                          .reverse()
                          .map((t) => (
                            <div
                              key={t.id}
                              className="text-xs bg-muted/30 rounded px-2 py-1 flex items-center justify-between"
                            >
                              <code className="font-mono text-[10px]">
                                {t.token}
                              </code>
                              <Badge
                                variant="outline"
                                className={`text-[10px] h-4 ${
                                  t.isValid
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`}
                              >
                                {t.isValid ? 'Active' : 'Invalid'}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    )}
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
        tokenStr={qrToken}
        tableName={qrTableName}
      />
    </div>
  );
}
