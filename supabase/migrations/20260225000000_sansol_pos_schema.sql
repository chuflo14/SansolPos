-- Migration: 20260225000000_sansol_pos_schema
-- Description: Core SansolPos schemas with Multi-tenant RLS policies.

CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE store_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'cashier', -- 'admin', 'manager', 'cashier'
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, user_id)
);

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sale_price NUMERIC(10, 2) NOT NULL,
    cost_price NUMERIC(10, 2) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    sku TEXT,
    photo_url TEXT,
    min_stock INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    customer_phone TEXT,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    receipt_url TEXT,
    
    -- AFIP fields
    afip_type TEXT,
    afip_point_of_sale INTEGER,
    afip_invoice_number INTEGER,
    afip_cae TEXT,
    afip_cae_expiration DATE,
    afip_status TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'IN', 'OUT', 'SALE', 'ADJUSTMENT'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
    receipt_logo_url TEXT,
    receipt_business_name TEXT,
    receipt_cuit TEXT,
    receipt_address TEXT,
    receipt_legal_footer TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Helper Function: Check if user belongs to a store
CREATE OR REPLACE FUNCTION user_in_store(check_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM store_users 
        WHERE store_id = check_store_id 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies

-- stores
CREATE POLICY "Users can view their stores" ON stores FOR SELECT USING (
    id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())
);

-- store_users
CREATE POLICY "Users can view users in their stores" ON store_users FOR SELECT USING (
    store_id IN (SELECT store_id FROM store_users WHERE user_id = auth.uid())
);

-- categories
CREATE POLICY "Users can access store categories" ON categories FOR ALL USING (
    user_in_store(store_id)
);

-- products
CREATE POLICY "Users can access store products" ON products FOR ALL USING (
    user_in_store(store_id)
);

-- sales
CREATE POLICY "Users can access store sales" ON sales FOR ALL USING (
    user_in_store(store_id)
);

-- sale_items
CREATE POLICY "Users can access store sale items" ON sale_items FOR ALL USING (
    EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND user_in_store(sales.store_id))
);

-- stock_movements
CREATE POLICY "Users can access store stock movements" ON stock_movements FOR ALL USING (
    user_in_store(store_id)
);

-- expenses
CREATE POLICY "Users can access store expenses" ON expenses FOR ALL USING (
    user_in_store(store_id)
);

-- store_settings
CREATE POLICY "Users can access store settings" ON store_settings FOR ALL USING (
    user_in_store(store_id)
);
