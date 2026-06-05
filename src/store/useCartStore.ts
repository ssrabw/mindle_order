import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product, ProductVariant } from '../types/product';

export interface CartItem {
  product: Product;
  variant: ProductVariant;
  quantity: number;
}

interface CartState {
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, quantity: number) => void;
  removeFromCart: (productId: number, variantId: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      isCartOpen: false,
      setIsCartOpen: (isOpen) => set({ isCartOpen: isOpen }),
      addToCart: (product, variant, quantity) =>
        set((state) => {
          const existingItem = state.cart.find(
            (item) => item.product.id === product.id && item.variant.id === variant.id
          );
          
          if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity <= 0) {
              return {
                cart: state.cart.filter(
                  (item) => !(item.product.id === product.id && item.variant.id === variant.id)
                ),
              };
            }
            return {
              cart: state.cart.map((item) =>
                item.product.id === product.id && item.variant.id === variant.id
                  ? { ...item, quantity: newQuantity }
                  : item
              ),
            };
          }
          
          if (quantity <= 0) return {};
          
          return { cart: [...state.cart, { product, variant, quantity }] };
        }),
      removeFromCart: (productId, variantId) =>
        set((state) => ({
          cart: state.cart.filter(
            (item) => !(item.product.id === productId && item.variant.id === variantId)
          ),
        })),
      clearCart: () => set({ cart: [] }),
    }),
    {
      name: 'mindle-wholesale-cart',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
);
