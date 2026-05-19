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
  token_created: 'bg-blue-900/50 text-blue-400',
  token_invalidated: 'bg-red-900/50 text-red-400',
  token_restored: 'bg-emerald-900/50 text-emerald-400',
  table_session_started: 'bg-blue-900/50 text-blue-400',
  table_session_closed: 'bg-orange-900/50 text-orange-400',
  table_session_inactive: 'bg-zinc-800 text-zinc-400',
  table_session_reactivated: 'bg-emerald-900/50 text-emerald-400',
  product_created: 'bg-emerald-900/50 text-emerald-400',
  product_updated: 'bg-yellow-900/50 text-yellow-400',
  product_archived: 'bg-zinc-800 text-zinc-500',
  product_marked_sold_out: 'bg-red-900/50 text-red-400',
  product_marked_available: 'bg-emerald-900/50 text-emerald-400',
  order_created: 'bg-emerald-900/50 text-emerald-400',
  order_status_changed: 'bg-amber-900/50 text-amber-400',
  order_item_removed_by_admin: 'bg-red-900/50 text-red-400',
  table_freed: 'bg-zinc-800 text-zinc-500',
  table_paid: 'bg-emerald-900/50 text-emerald-400',
};

const actionLabels: Record<string, string> = {
  token_created: 'Token Created',
  token_invalidated: 'Token Invalidated',
  token_restored: 'Token Restored',
  table_session_started: 'Session Started',
  table_session_closed: 'Session Closed',
  table_session_inactive: 'Session Inactive',
  table_session_reactivated: 'Session Reactivated',
  product_created: 'Product Created',
  product_updated: 'Product Updated',
  product_archived: 'Product Archived',
  product_marked_sold_out: 'Marked Sold Out',
  product_marked_available: 'Marked Available',
  order_created: 'Order Created',
  order_status_changed: 'Status Changed',
  order_item_removed_by_admin: 'Item Removed',
  table_freed: 'Table Freed',
  table_paid: 'Table Paid',
};

function getActionCategory(action: AuditAction): string {
  if (action.startsWith('token')) return 'Tokens';
  if (action.startsWith('table_session')) return 'Sessions';
  if (action.startsWith('product')) return 'Products';
  if (action.startsWith('order')) return 'Orders';
  if (action.startsWith('table')) return 'Tables';
  return 'Other';
}

function extractTableName(details: string): string | null {
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
    )
    // FIX: Already sorted newest first from Supabase query, but ensure it here
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

  // Sort table groups: most recent activity first
  const sortedTableNames = Array.from(groupedByTable.keys()).sort((a, b) => {
    const aEntries = groupedByTable.get(a) || [];
    const bEntries = groupedByTable.get(b) || [];
    const aLatest = aEntries.length > 0 ? new Date(aEntries[0].timestamp).getTime() : 0;
    const bLatest = bEntries.length > 0 ? new Date(bEntries[0].timestamp).getTime() : 0;
    return bLatest - aLatest; // Most recent first
  });

  const renderEntry = (entry: typeof filtered[0]) => (
    <div key={entry.id} className="flex items-start gap-3 py-2">
      <Badge
        variant="outline"
        className={`text-[10px] whitespace-nowrap mt-0.5 ${
          actionColors[entry.action] || 'bg-zinc-800 text-zinc-400'
        }`}
      >
        {actionLabels[entry.action] || entry.action}
      </Badge>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-zinc-300">{entry.details}</p>
        <p className="text-[11px] text-zinc-600 mt-0.5">
          {format(new Date(entry.timestamp), 'HH:mm:ss — dd/MM/yyyy')}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 flex-1">
          {['all', 'Tokens', 'Sessions', 'Products', 'Orders', 'Tables'].map(
            (cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                className={`whitespace-nowrap min-h-[40px] text-sm ${
                  categoryFilter === cat
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'border-zinc-700 text-zinc-400'
                }`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'all' ? 'All' : cat}
              </Button>
            )
          )}
        </div>

        <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 px-2.5 rounded-none ${
              viewMode === 'grouped'
                ? 'bg-zinc-800 text-amber-400'
                : 'text-zinc-500'
            }`}
            onClick={() => setViewMode('grouped')}
            title="Grouped by table"
          >
            <LayoutList className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-9 px-2.5 rounded-none ${
              viewMode === 'flat'
                ? 'bg-zinc-800 text-amber-400'
                : 'text-zinc-500'
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
          <div className="text-center py-12 text-zinc-500">
            <p>No audit entries found</p>
          </div>
        ) : viewMode === 'flat' ? (
          <div className="space-y-2">
            {filtered.map((entry) => (
              <Card key={entry.id} className="bg-zinc-900 border-zinc-800">
                <CardContent className="px-4 py-2.5">
                  {renderEntry(entry)}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedTableNames.map((tableName) => {
              const entries = groupedByTable.get(tableName) || [];
              const table = tables.find((t) => t.name === tableName);

              return (
                <Card key={tableName} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                    <div className="w-6 h-6 rounded bg-amber-600 flex items-center justify-center">
                      <UtensilsCrossed className="h-3 w-3 text-white" />
                    </div>
                    <span className="font-semibold text-sm text-white">
                      {tableName}
                    </span>
                    {table?.currentSessionId && (
                      <Badge className="bg-amber-900/50 text-amber-400 text-[10px] border-amber-700">
                        Active
                      </Badge>
                    )}
                    <span className="text-xs text-zinc-500 ml-auto">
                      {entries.length} event{entries.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <CardContent className="px-4 py-2 space-y-0.5">
                    {entries.map(renderEntry)}
                  </CardContent>
                </Card>
              );
            })}

            {ungrouped.length > 0 && (
              <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                  <span className="font-semibold text-sm text-zinc-400">
                    General
                  </span>
                  <span className="text-xs text-zinc-500 ml-auto">
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
