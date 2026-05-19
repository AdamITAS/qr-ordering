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

const spiceLabels = ['None', 'Mild', 'Medium', 'Hot'];
const spiceEmojis = ['', '🌶️', '🌶️🌶️', '🌶️🌶️🌶️'];

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
  const [spiceLevel, setSpiceLevel] = useState(product?.spiceLevel ?? 0);
  const [isAvailable, setIsAvailable] = useState(product?.isAvailable ?? true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset form when product changes or modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      if (product) {
        setName(product.name);
        setDescription(product.description);
        setPrice(product.price.toString());
        setCategory(product.category);
        setImageUrl(product.imageUrl);
        setSpiceLevel(product.spiceLevel ?? 0);
        setIsAvailable(product.isAvailable);
      } else {
        setName('');
        setDescription('');
        setPrice('');
        setCategory('Antipasti');
        setImageUrl('');
        setSpiceLevel(0);
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
        spiceLevel,
        isAvailable,
      });
    } else {
      addProduct({
        name: name.trim(),
        description: description.trim(),
        price: priceNum,
        category,
        imageUrl,
        spiceLevel,
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

          {/* Spice Level */}
          <div className="space-y-2">
            <Label>Spice Level</Label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={spiceLevel === level ? 'default' : 'outline'}
                  size="sm"
                  className={`flex-1 min-h-[36px] ${
                    spiceLevel === level
                      ? level === 0
                        ? 'bg-gray-600 hover:bg-gray-700 text-white'
                        : level === 1
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : level === 2
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                      : ''
                  }`}
                  onClick={() => setSpiceLevel(level)}
                >
                  <span className="text-xs">
                    {level === 0 ? 'None' : spiceEmojis[level]}
                    <span className="ml-1">{spiceLabels[level]}</span>
                  </span>
                </Button>
              ))}
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

          {/* Available toggle */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                isAvailable ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <Label className="cursor-pointer" onClick={() => setIsAvailable(!isAvailable)}>
                {isAvailable ? 'Available' : 'Unavailable (Sold Out)'}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                {isAvailable ? 'Customers can order this item' : 'Hidden from ordering, visible in menu as sold out'}
              </p>
            </div>
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
