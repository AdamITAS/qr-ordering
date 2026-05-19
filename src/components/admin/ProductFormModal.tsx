'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRestaurantStore } from '@/lib/store';
import type { Product } from '@/lib/types';
import { Camera, Upload, Trash2 } from 'lucide-react';

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
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const processImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Smart center-crop to 3:2 aspect ratio (ideal for food photography)
        // Algorithm: crop from center horizontally, bias slightly toward top
        // vertically (food is usually in the center-upper portion of photos)
        const canvas = document.createElement('canvas');
        const targetWidth = 800;
        const targetHeight = 533; // ~3:2 ratio — professional food framing
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d')!;
        // Fill with a neutral background in case of small images
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const sourceAspect = img.width / img.height;
        const targetAspect = targetWidth / targetHeight;

        let sx = 0, sy = 0, sw = img.width, sh = img.height;

        if (sourceAspect > targetAspect) {
          // Image is wider than target — crop sides (center horizontally)
          sw = img.height * targetAspect;
          sx = (img.width - sw) / 2;
        } else {
          // Image is taller than target — crop top/bottom
          // Bias toward the top 40% of the image (food is typically in upper-center)
          sh = img.width / targetAspect;
          // Use 1/3 offset from top instead of center to keep food visible
          sy = (img.height - sh) * 0.33;
          // Clamp to valid range
          sy = Math.max(0, Math.min(sy, img.height - sh));
        }

        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);
        setImageUrl(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImage(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImage(file);
    // Reset input so camera can be used again
    e.target.value = '';
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-white">{product ? 'Edit Product' : 'Add Product'}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {product ? 'Update product details below.' : 'Fill in the details to add a new product.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="product-name" className="text-zinc-300">Name *</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
              className="bg-zinc-800 border-zinc-700 text-white h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="product-description" className="text-zinc-300">Description</Label>
            <Textarea
              id="product-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Product description"
              rows={3}
              className="bg-zinc-800 border-zinc-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product-price" className="text-zinc-300">Price (€) *</Label>
              <Input
                id="product-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="bg-zinc-800 border-zinc-700 text-white h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-category" className="text-zinc-300">Category</Label>
              <select
                id="product-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-11 w-full rounded-md border border-zinc-700 bg-zinc-800 text-zinc-300 px-3 py-1 text-sm"
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
            <Label className="text-zinc-300">Spice Level</Label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map((level) => (
                <Button
                  key={level}
                  type="button"
                  variant={spiceLevel === level ? 'default' : 'outline'}
                  size="sm"
                  className={`flex-1 min-h-[40px] ${
                    spiceLevel === level
                      ? level === 0
                        ? 'bg-zinc-600 hover:bg-zinc-700 text-white'
                        : level === 1
                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                        : level === 2
                        ? 'bg-orange-600 hover:bg-orange-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                      : 'border-zinc-700 text-zinc-400'
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

          {/* Image: Camera + Upload */}
          <div className="space-y-2">
            <Label className="text-zinc-300">Image</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-700 text-amber-400 hover:bg-amber-900/20 h-11 px-4"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-11 px-4"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              {imageUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 h-11"
                  onClick={() => setImageUrl('')}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
              {/* Hidden camera input — opens device camera directly */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleCameraCapture}
              />
              {/* Hidden file input — gallery/file picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {imageUrl && (
              <div className="w-full max-w-[240px] aspect-[3/2] rounded-lg overflow-hidden border border-zinc-700">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>

          {/* Available toggle */}
          <div className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
            <button
              type="button"
              role="switch"
              aria-checked={isAvailable}
              onClick={() => setIsAvailable(!isAvailable)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${
                isAvailable ? 'bg-emerald-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <Label className="cursor-pointer text-zinc-300" onClick={() => setIsAvailable(!isAvailable)}>
                {isAvailable ? 'Available' : 'Unavailable (Sold Out)'}
              </Label>
              <p className="text-[11px] text-zinc-500">
                {isAvailable ? 'Customers can order this item' : 'Hidden from ordering, visible in menu as sold out'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-zinc-700 text-zinc-300 h-11">
            Cancel
          </Button>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white h-11 px-6"
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
