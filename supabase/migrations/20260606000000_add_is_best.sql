-- Add is_best column to products table to support designating Best Products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best boolean NOT NULL DEFAULT false;
