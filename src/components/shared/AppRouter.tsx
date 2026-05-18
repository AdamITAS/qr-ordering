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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <ChefHat className="h-12 w-12 text-amber-600 animate-pulse" />
          <p className="text-muted-foreground text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  // Parse routes
  if (hash === '#/admin') {
    return <AdminDashboard />;
  }

  const menuMatch = hash.match(/^#\/menu\/(.+)$/);
  if (menuMatch) {
    return <CustomerMenu token={menuMatch[1]} />;
  }

  // Landing page (default)
  return <LandingPage />;
}

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 to-orange-50">
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-20 h-20 rounded-2xl bg-amber-600 flex items-center justify-center shadow-lg">
            <UtensilsCrossed className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-amber-900 tracking-tight">
            Trattoria del Sole
          </h1>
          <p className="text-amber-700 text-lg max-w-md">
            Authentic Italian dining experience — order directly from your table
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
          <Card className="border-amber-200 hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mb-2 group-hover:bg-amber-200 transition-colors">
                <ChefHat className="h-7 w-7 text-amber-700" />
              </div>
              <CardTitle className="text-amber-900">Admin Dashboard</CardTitle>
              <CardDescription>Manage tables, menu, and orders</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button
                asChild
                size="lg"
                className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px]"
              >
                <a href="#/admin">Open Dashboard</a>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-14 h-14 rounded-xl bg-orange-100 flex items-center justify-center mb-2">
                <QrCode className="h-7 w-7 text-orange-700" />
              </div>
              <CardTitle className="text-amber-900">Scan QR Code</CardTitle>
              <CardDescription>Customers: scan the QR code on your table</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Point your phone camera at the QR code placed on your table to view the menu and place your order.
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="text-xs text-amber-600/60 mt-8">
          Restaurant QR Ordering System
        </p>
      </main>
    </div>
  );
}
