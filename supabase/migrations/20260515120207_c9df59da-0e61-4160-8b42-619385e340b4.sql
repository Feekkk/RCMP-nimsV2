-- Drop old tables and helper function tied to the voting board
DROP FUNCTION IF EXISTS public.get_vote_counts() CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.feature_requests CASCADE;

-- Inventory item status enum
DO $$ BEGIN
  CREATE TYPE public.item_status AS ENUM ('in_stock', 'low_stock', 'out_of_stock');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Inventory items
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  description text,
  category text,
  location text,
  supplier text,
  quantity integer NOT NULL DEFAULT 0,
  low_stock_threshold integer NOT NULL DEFAULT 5,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  image_url text,
  status public.item_status NOT NULL DEFAULT 'in_stock',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view items"
  ON public.inventory_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert items"
  ON public.inventory_items FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update items"
  ON public.inventory_items FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete items"
  ON public.inventory_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-compute status from quantity + threshold
CREATE OR REPLACE FUNCTION public.compute_item_status()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.quantity <= 0 THEN
    NEW.status := 'out_of_stock';
  ELSIF NEW.quantity <= NEW.low_stock_threshold THEN
    NEW.status := 'low_stock';
  ELSE
    NEW.status := 'in_stock';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_inventory_status
BEFORE INSERT OR UPDATE ON public.inventory_items
FOR EACH ROW EXECUTE FUNCTION public.compute_item_status();

CREATE INDEX idx_inventory_status ON public.inventory_items(status);
CREATE INDEX idx_inventory_category ON public.inventory_items(category);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_items;