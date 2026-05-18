'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRestaurantStore } from '@/lib/store';
import type { Product } from '@/lib/types';

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

const CATEGORIES = ['Antipasti', 'Pasta', 'Pizza', 'Dolci', 'Drinks'];

export default function ProductFormModal({
  open,
  onOpenChange,
  product,
}: ProductFormModalProps) {
  const addProduct = useRestaurantStore((s) => s.addProduct);
  const updateProduct = useRestaurantStore((s) => s.updateProduct);

  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [category, setCategory] = useState(product?.category || 'Antipasti');
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || '');
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when product changes or modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset form when opening
      if (product) {
        setName(product.name);
        setDescription(product.description);
        setPrice(product.price.toString());
        setCategory(product.category);
        setImageUrl(product.imageUrl);
        setIsAvailable(product.isAvailable);
      } else {
        setName('');
        setDescription('');
        setPrice('');
        setCategory('Antipasti');
        setImageUrl('');
        setIsAvailable(true);
      }
    }
    onOpenChange(newOpen);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim() || !price.trim()) return;

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) return;

    if (product) {
      updateProduct(product.id, {
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        category,
        imageUrl,
        isAvailable,
      });
    } else {
      addProduct({
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        category,
        imageUrl,
        isAvailable,
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="product-name">Name *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-price">Price (€) *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-category">Category</Label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload Image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setImageUrl('')}
                >
                  Remove
                </Button>
              )}
            </div>
            {imageUrl && (
              <div className="w-24 h-24 rounded-lg overflow-hidden border">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="product-available"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="product-available">Available</Label>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white"
            onClick={handleSave}
            disabled={!name.trim() || !price.trim()}
          >
            {product ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
