'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UtensilsCrossed, Clock } from 'lucide-react';
import TablesTab from './TablesTab';
import ProductsTab from './ProductsTab';
import OrdersTab from './OrdersTab';
import AuditLogTab from './AuditLogTab';

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState('');
  const [activeTab, setActiveTab] = useState('tables');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 to-orange-50/50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-amber-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-amber-900 text-lg leading-tight">
                  Restaurant Admin
                </h1>
                <p className="text-[10px] text-amber-600">
                  Trattoria del Sole
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {currentTime}
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 mb-4 bg-amber-50">
            <TabsTrigger
              value="tables"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white min-h-[40px]"
            >
              Tables
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white min-h-[40px]"
            >
              Products
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white min-h-[40px]"
            >
              Orders
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white min-h-[40px]"
            >
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tables">
            <TablesTab />
          </TabsContent>
          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
