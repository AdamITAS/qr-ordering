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
const spiceColors = ['', 'bg-yellow-100 text-yellow-800', 'bg-orange-100 text-orange-800', 'bg-red-100 text-red-800'];

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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
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
          className="h-9"
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
          className="bg-amber-600 hover:bg-amber-700 text-white min-h-[40px]"
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
              className={`overflow-hidden ${
                product.isArchived
                  ? 'opacity-50 border-gray-200'
                  : 'border-amber-100'
              }`}
            >
              <div className="aspect-[3/1] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center relative">
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
                    <Badge variant="secondary" className="text-xs bg-gray-200">
                      Archived
                    </Badge>
                  )}
                  {!product.isAvailable && !product.isArchived && (
                    <Badge variant="destructive" className="text-xs">
                      Sold Out
                    </Badge>
                  )}
                  {product.isAvailable && !product.isArchived && (
                    <Badge className="text-xs bg-green-100 text-green-800">
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
                  <h3 className="font-semibold text-sm">{product.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-amber-700 text-sm">
                      €{product.price.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {product.category}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit
                  </Button>

                  {product.isArchived ? (
                    // UNARCHIVE button — was missing!
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-green-300 text-green-600"
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
                          className="h-8 text-xs border-red-300 text-red-600"
                          onClick={() => markProductSoldOut(product.id)}
                        >
                          <EyeOff className="h-3 w-3 mr-1" />
                          Sold Out
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs border-green-300 text-green-600"
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
                            className="h-8 text-xs border-gray-300 text-gray-500"
                          >
                            <Archive className="h-3 w-3 mr-1" />
                            Archive
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive Product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will hide &quot;{product.name}&quot; from the menu. You can restore it anytime using the &quot;Restore&quot; button.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
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
        <div className="text-center py-12 text-muted-foreground">
          <p>No products found</p>
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
      />
    </div>
  );
}
