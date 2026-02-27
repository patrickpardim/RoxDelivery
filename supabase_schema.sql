-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  cep TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  complement TEXT,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL DEFAULT 'Meu Restaurante',
  currency TEXT NOT NULL DEFAULT 'R$',
  delivery_fee NUMERIC NOT NULL DEFAULT 5.00,
  min_order NUMERIC NOT NULL DEFAULT 15.00,
  free_shipping_min_order NUMERIC,
  phone TEXT,
  address TEXT,
  cep TEXT,
  street TEXT,
  number TEXT,
  neighborhood TEXT,
  city TEXT,
  state TEXT,
  complement TEXT,
  reference TEXT,
  business_hours JSONB,
  payment_methods JSONB
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0
);

-- Items Table
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  is_available INTEGER DEFAULT 1
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  order_type TEXT NOT NULL DEFAULT 'delivery',
  total NUMERIC NOT NULL,
  payment_method TEXT,
  payment_timing TEXT,
  change_for NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL,
  price_at_time NUMERIC NOT NULL,
  item_name TEXT NOT NULL
);

-- Complement Categories Table
CREATE TABLE IF NOT EXISTS complement_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  is_required INTEGER DEFAULT 0, -- 0: Optional, 1: Mandatory
  min_select INTEGER DEFAULT 0,
  max_select INTEGER DEFAULT 1
);

-- Complements Table
CREATE TABLE IF NOT EXISTS complements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES complement_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  max_quantity INTEGER DEFAULT 1,
  is_visible INTEGER DEFAULT 1
);

-- Product Complements Link Table
CREATE TABLE IF NOT EXISTS product_complements (
  product_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  complement_category_id UUID NOT NULL REFERENCES complement_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, complement_category_id)
);

-- Order Item Complements Table
CREATE TABLE IF NOT EXISTS order_item_complements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  complement_id UUID NOT NULL REFERENCES complements(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- Seed Data (Optional - run only if tables are empty)
DO $$
DECLARE
  cat_copos UUID;
  cat_marmitas UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories) THEN
    INSERT INTO categories (name, order_index) VALUES ('Copos Montados', 0) RETURNING id INTO cat_copos;
    INSERT INTO categories (name, order_index) VALUES ('Marmitas', 1) RETURNING id INTO cat_marmitas;

    -- Copos Montados
    INSERT INTO items (category_id, name, description, price, image_url) VALUES 
    (cat_copos, 'O Clássico Raiz 300ml', 'Açaí, Leite Condensado, Granola, Banana, Leite em Pó', 15.00, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_copos, 'O Clássico Raiz 500ml', 'Açaí, Leite Condensado, Granola, Banana, Leite em Pó', 20.00, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_copos, 'Casadinho do Norte 300ml', 'Metade Açaí, Metade Cupuaçu', 16.00, 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_copos, 'Casadinho do Norte 500ml', 'Metade Açaí, Metade Cupuaçu', 22.00, 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_copos, 'Vulcão de Ninho 300ml', 'Açaí, Leite Condensado, Muito Ninho, Paçoca', 17.00, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_copos, 'Vulcão de Ninho 500ml', 'Açaí, Leite Condensado, Muito Ninho, Paçoca', 24.00, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_copos, 'Supremo Avelã 300ml', 'Açaí, Creme de Avelã Gourmet, Morangos, Leite em Pó', 19.00, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_copos, 'Supremo Avelã 500ml', 'Açaí, Creme de Avelã Gourmet, Morangos, Leite em Pó', 26.00, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');

    -- Marmitas
    INSERT INTO items (category_id, name, description, price, image_url) VALUES 
    (cat_marmitas, 'Marmita "Tudo Nosso" 500ml', 'Base de açaí + 4 fileiras de complementos (Morango, Ninho, Granola, Gotas de Chocolate)', 26.00, 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'),
    (cat_marmitas, 'Marmita "Monstra" 700ml', 'Base mista (Açaí + Cupuaçu) + 5 complementos à escolha do cliente. Ideal para dividir!', 35.00, 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3');
  END IF;
END $$;
