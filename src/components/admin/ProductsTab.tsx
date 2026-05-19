'use client';

import { useState } from 'react';
import { useRestaurantStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import ProductFormModal from './ProductFormModal';
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  EyeOff,
  Eye,
  Search,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { Product } from '@/lib/types';

const categoryEmojis: Record<string, string> = {
  Antipasti: '🥗',
  Pasta: '🍝',
  Pizza: '🍕',
  Dolci: '🍰',
  Drinks: '☕',
};

const spiceEmojis = ['', '🌶️', '🌶️🌶️', '🌶️🌶️🌶️'];
const spiceLabels = ['', 'Mild', 'Medium', 'Hot'];
const spiceColors = ['', 'bg-yellow-900/50 text-yellow-400', 'bg-orange-900/50 text-orange-400', 'bg-red-900/50 text-red-400'];

export default function ProductsTab() {
  const products = useRestaurantStore((s) => s.products);
  const markProductSoldOut = useRestaurantStore((s) => s.markProductSoldOut);
  const markProductAvailable = useRestaurantStore((s) => s.markProductAvailable);
  const archiveProduct = useRestaurantStore((s) => s.archiveProduct);
  const unarchiveProduct = useRestaurantStore((s) => s.unarchiveProduct);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];

  const filteredProducts = products.filter((p) => {
    if (!showArchived && p.isArchived) return false;
    const matchCategory = categoryFilter === 'All' || p.category === categoryFilter;
    const matchSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-700 text-white h-11"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-11 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-300 px-3 py-1 text-sm"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          className="h-11 border-zinc-700 text-zinc-400"
          onClick={() => setShowArchived(!showArchived)}
        >
          {showArchived ? (
            <Eye className="h-4 w-4 mr-1" />
          ) : (
            <EyeOff className="h-4 w-4 mr-1" />
          )}
          {showArchived ? 'Hide Archived' : 'Show Archived'}
        </Button>
        <Button
          className="bg-amber-600 hover:bg-amber-700 text-white h-11 text-base px-6"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const emoji = categoryEmojis[product.category] || '🍽️';

          return (
            <Card
              key={product.id}
              className={`overflow-hidden bg-zinc-900 ${
                product.isArchived
                  ? 'opacity-50 border-zinc-800'
                  : 'border-zinc-800 hover:border-amber-600/30'
              }`}
            >
              <div className="aspect-[3/1] bg-zinc-800 flex items-center justify-center relative overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl">{emoji}</span>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {product.isArchived && (
                    <Badge variant="secondary" className="text-xs bg-zinc-800 text-zinc-400">
                      Archived
                    </Badge>
                  )}
                  {!product.isAvailable && !product.isArchived && (
                    <Badge variant="destructive" className="text-xs">
                      Sold Out
                    </Badge>
                  )}
                  {product.isAvailable && !product.isArchived && (
                    <Badge className="text-xs bg-emerald-900/50 text-emerald-400 border-emerald-700">
                      Available
                    </Badge>
                  )}
                  {(product.spiceLevel ?? 0) > 0 && (
                    <Badge className={`text-xs ${spiceColors[product.spiceLevel] || ''}`}>
                      {spiceEmojis[product.spiceLevel]} {spiceLabels[product.spiceLevel]}
                    </Badge>
                  )}
                </div>
              </div>

              <CardContent className="p-4 space-y-2">
                <div>
                  <h3 className="font-semibold text-sm text-white">{product.name}</h3>
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-amber-400 text-sm">
                      €{product.price.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-400">
                      {product.category}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>

                  {product.isArchived ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
                      onClick={() => unarchiveProduct(product.id)}
                    >
                      <ArchiveRestore className="h-3 w-3 mr-1" />
                      Restore
                    </Button>
                  ) : (
                    <>
                      {product.isAvailable ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs border-red-800 text-red-400 hover:bg-red-900/30"
                          onClick={() => markProductSoldOut(product.id)}
                        >
                          <EyeOff className="h-3 w-3 mr-1" />
                          Sold Out
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs border-emerald-700 text-emerald-400 hover:bg-emerald-900/30"
                          onClick={() => markProductAvailable(product.id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Available
                        </Button>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs border-zinc-700 text-zinc-500 hover:bg-zinc-800"
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Archive
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Archive Product?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-400">
                              This will hide &quot;{product.name}&quot; from the menu. You can restore it anytime using the &quot;Restore&quot; button.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-zinc-800 text-zinc-300 border-zinc-700">Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={() => archiveProduct(product.id)}
                            >
                              Archive
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12 text-zinc-500">
          <p>No products found</p>
        </div>
      )}

      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />
    </div>
  );
}
