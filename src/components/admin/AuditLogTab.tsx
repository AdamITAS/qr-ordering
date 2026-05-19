'use client';

import { useState } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { List, LayoutList, UtensilsCrossed } from 'lucide-react';
import type { AuditAction } from '@/lib/types';

const actionColors: Record<string, string> = {
  token_created: 'bg-blue-100 text-blue-800',
  token_invalidated: 'bg-red-100 text-red-800',
  token_restored: 'bg-green-100 text-green-800',
  table_session_started: 'bg-blue-100 text-blue-800',
  table_session_closed: 'bg-orange-100 text-orange-800',
  product_created: 'bg-green-100 text-green-800',
  product_updated: 'bg-yellow-100 text-yellow-800',
  product_archived: 'bg-gray-100 text-gray-800',
  product_marked_sold_out: 'bg-red-100 text-red-800',
  product_marked_available: 'bg-green-100 text-green-800',
  order_created: 'bg-emerald-100 text-emerald-800',
  order_status_changed: 'bg-amber-100 text-amber-800',
  order_item_removed_by_admin: 'bg-red-100 text-red-800',
  table_freed: 'bg-gray-100 text-gray-600',
};

const actionLabels: Record<string, string> = {
  token_created: 'Token Created',
  token_invalidated: 'Token Invalidated',
  token_restored: 'Token Restored',
  table_session_started: 'Session Started',
  table_session_closed: 'Session Closed',
  product_created: 'Product Created',
  product_updated: 'Product Updated',
  product_archived: 'Product Archived',
  product_marked_sold_out: 'Marked Sold Out',
  product_marked_available: 'Marked Available',
  order_created: 'Order Created',
  order_status_changed: 'Status Changed',
  order_item_removed_by_admin: 'Item Removed',
  table_freed: 'Table Freed',
};

function getActionCategory(action: AuditAction): string {
  if (action.startsWith('token')) return 'Tokens';
  if (action.startsWith('table_session')) return 'Sessions';
  if (action.startsWith('product')) return 'Products';
  if (action.startsWith('order')) return 'Orders';
  if (action.startsWith('table')) return 'Tables';
  return 'Other';
}

// Extract table name from audit details string
function extractTableName(details: string): string | null {
  // Patterns like: 'Token generated for Table 1: ...', 'Session started for Table 3',
  // 'Order created for Table 2 - ...', 'Table "Table 5" freed'
  const match = details.match(/(?:for |Table ")(Table \d+)/i);
  return match ? match[1] : null;
}

export default function AuditLogTab() {
  const auditLog = useRestaurantStore((s) => s.auditLog);
  const tables = useRestaurantStore((s) => s.tables);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'flat' | 'grouped'>('grouped');

  const filtered = auditLog
    .filter(
      (entry) =>
        categoryFilter === 'all' ||
        getActionCategory(entry.action) === categoryFilter
    );

  // Group by extracted table name
  const groupedByTable = new Map<string, typeof filtered>();
  const ungrouped: typeof filtered = [];

  filtered.forEach((entry) => {
    const tableName = extractTableName(entry.details);
    if (tableName) {
      const existing = groupedByTable.get(tableName) || [];
      existing.push(entry);
      groupedByTable.set(tableName, existing);
    } else {
      ungrouped.push(entry);
    }
  });

  // Sort table groups: those with active tables first
  const sortedTableNames = Array.from(groupedByTable.keys()).sort((a, b) => {
    const aNum = parseInt(a.replace(/\D/g, '')) || 0;
    const bNum = parseInt(b.replace(/\D/g, '')) || 0;
    return aNum - bNum;
  });

  // Render a single audit entry
  const renderEntry = (entry: typeof filtered[0]) => (
    <div key={entry.id} className="flex items-start gap-3 py-1.5">
      <Badge
        variant="outline"
        className={`text-[10px] whitespace-nowrap mt-0.5 ${
          actionColors[entry.action] || 'bg-gray-100'
        }`}
      >
        {actionLabels[entry.action] || entry.action}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{entry.details}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {format(new Date(entry.timestamp), 'HH:mm:ss — dd/MM/yyyy')}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-1">
          {['all', 'Tokens', 'Sessions', 'Products', 'Orders', 'Tables'].map(
            (cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                className={`whitespace-nowrap min-h-[36px] ${
                  categoryFilter === cat
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'border-amber-200'
                }`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            )
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 rounded-none ${
              viewMode === 'grouped'
                ? 'bg-amber-100 text-amber-800'
                : 'text-muted-foreground'
            }`}
            onClick={() => setViewMode('grouped')}
            title="Grouped by table"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-8 px-2.5 rounded-none ${
              viewMode === 'flat'
                ? 'bg-amber-100 text-amber-800'
                : 'text-muted-foreground'
            }`}
            onClick={() => setViewMode('flat')}
            title="Chronological list"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Audit entries */}
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No audit entries found</p>
          </div>
        ) : viewMode === 'flat' ? (
          // Flat chronological view
          <div className="space-y-2">
            {filtered.map((entry) => (
              <Card key={entry.id} className="border-amber-50">
                <CardContent className="px-4 py-2.5">
                  {renderEntry(entry)}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          // Grouped by table view
          <div className="space-y-3">
            {sortedTableNames.map((tableName) => {
              const entries = groupedByTable.get(tableName) || [];
              const table = tables.find((t) => t.name === tableName);

              return (
                <Card key={tableName} className="border-amber-100 overflow-hidden">
                  {/* Table group header */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-100">
                    <div className="w-6 h-6 rounded bg-amber-600 flex items-center justify-center">
                      <UtensilsCrossed className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-semibold text-sm text-amber-900">
                      {tableName}
                    </span>
                    {table?.currentSessionId && (
                      <Badge className="bg-orange-100 text-orange-800 text-[10px]">
                        Active
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {entries.length} event{entries.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Entries */}
                  <CardContent className="px-4 py-2 space-y-0.5">
                    {entries.map(renderEntry)}
                  </CardContent>
                </Card>
              );
            })}

            {/* Non-table events (product changes, etc.) */}
            {ungrouped.length > 0 && (
              <Card className="border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="font-semibold text-sm text-gray-700">
                    General
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {ungrouped.length} event{ungrouped.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <CardContent className="px-4 py-2 space-y-0.5">
                  {ungrouped.map(renderEntry)}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
