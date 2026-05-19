'use client';

import { useRestaurantStore } from '@/lib/store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import type { Product } from '@/lib/types';

interface CartItemWithProduct {
  productId: string;
  quantity: number;
  notes: string;
  product: Product;
}

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitOrder: () => void;
  isSubmitting: boolean;
  sessionActive: boolean;
}

export default function CartDrawer({
  open,
  onOpenChange,
  onSubmitOrder,
  isSubmitting,
  sessionActive,
}: CartDrawerProps) {
  const cart = useRestaurantStore((s) => s.cart);
  const products = useRestaurantStore((s) => s.products);
  const updateCartQuantity = useRestaurantStore((s) => s.updateCartQuantity);
  const removeFromCart = useRestaurantStore((s) => s.removeFromCart);
  const updateCartNotes = useRestaurantStore((s) => s.updateCartNotes);

  const cartItemsWithDetails: CartItemWithProduct[] = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || product.isArchived) return null;
      return { ...item, product };
    })
    .filter((item): item is CartItemWithProduct => item !== null);

  // Separate available and sold-out items
  const availableItems = cartItemsWithDetails.filter((item) => item.product.isAvailable);
  const soldOutItems = cartItemsWithDetails.filter((item) => !item.product.isAvailable);

  // Total only includes available items (sold-out items will be excluded from order)
  const total = availableItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const hasSubmittableItems = availableItems.length > 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] sm:max-h-[80vh] sm:max-w-md sm:side-right flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-amber-600" />
            Your Cart
            {cart.length > 0 && (
              <Badge className="bg-amber-600 text-white">
                {cart.reduce((sum, i) => sum + i.quantity, 0)}
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Your cart is empty</p>
              <p className="text-sm mt-1">Add items from the menu to get started</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-2 space-y-3 min-h-0">
              {/* Sold-out items warning */}
              {soldOutItems.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <p className="font-medium mb-1">Sold out items (will not be ordered):</p>
                  {soldOutItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between mt-1">
                      <span className="line-through">{item.product.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:text-red-700"
                        onClick={() => removeFromCart(item.productId)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Available items */}
              {availableItems.map((item) => (
                <CartItemRow
                  key={item.productId}
                  item={item}
                  onUpdateQuantity={updateCartQuantity}
                  onRemove={removeFromCart}
                  onUpdateNotes={updateCartNotes}
                />
              ))}
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-between items-center font-semibold text-lg">
                <span>Total</span>
                <span className="text-amber-700">€{total.toFixed(2)}</span>
              </div>

              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white min-h-[48px] text-base font-semibold"
                size="lg"
                disabled={!hasSubmittableItems || isSubmitting || !sessionActive}
                onClick={onSubmitOrder}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : !sessionActive
                  ? 'Session Ended'
                  : !hasSubmittableItems
                  ? 'No available items'
                  : 'Submit Order'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  onUpdateNotes,
}: {
  item: CartItemWithProduct;
  onUpdateQuantity: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}) {
  const [notesValue, setNotesValue] = useState(item.notes);

  // Always show notes field
  return (
    <div className="bg-card border rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
          <p className="text-amber-700 text-sm font-semibold">
            €{item.product.price.toFixed(2)} each
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 rounded-full"
            onClick={() => {
              if (item.quantity <= 1) onRemove(item.productId);
              else onUpdateQuantity(item.productId, item.quantity - 1);
            }}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-6 text-center text-sm font-semibold">
            {item.quantity}
          </span>
          <Button
            size="icon"
            className="h-7 w-7 rounded-full bg-amber-600 hover:bg-amber-700"
            onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
          >
            <Plus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.productId)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs text-muted-foreground">
          Subtotal: €{(item.product.price * item.quantity).toFixed(2)}
        </span>
      </div>
      {/* Notes — always visible with clear label */}
      <div className="mt-2">
        <label className="text-[11px] font-medium text-amber-700 mb-1 block">
          ✏️ Special instructions
        </label>
        <Input
          className="h-8 text-xs border-amber-200 focus:border-amber-400"
          placeholder="e.g. no onions, well done, allergy..."
          value={notesValue}
          onChange={(e) => setNotesValue(e.target.value)}
          onBlur={() => onUpdateNotes(item.productId, notesValue)}
        />
      </div>
    </div>
  );
}
