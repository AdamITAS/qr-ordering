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

const categoryColors: Record<string, string> = {
  Antipasti: 'bg-green-900/50 text-green-400 border-green-700',
  Pasta: 'bg-orange-900/50 text-orange-400 border-orange-700',
  Pizza: 'bg-red-900/50 text-red-400 border-red-700',
  Dolci: 'bg-pink-900/50 text-pink-400 border-pink-700',
  Drinks: 'bg-blue-900/50 text-blue-400 border-blue-700',
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
      className={`overflow-hidden transition-all bg-zinc-900 border-zinc-800 ${
        isSoldOut
          ? 'opacity-50'
          : 'hover:border-amber-600/30'
      }`}
    >
      <div className="aspect-[3/2] bg-zinc-800 flex items-center justify-center relative">
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
        {/* Category badge */}
        <Badge
          variant="outline"
          className={`absolute top-2 left-2 text-[10px] ${categoryColors[product.category] || 'bg-zinc-800 text-zinc-400 border-zinc-600'}`}
        >
          {product.category}
        </Badge>
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        <h3 className="font-semibold text-sm leading-tight text-white">
          {product.name}
          {(product.spiceLevel ?? 0) > 0 && (
            <span className="ml-1 text-xs" title={spiceLabels[product.spiceLevel]}>
              {spiceEmojis[product.spiceLevel]}
            </span>
          )}
        </h3>
        <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="font-bold text-amber-400 text-sm">
            €{product.price.toFixed(2)}
          </span>
          {isSoldOut ? (
            <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-500">
              Unavailable
            </Badge>
          ) : cartItem ? (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full border-zinc-600 text-zinc-300"
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
              <span className="w-6 text-center text-sm font-semibold text-white">
                {cartItem.quantity}
              </span>
              <Button
                size="icon"
                className="h-8 w-8 rounded-full bg-amber-600 hover:bg-amber-700"
                onClick={() => addToCart(product.id)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="icon"
              className="h-9 w-9 rounded-full bg-amber-600 hover:bg-amber-700"
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
