-- Add is_real_deleted column to products table to support complete deletion of products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_real_deleted boolean NOT NULL DEFAULT false;
