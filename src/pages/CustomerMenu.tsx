import { useState, useEffect, FormEvent } from 'react';
import { Category, Item, Settings, ComplementCategory, Complement } from '../types';
import { ShoppingCart, ShoppingBag, Plus, Minus, X, ChevronRight, Phone, MapPin, User, ChevronDown, ChevronUp, Check, ChevronLeft, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

interface CartItem extends Item {
  quantity: number;
  selectedComplements?: Complement[];
  tempId?: string; // Unique ID for cart items with different complements
}

export default function CustomerMenu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'details' | 'success'>('cart');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [paymentTiming, setPaymentTiming] = useState<'online' | 'delivery'>('delivery');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [changeFor, setChangeFor] = useState<string>('');
  
  // Item Modal State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedComplements, setSelectedComplements] = useState<Record<string, Complement[]>>({}); // categoryId -> selected complements
  const [modalQuantity, setModalQuantity] = useState(1);
  
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
    address: '',
    cep: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    complement: '',
    reference: '',
  });

  const handleCepBlur = async () => {
    const cep = customerDetails.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setCustomerDetails(prev => ({
          ...prev,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar CEP', error);
    }
  };

  useEffect(() => {
    fetch('/api/menu')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories);
        setItems(data.items);
      });
    
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings);
  }, []);

  const [storeStatus, setStoreStatus] = useState<{ isOpen: boolean; message?: string }>({ isOpen: true });

  const checkStoreStatus = () => {
    if (!settings?.business_hours) return { isOpen: true };

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Helper to check a specific day's schedule
    const checkDay = (dayIndex: number, time: number, isYesterday: boolean) => {
      const dayStr = dayIndex.toString();
      const schedule = settings.business_hours![dayStr];
      
      if (!schedule || !schedule.isOpen || !schedule.ranges) return false;

      for (const range of schedule.ranges) {
        const [startHour, startMinute] = range.start.split(':').map(Number);
        const [endHour, endMinute] = range.end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        if (isYesterday) {
          // Only care about overnight ranges from yesterday
          if (endTime < startTime) {
             // If yesterday was overnight, and current time is before end time
             if (time < endTime) return true;
          }
        } else {
          // Today
          if (endTime < startTime) {
            // Overnight range starting today
            if (time >= startTime) return true;
          } else {
            // Normal range
            if (time >= startTime && time < endTime) return true;
          }
        }
      }
      return false;
    };

    // Check today
    if (checkDay(currentDay, currentTime, false)) return { isOpen: true };

    // Check yesterday (for overnight shifts)
    const yesterday = (currentDay - 1 + 7) % 7;
    if (checkDay(yesterday, currentTime, true)) return { isOpen: true };

    // If closed, find the next opening time (simplified: just show today's or generic)
    const schedule = settings.business_hours[currentDay.toString()];
    if (schedule && schedule.isOpen && schedule.ranges && schedule.ranges.length > 0) {
        const mainRange = schedule.ranges[0];
        return { 
          isOpen: false, 
          message: `Fechado no momento. Atendimento das ${mainRange.start} às ${mainRange.end}.` 
        };
    }

    return { isOpen: false, message: 'Estamos fechados hoje.' };
  };

  useEffect(() => {
    if (settings) {
      setStoreStatus(checkStoreStatus());
      const interval = setInterval(() => {
        setStoreStatus(checkStoreStatus());
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [settings]);

  const openItemModal = (item: Item) => {
    setSelectedItem(item);
    setSelectedComplements({});
    setModalQuantity(1);
  };

  const closeItemModal = () => {
    setSelectedItem(null);
    setSelectedComplements({});
  };

  const toggleComplement = (category: ComplementCategory, complement: Complement) => {
    setSelectedComplements(prev => {
      const currentSelection = prev[category.id] || [];
      const isSelected = currentSelection.find(c => c.id === complement.id);

      if (isSelected) {
        return {
          ...prev,
          [category.id]: currentSelection.filter(c => c.id !== complement.id)
        };
      } else {
        // Check max limit
        if (currentSelection.length >= category.max_select) {
          // If max is 1, replace. If > 1, do nothing (or show error)
          if (category.max_select === 1) {
             return {
              ...prev,
              [category.id]: [complement]
            };
          }
          return prev;
        }
        return {
          ...prev,
          [category.id]: [...currentSelection, complement]
        };
      }
    });
  };

  const addToCart = () => {
    if (!selectedItem) return;

    // Validate required categories
    const missingRequired = selectedItem.complement_categories?.filter(cat => 
      cat.is_required && (!selectedComplements[cat.id] || selectedComplements[cat.id].length < cat.min_select)
    );

    if (missingRequired && missingRequired.length > 0) {
      alert(`Por favor, selecione as opções obrigatórias em: ${missingRequired.map(c => c.name).join(', ')}`);
      return;
    }

    const flatComplements = Object.values(selectedComplements).flat();
    
    const newItem: CartItem = {
      ...selectedItem,
      quantity: modalQuantity,
      selectedComplements: flatComplements,
      tempId: Math.random().toString(36).substr(2, 9)
    };

    setCart(prev => [...prev, newItem]);
    closeItemModal();
    setIsCartOpen(true);
  };

  const updateQuantity = (tempId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.tempId === tempId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (tempId: string) => {
    setCart(prev => prev.filter(item => item.tempId !== tempId));
  };

  const getItemTotal = (item: CartItem) => {
    const complementsTotal = item.selectedComplements?.reduce((acc, c) => acc + c.price, 0) || 0;
    return (item.price + complementsTotal) * item.quantity;
  };

  const cartTotal = cart.reduce((acc, item) => acc + getItemTotal(item), 0);
  
  const deliveryFee = orderType === 'delivery' 
    ? (settings?.free_shipping_min_order && cartTotal >= settings.free_shipping_min_order ? 0 : (settings?.delivery_fee || 0))
    : 0;
    
  const finalTotal = cartTotal + deliveryFee;

  const handlePhoneBlur = async () => {
    if (customerDetails.phone.length < 10) return;

    try {
      const res = await fetch(`/api/customers/phone/${customerDetails.phone}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerDetails(prev => ({
          ...prev,
          name: data.name,
          cep: data.cep || '',
          street: data.street || '',
          number: data.number || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
          complement: data.complement || '',
          reference: data.reference || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar cliente', error);
    }
  };

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!storeStatus.isOpen) {
      alert(storeStatus.message);
      return;
    }

    if (!paymentMethod) {
      alert('Selecione uma forma de pagamento.');
      return;
    }

    if (paymentMethod === 'cash' && changeFor && parseFloat(changeFor) < finalTotal) {
       alert('O valor do troco deve ser maior que o total do pedido.');
       return;
    }
    
    const orderData = {
      customer_name: customerDetails.name,
      customer_phone: customerDetails.phone,
      address: orderType === 'delivery' 
        ? `${customerDetails.street}, ${customerDetails.number} - ${customerDetails.neighborhood}, ${customerDetails.city}/${customerDetails.state}. CEP: ${customerDetails.cep}. ${customerDetails.complement ? `Comp: ${customerDetails.complement}.` : ''} ${customerDetails.reference ? `Ref: ${customerDetails.reference}` : ''}`
        : 'Retirada no Local',
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price, // Base price
        selectedComplements: item.selectedComplements // Pass complements to backend
      })),
      total: finalTotal,
      order_type: orderType,
      customer_details: orderType === 'delivery' ? customerDetails : undefined,
      payment_method: paymentMethod,
      payment_timing: orderType === 'pickup' ? 'pickup' : paymentTiming,
      change_for: changeFor ? parseFloat(changeFor) : undefined
    };

    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });

    if (res.ok) {
      setCheckoutStep('success');
      setCart([]);

      // Send WhatsApp message
      if (settings?.phone) {
        const message = `*Novo Pedido!* 🛍️\n\n` +
          `*Cliente:* ${orderData.customer_name}\n` +
          `*Telefone:* ${orderData.customer_phone}\n` +
          `*Tipo:* ${orderType === 'delivery' ? 'Entrega 🛵' : 'Retirada 🏪'}\n` +
          (orderType === 'delivery' ? `*Endereço:* ${orderData.address}\n` : '') +
          `\n*Itens:*\n` +
          orderData.items.map(item => 
            `- ${item.quantity}x ${item.name}` + 
            (item.selectedComplements && item.selectedComplements.length > 0 
              ? `\n  (${item.selectedComplements.map(c => c.name).join(', ')})` 
              : '')
          ).join('\n') +
          `\n\n*Pagamento:* ${
            orderData.payment_timing === 'online' ? 'Online' : (orderType === 'pickup' ? 'Na Retirada' : 'Na Entrega')
          } - ${
             paymentMethod === 'pix' ? 'PIX' :
             paymentMethod === 'credit_card' ? 'Cartão de Crédito' :
             paymentMethod === 'debit_card' ? 'Cartão de Débito' :
             'Dinheiro'
          }` +
          (paymentMethod === 'cash' && changeFor ? `\n*Troco para:* R$ ${changeFor}` : '') +
          `\n\n*Total:* R$ ${finalTotal.toFixed(2).replace('.', ',')}`;

        const whatsappUrl = `https://wa.me/${settings.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
      }
    }
  };

  if (!settings) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        {!storeStatus.isOpen && (
          <div className="bg-red-500 text-white text-center py-2 px-4 text-sm font-medium">
            {storeStatus.message}
          </div>
        )}
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{settings.name}</h1>
            <p className="text-sm text-gray-500">Entrega • {settings.min_order > 0 ? `Mín. R$ ${settings.min_order.toFixed(2).replace('.', ',')}` : 'Sem mín.'}</p>
            {settings.street && (
              <p className="text-xs text-gray-400 mt-1">
                {settings.street}, {settings.number} - {settings.neighborhood}, {settings.city}/{settings.state}
                {settings.complement && ` (${settings.complement})`}
              </p>
            )}
          </div>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 bg-purple-100 text-purple-600 rounded-full hover:bg-purple-200 transition"
          >
            <ShoppingCart className="w-6 h-6" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {cart.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Menu Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {categories.map(category => {
          const categoryItems = items.filter(i => i.category_id === category.id);
          if (categoryItems.length === 0) return null;

          return (
            <div key={category.id} id={category.id}>
              <h2 className="text-xl font-bold text-gray-800 mb-4">{category.name}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 hover:shadow-md transition cursor-pointer" onClick={() => openItemModal(item)}>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-24 h-24 object-cover rounded-lg bg-gray-100" />
                    )}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-gray-900">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                        <button className="p-1 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-100">
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </main>

      {/* Item Full Page View */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-4 z-10 shadow-sm">
              <button onClick={closeItemModal} className="p-2 hover:bg-gray-100 rounded-full transition">
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <h2 className="text-lg font-bold flex-1 text-center pr-10 text-gray-900">{selectedItem.name}</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50">
              <div className="max-w-5xl mx-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Image */}
                <div className="space-y-4">
                  <div className="aspect-square w-full bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
                    {selectedItem.image_url ? (
                      <img src={selectedItem.image_url} alt={selectedItem.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-20 h-20" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: Details & Options */}
                <div className="space-y-6 pb-24 md:pb-0">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{selectedItem.name}</h1>
                    <p className="text-gray-500 leading-relaxed mb-4">{selectedItem.description}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">R$ {selectedItem.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  {/* Complements Sections */}
                  {selectedItem.complement_categories?.map(cat => (
                    <div key={cat.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h3 className="font-bold text-lg text-gray-900">{cat.name}</h3>
                          <p className="text-sm text-gray-500">Selecione até {cat.max_select} opções</p>
                        </div>
                        <span className={clsx(
                          "text-xs font-bold px-3 py-1 rounded-full",
                          cat.is_required ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                        )}>
                          {cat.is_required ? 'OBRIGATÓRIO' : 'OPCIONAL'}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        {cat.items?.map(comp => {
                          const isSelected = selectedComplements[cat.id]?.some(c => c.id === comp.id);
                          return (
                            <label 
                              key={comp.id} 
                              className={clsx(
                                "flex justify-between items-center p-4 rounded-xl border cursor-pointer transition-all",
                                isSelected ? "border-purple-600 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={clsx(
                                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                  isSelected ? "bg-purple-600 border-purple-600" : "border-gray-300"
                                )}>
                                  {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                </div>
                                <span className="font-medium text-gray-900">{comp.name}</span>
                              </div>
                              <span className="font-medium text-gray-600">
                                {comp.price > 0 ? `+ R$ ${comp.price.toFixed(2).replace('.', ',')}` : 'Grátis'}
                              </span>
                              <input 
                                type="checkbox" 
                                className="hidden"
                                checked={isSelected || false}
                                onChange={() => toggleComplement(cat, comp)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="bg-white border-t border-gray-100 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
              <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 bg-gray-100 rounded-xl p-1">
                  <button 
                    className="p-3 hover:bg-white rounded-lg transition shadow-sm disabled:opacity-50" 
                    onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                    disabled={modalQuantity <= 1}
                  >
                    <Minus className="w-5 h-5 text-gray-700" />
                  </button>
                  <span className="font-bold w-8 text-center text-lg">{modalQuantity}</span>
                  <button 
                    className="p-3 hover:bg-white rounded-lg transition shadow-sm" 
                    onClick={() => setModalQuantity(modalQuantity + 1)}
                  >
                    <Plus className="w-5 h-5 text-gray-700" />
                  </button>
                </div>

                <button 
                  onClick={addToCart}
                  className="flex-1 bg-[#4C1D95] text-white font-bold py-4 rounded-xl hover:bg-[#3b1675] transition flex justify-between px-6 md:px-8 text-lg shadow-lg shadow-purple-900/20"
                >
                  <span>Adicionar</span>
                  <span>
                    R$ {((selectedItem.price + (Object.values(selectedComplements).flat() as Complement[]).reduce((acc, c) => acc + c.price, 0)) * modalQuantity).toFixed(2).replace('.', ',')}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer / Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-96 bg-white z-50 shadow-xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <h2 className="text-lg font-bold">Seu Pedido</h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {checkoutStep === 'success' ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Pedido Recebido!</h3>
                    <p className="text-gray-500">Começaremos a preparar seu pedido imediatamente.</p>
                    <button 
                      onClick={() => {
                        setCheckoutStep('cart');
                        setIsCartOpen(false);
                      }}
                      className="mt-8 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Fechar
                    </button>
                  </div>
                ) : checkoutStep === 'cart' ? (
                  <>
                    {cart.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        Seu carrinho está vazio.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {cart.map(item => (
                          <div key={item.tempId} className="flex gap-4 items-start border-b border-gray-50 pb-4 last:border-0">
                            <div className="flex-1">
                              <h4 className="font-medium">{item.name}</h4>
                              <p className="text-sm text-gray-500">R$ {item.price.toFixed(2).replace('.', ',')}</p>
                              {item.selectedComplements && item.selectedComplements.length > 0 && (
                                <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                                  {item.selectedComplements.map((c, idx) => (
                                    <div key={idx} className="flex justify-between">
                                      <span>+ {c.name}</span>
                                      <span>R$ {c.price.toFixed(2).replace('.', ',')}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <div className="flex items-center gap-3">
                                <button onClick={() => item.quantity > 1 ? updateQuantity(item.tempId!, -1) : removeFromCart(item.tempId!)} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="w-4 text-center font-medium">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.tempId!, 1)} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                              <span className="font-bold text-sm">
                                R$ {getItemTotal(item).toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                    {/* Order Type Selection */}
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setOrderType('delivery')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                          orderType === 'delivery' 
                            ? 'bg-white text-purple-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Entrega
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderType('pickup')}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                          orderType === 'pickup' 
                            ? 'bg-white text-purple-600 shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        Retirada
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Número de Telefone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          required
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          value={customerDetails.phone}
                          onChange={e => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                          onBlur={handlePhoneBlur}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          required
                          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          value={customerDetails.name}
                          onChange={e => setCustomerDetails({ ...customerDetails, name: e.target.value })}
                          placeholder="João Silva"
                        />
                      </div>
                    </div>
                    
                    {orderType === 'delivery' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                            <input
                              type="text"
                              required
                              maxLength={9}
                              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              value={customerDetails.cep}
                              onChange={e => setCustomerDetails({ ...customerDetails, cep: e.target.value })}
                              onBlur={handleCepBlur}
                              placeholder="00000-000"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                            <input
                              type="text"
                              required
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              value={customerDetails.street}
                              onChange={e => setCustomerDetails({ ...customerDetails, street: e.target.value })}
                              placeholder="Rua Principal"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
                            <input
                              type="text"
                              required
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              value={customerDetails.number}
                              onChange={e => setCustomerDetails({ ...customerDetails, number: e.target.value })}
                              placeholder="123"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                            <input
                              type="text"
                              required
                              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              value={customerDetails.neighborhood}
                              onChange={e => setCustomerDetails({ ...customerDetails, neighborhood: e.target.value })}
                              placeholder="Centro"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade/UF</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                required
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                value={customerDetails.city}
                                onChange={e => setCustomerDetails({ ...customerDetails, city: e.target.value })}
                                placeholder="Cidade"
                              />
                              <input
                                type="text"
                                required
                                maxLength={2}
                                className="w-16 px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none text-center"
                                value={customerDetails.state}
                                onChange={e => setCustomerDetails({ ...customerDetails, state: e.target.value.toUpperCase() })}
                                placeholder="UF"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Complemento (Opcional)</label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            value={customerDetails.complement}
                            onChange={e => setCustomerDetails({ ...customerDetails, complement: e.target.value })}
                            placeholder="Apto 4B, Bloco C"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ponto de Referência (Opcional)</label>
                          <input
                            type="text"
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            value={customerDetails.reference}
                            onChange={e => setCustomerDetails({ ...customerDetails, reference: e.target.value })}
                            placeholder="Próximo ao mercado"
                          />
                        </div>
                      </div>
                    )}

                    {/* Payment Section */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <h3 className="font-bold text-gray-900">Pagamento</h3>
                      
                      {orderType === 'delivery' && (
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentTiming('online');
                              setPaymentMethod('');
                              setChangeFor('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                              paymentTiming === 'online' 
                                ? 'bg-white text-purple-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Pagar Online
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentTiming('delivery');
                              setPaymentMethod('');
                              setChangeFor('');
                            }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                              paymentTiming === 'delivery' 
                                ? 'bg-white text-purple-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            Pagar na Entrega
                          </button>
                        </div>
                      )}

                      <div className="space-y-2">
                        {settings?.payment_methods?.pix && (
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'pix' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              value="pix" 
                              checked={paymentMethod === 'pix'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-700">PIX</span>
                          </label>
                        )}

                        {settings?.payment_methods?.credit_card && (
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'credit_card' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              value="credit_card" 
                              checked={paymentMethod === 'credit_card'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-700">Cartão de Crédito</span>
                          </label>
                        )}

                        {settings?.payment_methods?.debit_card && (
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'debit_card' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              value="debit_card" 
                              checked={paymentMethod === 'debit_card'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-700">Cartão de Débito</span>
                          </label>
                        )}

                        {/* Cash is only available for "Delivery" (offline) or "Pickup" */}
                        {settings?.payment_methods?.cash && (orderType === 'pickup' || paymentTiming === 'delivery') && (
                          <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${paymentMethod === 'cash' ? 'border-purple-600 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}>
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              value="cash" 
                              checked={paymentMethod === 'cash'}
                              onChange={(e) => setPaymentMethod(e.target.value)}
                              className="text-purple-600 focus:ring-purple-500"
                            />
                            <span className="font-medium text-gray-700">Dinheiro</span>
                          </label>
                        )}
                      </div>

                      {paymentMethod === 'cash' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Troco para quanto?</label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
                            <input
                              type="number"
                              step="0.01"
                              className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                              value={changeFor}
                              onChange={e => setChangeFor(e.target.value)}
                              placeholder="0,00"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Deixe em branco se não precisar de troco.</p>
                        </div>
                      )}
                    </div>
                  </form>
                )}
              </div>

              {cart.length > 0 && checkoutStep !== 'success' && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>R$ {cartTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                    {orderType === 'delivery' && (
                      <div className="flex justify-between text-gray-600">
                        <span>Taxa de Entrega</span>
                        {deliveryFee === 0 && settings.delivery_fee > 0 ? (
                          <span className="text-green-600 font-medium">Grátis</span>
                        ) : (
                          <span>R$ {deliveryFee.toFixed(2).replace('.', ',')}</span>
                        )}
                      </div>
                    )}
                    {orderType === 'delivery' && settings.free_shipping_min_order && cartTotal < settings.free_shipping_min_order && (
                      <div className="text-xs text-purple-600 text-center bg-purple-50 p-2 rounded-lg">
                        Faltam R$ {(settings.free_shipping_min_order - cartTotal).toFixed(2).replace('.', ',')} para frete grátis!
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span>R$ {finalTotal.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>

                  {checkoutStep === 'cart' ? (
                    <button 
                      onClick={() => setCheckoutStep('details')}
                      disabled={!storeStatus.isOpen}
                      className={`w-full py-3 font-bold rounded-xl transition flex items-center justify-center gap-2 ${
                        storeStatus.isOpen 
                          ? 'bg-purple-600 text-white hover:bg-purple-700' 
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {storeStatus.isOpen ? (
                        <>Finalizar <ChevronRight className="w-5 h-5" /></>
                      ) : (
                        'Loja Fechada'
                      )}
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button 
                        onClick={() => setCheckoutStep('cart')}
                        className="px-4 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition"
                      >
                        Voltar
                      </button>
                      <button 
                        type="submit"
                        form="checkout-form"
                        className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2"
                      >
                        Fazer Pedido
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
