'use client';

import { useEffect, useState } from 'react';
import { useRestaurantStore } from '@/lib/store';
import AdminDashboard from '@/components/admin/AdminDashboard';
import CustomerMenu from '@/components/customer/CustomerMenu';
import { UtensilsCrossed, QrCode, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AppRouter() {
  const [hash, setHash] = useState('');
  const initializeSeedData = useRestaurantStore((s) => s.initializeSeedData);
  const initialized = useRestaurantStore((s) => s.initialized);

  useEffect(() => {
    initializeSeedData();
  }, []);

  useEffect(() => {
    const updateHash = () => {
      setHash(window.location.hash);
    };
    updateHash();
    window.addEventListener('hashchange', updateHash);
    return () => window.removeEventListener('hashchange', updateHash);
  }, []);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <ChefHat className="h-12 w-12 text-amber-500 animate-pulse" />
          <p className="text-zinc-400 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Parse routes
  if (hash === '#/admin') {
    return <AdminDashboard />;
  }

  // New route: #/menu/table-{number} (permanent QR per table)
  const tableMatch = hash.match(/^#\/menu\/table-(\d+)$/);
  if (tableMatch) {
    return <CustomerMenu tableNumber={parseInt(tableMatch[1])} />;
  }

  // Legacy route: #/menu/{token} — redirect old QR scans to table if possible
  const menuMatch = hash.match(/^#\/menu\/(.+)$/);
  if (menuMatch) {
    return <CustomerMenuLegacy token={menuMatch[1]} />;
  }

  // Landing page (default)
  return <LandingPage />;
}

/** Legacy token-based customer menu (for old QR codes that were already printed) */
function CustomerMenuLegacy({ token }: { token: string }) {
  const getTokenByString = useRestaurantStore((s) => s.getTokenByString);
  const getTableByToken = useRestaurantStore((s) => s.getTableByToken);

  const tokenObj = getTokenByString(token);
  const table = getTableByToken(token);

  // If we can find the table, redirect to the new permanent QR route
  if (table) {
    if (typeof window !== 'undefined') {
      window.location.hash = `#/menu/table-${table.number}`;
    }
    return null;
  }

  // Token not found — show invalid QR
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-red-900/50 flex items-center justify-center mx-auto mb-4">
          <QrCode className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-red-400 mb-2">Invalid QR Code</h1>
        <p className="text-zinc-400">
          This QR code is not recognized. Please scan the QR code on your table.
        </p>
      </div>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-600 flex items-center justify-center shadow-lg shadow-amber-600/20">
            <UtensilsCrossed className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Trattoria del Sole
          </h1>
          <p className="text-zinc-400 text-lg max-w-md">
            Authentic Italian dining — order directly from your table
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-600/50 transition-colors cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-2 group-hover:bg-amber-600/20 transition-colors">
                <ChefHat className="h-7 w-7 text-amber-500" />
              </div>
              <CardTitle className="text-white">Admin Dashboard</CardTitle>
              <CardDescription className="text-zinc-500">Manage tables, menu, and orders</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                asChild
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white min-h-[48px] text-base"
              >
                <a href="#/admin">Open Dashboard</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center mb-2">
                <QrCode className="h-7 w-7 text-orange-400" />
              </div>
              <CardTitle className="text-white">Scan QR Code</CardTitle>
              <CardDescription className="text-zinc-500">Customers: scan the QR code on your table</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-zinc-500">
                Point your phone camera at the QR code on your table to view the menu and place your order.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-zinc-700 mt-8">
          Restaurant QR Ordering System
        </p>
      </main>
    </div>
  );
}
