import express from 'express';
import { createServer as createViteServer } from 'vite';
import supabase from './server/supabase.ts';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  
  // Upload Endpoint
  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching settings:', error);
        // Fallback to defaults if DB error
        return res.json({
          id: 1,
          name: 'RoxDelivery',
          currency: 'R$',
          delivery_fee: 5.00,
          min_order: 15.00,
          business_hours: {},
          payment_methods: {}
        });
      }

      if (!settings) {
        // Return defaults if no settings found
        return res.json({
          id: 1,
          name: 'RoxDelivery',
          currency: 'R$',
          delivery_fee: 5.00,
          min_order: 15.00,
          business_hours: {},
          payment_methods: {}
        });
      }
      
      res.json(settings);
    } catch (err) {
      console.error('Unexpected error fetching settings:', err);
      res.json({
        id: 1,
        name: 'RoxDelivery',
        currency: 'R$',
        delivery_fee: 5.00,
        min_order: 15.00,
        business_hours: {},
        payment_methods: {}
      });
    }
  });

  app.put('/api/settings', async (req, res) => {
    const { name, currency, delivery_fee, min_order, free_shipping_min_order, phone, address, cep, street, number, neighborhood, city, state, complement, reference, business_hours, payment_methods } = req.body;
    
    const { error } = await supabase
      .from('settings')
      .update({
        name, currency, delivery_fee, min_order, free_shipping_min_order, phone, address, cep, street, number, neighborhood, city, state, complement, reference,
        business_hours, // Pass object directly for JSONB
        payment_methods // Pass object directly for JSONB
      })
      .eq('id', 1);

    if (error) {
      console.error('Error updating settings:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  // Menu
  app.get('/api/menu', async (req, res) => {
    // Fetch categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .order('order_index');
    
    if (catError) return res.status(500).json({ error: catError.message });

    // Fetch items
    const { data: items, error: itemError } = await supabase
      .from('items')
      .select('*')
      .eq('is_available', 1);

    if (itemError) return res.status(500).json({ error: itemError.message });
    
    // Fetch complements manually to match the structure
    // This is N+1 but safe for prototype
    const itemsWithComplements = await Promise.all(items.map(async (item: any) => {
      // Get linked complement categories
      const { data: productComplements } = await supabase
        .from('product_complements')
        .select('complement_category_id')
        .eq('product_id', item.id);
      
      const categoryIds = productComplements?.map((pc: any) => pc.complement_category_id) || [];
      
      if (categoryIds.length === 0) return { ...item, complement_categories: [] };

      const { data: compCats } = await supabase
        .from('complement_categories')
        .select('*')
        .in('id', categoryIds);

      const compCatsWithItems = await Promise.all((compCats || []).map(async (cc: any) => {
        const { data: cItems } = await supabase
          .from('complements')
          .select('*')
          .eq('category_id', cc.id)
          .eq('is_visible', 1);
        return { ...cc, items: cItems || [] };
      }));
      
      return { ...item, complement_categories: compCatsWithItems };
    }));

    res.json({ categories, items: itemsWithComplements });
  });
  
  app.get('/api/admin/menu', async (req, res) => {
    const { data: categories } = await supabase.from('categories').select('*').order('order_index');
    const { data: items } = await supabase.from('items').select('*');
    res.json({ categories, items });
  });

  app.post('/api/categories', async (req, res) => {
    const { name } = req.body;
    // Let Supabase generate ID or generate here.
    // If I generate here:
    const id = uuidv4();
    const { error } = await supabase.from('categories').insert({ id, name });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, name });
  });

  app.put('/api/categories/:id', async (req, res) => {
    const { name } = req.body;
    const { error } = await supabase.from('categories').update({ name }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete('/api/categories/:id', async (req, res) => {
    const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post('/api/items', async (req, res) => {
    const { category_id, name, description, price, image_url } = req.body;
    const id = uuidv4();
    const { error } = await supabase.from('items').insert({ id, category_id, name, description, price, image_url });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, ...req.body });
  });
  
  app.put('/api/items/:id', async (req, res) => {
    const { category_id, name, description, price, image_url, is_available } = req.body;
    const { error } = await supabase
      .from('items')
      .update({ category_id, name, description, price, image_url, is_available: is_available ? 1 : 0 })
      .eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });
  
  app.delete('/api/items/:id', async (req, res) => {
    const { error } = await supabase.from('items').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Complements API
  app.get('/api/complements', async (req, res) => {
    const { data: categories } = await supabase.from('complement_categories').select('*');
    const { data: complements } = await supabase.from('complements').select('*').eq('is_visible', 1);
    
    // Fetch product counts
    // Supabase doesn't support GROUP BY easily with JS client for counts without using .rpc() or raw SQL.
    // I'll fetch all and count in JS for now (not efficient but works for small data).
    const { data: allLinks } = await supabase.from('product_complements').select('complement_category_id');
    
    const countMap = new Map();
    allLinks?.forEach((l: any) => {
      countMap.set(l.complement_category_id, (countMap.get(l.complement_category_id) || 0) + 1);
    });
    
    const result = categories?.map((cat: any) => ({
      ...cat,
      items: complements?.filter((c: any) => c.category_id === cat.id) || [],
      linked_products_count: countMap.get(cat.id) || 0
    }));
    
    res.json(result);
  });

  app.post('/api/complements/categories', async (req, res) => {
    const { name, is_required, min_select, max_select } = req.body;
    const id = uuidv4();
    const { error } = await supabase.from('complement_categories').insert({ id, name, is_required: is_required ? 1 : 0, min_select, max_select });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, ...req.body });
  });

  app.put('/api/complements/categories/:id', async (req, res) => {
    const { name, is_required, min_select, max_select } = req.body;
    const { error } = await supabase.from('complement_categories').update({ name, is_required: is_required ? 1 : 0, min_select, max_select }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete('/api/complements/categories/:id', async (req, res) => {
    const { error } = await supabase.from('complement_categories').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.post('/api/complements/items', async (req, res) => {
    const { category_id, name, price, max_quantity } = req.body;
    const id = uuidv4();
    const { error } = await supabase.from('complements').insert({ id, category_id, name, price, max_quantity });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, ...req.body });
  });
  
  app.put('/api/complements/items/:id', async (req, res) => {
    const { name, price, max_quantity, is_visible } = req.body;
    const { error } = await supabase.from('complements').update({ name, price, max_quantity, is_visible: is_visible ? 1 : 0 }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete('/api/complements/items/:id', async (req, res) => {
    const { error } = await supabase.from('complements').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Product Complements Linking
  app.get('/api/complements/product/:productId', async (req, res) => {
    const { data: links } = await supabase.from('product_complements').select('complement_category_id').eq('product_id', req.params.productId);
    res.json(links?.map((l: any) => l.complement_category_id) || []);
  });

  app.post('/api/complements/product/:productId', async (req, res) => {
    const { categoryIds } = req.body; // Array of category IDs
    const productId = req.params.productId;
    
    // Delete existing
    await supabase.from('product_complements').delete().eq('product_id', productId);
    
    // Insert new
    if (categoryIds.length > 0) {
      const inserts = categoryIds.map((catId: string) => ({
        product_id: productId,
        complement_category_id: catId
      }));
      const { error } = await supabase.from('product_complements').insert(inserts);
      if (error) return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  });

  // Get linked products for a complement category
  app.get('/api/complements/category/:categoryId/products', async (req, res) => {
    const { data: links } = await supabase.from('product_complements').select('product_id').eq('complement_category_id', req.params.categoryId);
    res.json(links?.map((l: any) => l.product_id) || []);
  });

  app.post('/api/complements/category/:categoryId/products', async (req, res) => {
    const { productIds } = req.body;
    const categoryId = req.params.categoryId;

    await supabase.from('product_complements').delete().eq('complement_category_id', categoryId);

    if (productIds.length > 0) {
      const inserts = productIds.map((prodId: string) => ({
        product_id: prodId,
        complement_category_id: categoryId
      }));
      const { error } = await supabase.from('product_complements').insert(inserts);
      if (error) return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  });

  // Customers API
  app.get('/api/customers', async (req, res) => {
    const { data: customers } = await supabase.from('customers').select('*').order('name');
    res.json(customers);
  });

  app.get('/api/customers/phone/:phone', async (req, res) => {
    const { data: customer } = await supabase.from('customers').select('*').eq('phone', req.params.phone).single();
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ error: 'Customer not found' });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    const { name, phone, cep, street, number, neighborhood, city, state, complement, reference } = req.body;
    const { error } = await supabase
      .from('customers')
      .update({ name, phone, cep, street, number, neighborhood, city, state, complement, reference })
      .eq('id', req.params.id);
    
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete('/api/customers/:id', async (req, res) => {
    const { error } = await supabase.from('customers').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Orders
  app.get('/api/orders', async (req, res) => {
    // Fetch orders with items and complements
    // Using Supabase deep join syntax:
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        items:order_items (
          *,
          complements:order_item_complements (*)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(orders);
  });

  app.post('/api/orders', async (req, res) => {
    const { customer_name, customer_phone, address, items, total, order_type, customer_details, payment_method, payment_timing, change_for } = req.body;
    const id = uuidv4();
    
    // 1. Create or Update Customer
    if (customer_details) {
      const { data: existingCustomer } = await supabase.from('customers').select('id').eq('phone', customer_phone).single();
      
      if (existingCustomer) {
        await supabase.from('customers').update({
          name: customer_name,
          cep: customer_details.cep,
          street: customer_details.street,
          number: customer_details.number,
          neighborhood: customer_details.neighborhood,
          city: customer_details.city,
          state: customer_details.state,
          complement: customer_details.complement,
          reference: customer_details.reference
        }).eq('phone', customer_phone);
      } else {
        await supabase.from('customers').insert({
          id: uuidv4(),
          name: customer_name,
          phone: customer_phone,
          cep: customer_details.cep,
          street: customer_details.street,
          number: customer_details.number,
          neighborhood: customer_details.neighborhood,
          city: customer_details.city,
          state: customer_details.state,
          complement: customer_details.complement,
          reference: customer_details.reference
        });
      }
    }

    // 2. Insert Order
    const { error: orderError } = await supabase.from('orders').insert({
      id,
      customer_name,
      customer_phone,
      address,
      total,
      order_type: order_type || 'delivery',
      payment_method,
      payment_timing,
      change_for
    });

    if (orderError) return res.status(500).json({ error: orderError.message });

    // 3. Insert Items and Complements
    for (const item of items) {
      const orderItemId = uuidv4();
      await supabase.from('order_items').insert({
        id: orderItemId,
        order_id: id,
        item_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
        item_name: item.name
      });

      if (item.selectedComplements) {
        for (const comp of item.selectedComplements) {
          await supabase.from('order_item_complements').insert({
            id: uuidv4(),
            order_item_id: orderItemId,
            complement_id: comp.id,
            name: comp.name,
            price: comp.price,
            quantity: 1
          });
        }
      }
    }

    res.json({ id, status: 'pending' });
  });

  app.put('/api/orders/:id/status', async (req, res) => {
    const { status } = req.body;
    const { error } = await supabase.from('orders').update({ status }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    // app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
