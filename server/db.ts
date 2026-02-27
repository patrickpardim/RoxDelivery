import Database from 'better-sqlite3';

const db = new Database('olaclick.db');

// Enable foreign keys
db.pragma('foreign_keys = ON');

export function initDb() {
  // Customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT 'Meu Restaurante',
      currency TEXT NOT NULL DEFAULT 'R$',
      delivery_fee REAL NOT NULL DEFAULT 5.00,
      min_order REAL NOT NULL DEFAULT 15.00,
      free_shipping_min_order REAL,
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
      business_hours TEXT,
      payment_methods TEXT
    );
    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);

  // Migration: Add business_hours column if it doesn't exist
  const columns = db.pragma('table_info(settings)') as any[];
  const hasBusinessHours = columns.some(col => col.name === 'business_hours');
  if (!hasBusinessHours) {
    db.exec("ALTER TABLE settings ADD COLUMN business_hours TEXT");
  }

  // Migration: Add cep column if it doesn't exist
  const hasCep = columns.some(col => col.name === 'cep');
  if (!hasCep) {
    db.exec("ALTER TABLE settings ADD COLUMN cep TEXT");
  }

  // Migration: Add other address columns
  const newCols = ['street', 'number', 'neighborhood', 'city', 'state', 'complement', 'reference', 'payment_methods', 'free_shipping_min_order'];
  newCols.forEach(colName => {
    if (!columns.some(col => col.name === colName)) {
      const type = colName === 'free_shipping_min_order' ? 'REAL' : 'TEXT';
      db.exec(`ALTER TABLE settings ADD COLUMN ${colName} ${type}`);
    }
  });

  // Categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      order_index INTEGER DEFAULT 0
    );
  `);

  // Items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      image_url TEXT,
      is_available INTEGER DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  // Orders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      address TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      order_type TEXT NOT NULL DEFAULT 'delivery',
      total REAL NOT NULL,
      payment_method TEXT,
      payment_timing TEXT,
      change_for REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migration: Add order_type column if it doesn't exist
  const orderColumns = db.pragma('table_info(orders)') as any[];
  const hasOrderType = orderColumns.some(col => col.name === 'order_type');
  if (!hasOrderType) {
    db.exec("ALTER TABLE orders ADD COLUMN order_type TEXT DEFAULT 'delivery'");
  }
  
  // Migration: Add payment columns
  const paymentCols = ['payment_method', 'payment_timing', 'change_for'];
  paymentCols.forEach(colName => {
    if (!orderColumns.some(col => col.name === colName)) {
      const type = colName === 'change_for' ? 'REAL' : 'TEXT';
      db.exec(`ALTER TABLE orders ADD COLUMN ${colName} ${type}`);
    }
  });

  // Order items table
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_at_time REAL NOT NULL,
      item_name TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );
  `);

  // Complement Categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS complement_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_required INTEGER DEFAULT 0, -- 0: Optional, 1: Mandatory
      min_select INTEGER DEFAULT 0,
      max_select INTEGER DEFAULT 1
    );
  `);

  // Complements (Items within a category)
  db.exec(`
    CREATE TABLE IF NOT EXISTS complements (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL DEFAULT 0,
      max_quantity INTEGER DEFAULT 1,
      is_visible INTEGER DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES complement_categories(id) ON DELETE CASCADE
    );
  `);

  // Link between Products (Items) and Complement Categories
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_complements (
      product_id TEXT NOT NULL,
      complement_category_id TEXT NOT NULL,
      PRIMARY KEY (product_id, complement_category_id),
      FOREIGN KEY (product_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (complement_category_id) REFERENCES complement_categories(id) ON DELETE CASCADE
    );
  `);

  // Complements selected in an order
  db.exec(`
    CREATE TABLE IF NOT EXISTS order_item_complements (
      id TEXT PRIMARY KEY,
      order_item_id TEXT NOT NULL,
      complement_id TEXT NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE
    );
  `);
  
  // Seed data if empty or if old data exists
  const acaiCategory = db.prepare('SELECT id FROM categories WHERE name = ?').get('Copos Montados');
  
  if (!acaiCategory) {
    // Clear old data
    db.prepare('DELETE FROM items').run();
    db.prepare('DELETE FROM categories').run();
    
    const catId1 = 'cat_copos';
    const catId2 = 'cat_marmitas';
    
    db.prepare('INSERT INTO categories (id, name, order_index) VALUES (?, ?, ?)').run(catId1, 'Copos Montados', 0);
    db.prepare('INSERT INTO categories (id, name, order_index) VALUES (?, ?, ?)').run(catId2, 'Marmitas', 1);
    
    // Copos Montados
    // O Clássico Raiz
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_raiz_300', catId1, 'O Clássico Raiz 300ml', 'Açaí, Leite Condensado, Granola, Banana, Leite em Pó', 15.00, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_raiz_500', catId1, 'O Clássico Raiz 500ml', 'Açaí, Leite Condensado, Granola, Banana, Leite em Pó', 20.00, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );

    // Casadinho do Norte
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_casadinho_300', catId1, 'Casadinho do Norte 300ml', 'Metade Açaí, Metade Cupuaçu', 16.00, 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_casadinho_500', catId1, 'Casadinho do Norte 500ml', 'Metade Açaí, Metade Cupuaçu', 22.00, 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );

    // Vulcão de Ninho
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_vulcao_300', catId1, 'Vulcão de Ninho 300ml', 'Açaí, Leite Condensado, Muito Ninho, Paçoca', 17.00, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_vulcao_500', catId1, 'Vulcão de Ninho 500ml', 'Açaí, Leite Condensado, Muito Ninho, Paçoca', 24.00, 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );

    // Supremo Avelã
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_supremo_300', catId1, 'Supremo Avelã 300ml', 'Açaí, Creme de Avelã Gourmet, Morangos, Leite em Pó', 19.00, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_supremo_500', catId1, 'Supremo Avelã 500ml', 'Açaí, Creme de Avelã Gourmet, Morangos, Leite em Pó', 26.00, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );

    // Marmitas
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_marmita_tudo', catId2, 'Marmita "Tudo Nosso" 500ml', 'Base de açaí + 4 fileiras de complementos (Morango, Ninho, Granola, Gotas de Chocolate)', 26.00, 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );
    db.prepare('INSERT INTO items (id, category_id, name, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)').run(
      'item_marmita_monstra', catId2, 'Marmita "Monstra" 700ml', 'Base mista (Açaí + Cupuaçu) + 5 complementos à escolha do cliente. Ideal para dividir!', 35.00, 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
    );
  }
}

export default db;
