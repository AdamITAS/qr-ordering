'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UtensilsCrossed, Clock, Volume2, VolumeX, Maximize, Minimize, Bell } from 'lucide-react';
import TablesTab from './TablesTab';
import ProductsTab from './ProductsTab';
import OrdersTab from './OrdersTab';
import AuditLogTab from './AuditLogTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRestaurantStore } from '@/lib/store';

// Generate a beep sound using Web Audio API
function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // First beep
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.frequency.value = 880;
    osc1.type = 'sine';
    gain1.gain.value = 0.4;
    osc1.start(audioCtx.currentTime);
    osc1.stop(audioCtx.currentTime + 0.15);

    // Second beep (higher pitch)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.frequency.value = 1100;
    osc2.type = 'sine';
    gain2.gain.value = 0.4;
    osc2.start(audioCtx.currentTime + 0.2);
    osc2.stop(audioCtx.currentTime + 0.35);

    // Third beep (confirmation)
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.frequency.value = 1320;
    osc3.type = 'sine';
    gain3.gain.value = 0.3;
    osc3.start(audioCtx.currentTime + 0.4);
    osc3.stop(audioCtx.currentTime + 0.55);
  } catch {
    // Audio not supported
  }
}

export default function AdminDashboard() {
  const [currentTime, setCurrentTime] = useState('');
  const [activeTab, setActiveTab] = useState('tables');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNewOrderFlash, setShowNewOrderFlash] = useState(false);
  const lastSoundTime = useRef(0);

  const orders = useRestaurantStore((s) => s.orders);
  const sessions = useRestaurantStore((s) => s.sessions);
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const activeSessionIds = new Set(sessions.filter(s => s.isActive).map(s => s.id));
  const activeOrdersCount = orders.filter(o => activeSessionIds.has(o.sessionId)).length;

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

  // Flash notification when new order arrives
  useEffect(() => {
    if (pendingCount > 0) {
      setShowNewOrderFlash(true);
      const timer = setTimeout(() => setShowNewOrderFlash(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [pendingCount]);

  // Listen for new order sound events
  const handleNewOrderSound = useCallback(() => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastSoundTime.current < 5000) return;
    lastSoundTime.current = now;
    playBeep();
  }, [soundEnabled]);

  useEffect(() => {
    window.addEventListener('new-order-sound', handleNewOrderSound);
    return () => {
      window.removeEventListener('new-order-sound', handleNewOrderSound);
    };
  }, [handleNewOrderSound]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col admin-touch">
      {/* New order flash overlay */}
      {showNewOrderFlash && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-amber-500 animate-order-pulse z-50" />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center">
                <UtensilsCrossed className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white text-xl leading-tight">
                  Restaurant Admin
                </h1>
                <p className="text-xs text-zinc-500">
                  Trattoria del Sole
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* New order bell indicator */}
              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 bg-amber-600/20 border border-amber-600/40 rounded-lg px-3 py-1.5">
                  <Bell className="h-4 w-4 text-amber-500 animate-order-pulse" />
                  <span className="text-amber-400 text-sm font-semibold">{pendingCount} new</span>
                </div>
              )}

              {/* Sound toggle */}
              <Button
                variant="ghost"
                size="sm"
                className={`h-10 w-10 p-0 ${soundEnabled ? 'text-amber-500' : 'text-zinc-600'}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Sound on — click to mute' : 'Sound off — click to enable'}
              >
                {soundEnabled ? (
                  <Volume2 className="h-5 w-5" />
                ) : (
                  <VolumeX className="h-5 w-5" />
                )}
              </Button>

              {/* Fullscreen toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-zinc-400 hover:text-white"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
              </Button>

              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Clock className="h-4 w-4" />
                {currentTime}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4 mb-4 bg-zinc-900 h-12">
            <TabsTrigger
              value="tables"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-zinc-400 text-base font-medium min-h-[44px]"
            >
              Tables
            </TabsTrigger>
            <TabsTrigger
              value="products"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-zinc-400 text-base font-medium min-h-[44px]"
            >
              Products
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-zinc-400 text-base font-medium min-h-[44px] relative"
            >
              Orders
              {pendingCount > 0 && (
                <Badge className="ml-2 h-6 min-w-[24px] text-xs bg-red-600 text-white border-0 animate-order-pulse">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-zinc-400 text-base font-medium min-h-[44px]"
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
