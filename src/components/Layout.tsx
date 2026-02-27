import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Settings, Menu as MenuIcon, Layers, Users, Bell, X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';
import { Order } from '../types';

export default function Layout({ children }: { children?: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrdersRef = useRef<Order[]>([]);

  useEffect(() => {
    // Initialize audio with a reliable notification sound (Google Actions Alarm)
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        // Check for new orders
        if (previousOrdersRef.current.length > 0) {
          const newOrders = data.filter((o: Order) => !previousOrdersRef.current.find(po => po.id === o.id));
          if (newOrders.length > 0) {
            // Alert for the most recent new order
            const latestOrder = newOrders[0];
            setNewOrderAlert(latestOrder);
            playAlertSound();
            setTimeout(() => setNewOrderAlert(null), 10000); // Show for 10 seconds to match audio
          }
        }
        previousOrdersRef.current = data;
      })
      .catch(err => console.error("Error fetching orders:", err));
  };

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.loop = true; // Loop to ensure consistency
      audioRef.current.play().catch(e => console.error("Audio play failed", e));

      // Stop after 10 seconds
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
      }, 10000);
    }
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Painel', path: '/admin' },
    { icon: ShoppingBag, label: 'Pedidos', path: '/admin/orders' },
    { icon: UtensilsCrossed, label: 'Cardápio', path: '/admin/menu' },
    { icon: Layers, label: 'Complementos', path: '/admin/complements' },
    { icon: Users, label: 'Clientes', path: '/admin/customers' },
    { icon: Settings, label: 'Configurações', path: '/admin/settings' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Notification Popup */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -50, x: 50 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 right-4 z-50 bg-white border-l-4 border-green-500 shadow-lg rounded-lg p-4 flex items-start gap-4 max-w-sm cursor-pointer hover:bg-gray-50 transition"
            onClick={() => {
              navigate('/admin/orders');
              setNewOrderAlert(null);
            }}
          >
            <div className="bg-green-100 p-2 rounded-full text-green-600 mt-1">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-800">Novo Pedido! #{newOrderAlert.id.slice(0, 6)}</h4>
              <p className="text-sm text-gray-600 font-medium">{newOrderAlert.customer_name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {newOrderAlert.items?.length} itens • R$ {newOrderAlert.total.toFixed(2).replace('.', ',')}
              </p>
              <p className="text-xs text-purple-600 mt-1 font-bold uppercase">
                {newOrderAlert.order_type === 'delivery' ? 'Entrega' : 'Retirada'}
              </p>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setNewOrderAlert(null);
              }} 
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-purple-600 flex items-center gap-2">
            <MenuIcon className="w-8 h-8" />
            RoxDelivery
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <Link to="/" target="_blank" className="flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600">
            Ver Cardápio Público &rarr;
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}
