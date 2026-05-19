'use client';

import { Product } from '@/lib/types';
import { useRestaurantStore } from '@/lib/store';
import { Plus, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const spiceEmojis = ['', '🌶️', '🌶️🌶️', '🌶️🌶️🌶️'];
const spiceLabels = ['', 'Mild', 'Medium', 'Hot'];

const categoryEmojis: Record<string, string> = {
  Antipasti: '🥗',
  Pasta: '🍝',
  Pizza: '🍕',
  Dolci: '🍰',
  Drinks: '☕',
};

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const cart = useRestaurantStore((s) => s.cart);
  const addToCart = useRestaurantStore((s) => s.addToCart);
  const updateCartQuantity = useRestaurantStore((s) => s.updateCartQuantity);
  const removeFromCart = useRestaurantStore((s) => s.removeFromCart);

  const cartItem = cart.find((c) => c.productId === product.id);
  const isSoldOut = !product.isAvailable && !product.isArchived;
  const isArchived = product.isArchived;

  if (isArchived) return null;

  const emoji = categoryEmojis[product.category] || '🍽️';

  return (
    <Card
      className={`overflow-hidden transition-all ${
        isSoldOut
          ? 'opacity-60 bg-muted/50'
          : 'hover:shadow-md border-amber-100'
      }`}
    >
      <div className="aspect-[4/3] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center relative">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-5xl">{emoji}</span>
        )}
        {isSoldOut && (
          <Badge
            variant="destructive"
            className="absolute top-2 right-2 text-xs"
          >
            Sold Out
          </Badge>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        <h3 className="font-semibold text-sm leading-tight text-foreground">
          {product.name}
          {(product.spiceLevel ?? 0) > 0 && (
            <span className="ml-1 text-xs" title={spiceLabels[product.spiceLevel]}>
              {spiceEmojis[product.spiceLevel]}
            </span>
          )}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-amber-700 text-sm">
            €{product.price.toFixed(2)}
          </span>
          {isSoldOut ? (
            <Badge variant="secondary" className="text-xs">
              Unavailable
            </Badge>
          ) : cartItem ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-full border-amber-300"
                onClick={() => {
                  if (cartItem.quantity <= 1) {
                    removeFromCart(product.id);
                  } else {
                    updateCartQuantity(product.id, cartItem.quantity - 1);
                  }
                }}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-6 text-center text-sm font-semibold">
                {cartItem.quantity}
              </span>
              <Button
                size="icon"
                className="h-7 w-7 rounded-full bg-amber-600 hover:bg-amber-700"
                onClick={() => addToCart(product.id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              className="h-8 w-8 rounded-full bg-amber-600 hover:bg-amber-700"
              onClick={() => addToCart(product.id)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
