import { useState, useEffect, useRef } from 'react';
import { Order, OrderItem } from '../types';
import { CheckCircle, XCircle, Clock, Truck, ChefHat, Bell, X, ChevronRight, ShoppingBag } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  preparing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  delivering: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const statusIcons = {
  pending: Clock,
  preparing: ChefHat,
  ready: CheckCircle,
  delivering: Truck,
  completed: CheckCircle,
  cancelled: XCircle,
};

const statusLabels = {
  pending: 'Pendente',
  preparing: 'Em Preparação',
  ready: 'Pronto',
  delivering: 'A Caminho',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = () => {
    fetch('/api/orders')
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    
    // Update local state immediately
    const updatedOrders = orders.map(o => o.id === id ? { ...o, status: status as any } : o);
    setOrders(updatedOrders);
    
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: status as any });
    }
  };

  return (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold text-gray-800">Pedidos</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-600">{orders.filter(o => o.status === 'pending').length}</p>
          </div>
          <div className="p-3 bg-yellow-50 rounded-xl text-yellow-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Em Preparação</p>
            <p className="text-2xl font-bold text-blue-600">{orders.filter(o => o.status === 'preparing').length}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <ChefHat className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">Prontos</p>
            <p className="text-2xl font-bold text-green-600">{orders.filter(o => o.status === 'ready').length}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-xl text-green-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium">A Caminho</p>
            <p className="text-2xl font-bold text-purple-600">{orders.filter(o => o.status === 'delivering').length}</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Truck className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {orders.map((order) => {
          const StatusIcon = statusIcons[order.status as keyof typeof statusIcons];
          return (
            <div 
              key={order.id} 
              onClick={() => setSelectedOrder(order)}
              className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer flex flex-col gap-2"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-xs text-gray-500">#{order.id.slice(0, 6)}</span>
                <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-bold', order.order_type === 'pickup' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800')}>
                  {order.order_type === 'pickup' ? 'RETIRADA' : 'ENTREGA'}
                </span>
              </div>
              
              <div>
                <h3 className="font-bold text-gray-900 truncate">{order.customer_name}</h3>
                <p className="text-xs text-gray-500">{new Date(order.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
              </div>

              <div className="flex items-center gap-2 mt-auto pt-2">
                <span className={clsx('px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 flex-1 justify-center', statusColors[order.status as keyof typeof statusColors])}>
                  <StatusIcon className="w-3 h-3" />
                  {statusLabels[order.status as keyof typeof statusLabels]}
                </span>
              </div>
            </div>
          );
        })}
        {orders.length === 0 && !loading && (
          <div className="col-span-full text-center py-12 text-gray-500">Nenhum pedido encontrado.</div>
        )}
        {loading && (
          <div className="col-span-full text-center py-12 text-gray-500">Carregando pedidos...</div>
        )}
      </div>

      {/* Order Details Drawer */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOrder(null)}
              className="fixed inset-0 bg-black z-40"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-white z-50 shadow-xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-lg font-bold">Pedido #{selectedOrder.id.slice(0, 8)}</h2>
                  <p className="text-sm text-gray-500">{new Date(selectedOrder.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Actions */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <h3 className="font-semibold text-gray-700 mb-3">Ações do Pedido</h3>
                  <div className="flex flex-col gap-2">
                    {selectedOrder.status === 'pending' && (
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => updateStatus(selectedOrder.id, 'preparing')} className="bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-bold">ACEITAR</button>
                        <button onClick={() => updateStatus(selectedOrder.id, 'cancelled')} className="bg-red-100 text-red-600 px-4 py-3 rounded-lg hover:bg-red-200 transition font-bold">REJEITAR</button>
                      </div>
                    )}
                    {selectedOrder.status === 'preparing' && (
                      <button onClick={() => updateStatus(selectedOrder.id, 'ready')} className="bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition font-bold">Marcar como Pronto</button>
                    )}
                    {selectedOrder.status === 'ready' && (
                      <button onClick={() => updateStatus(selectedOrder.id, 'delivering')} className="bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition font-bold">
                        {selectedOrder.order_type === 'pickup' ? 'Pronto para Retirada' : 'Saiu para Entrega'}
                      </button>
                    )}
                    {selectedOrder.status === 'delivering' && (
                      <button onClick={() => updateStatus(selectedOrder.id, 'completed')} className="bg-gray-800 text-white px-4 py-3 rounded-lg hover:bg-gray-900 transition font-bold">Finalizar Pedido</button>
                    )}
                    {selectedOrder.status === 'cancelled' && (
                      <button onClick={() => updateStatus(selectedOrder.id, 'pending')} className="bg-yellow-100 text-yellow-700 px-4 py-3 rounded-lg hover:bg-yellow-200 transition font-bold">Reverter para Pendente</button>
                    )}
                    {selectedOrder.status === 'completed' && (
                      <div className="text-center text-green-600 font-bold py-2 bg-green-50 rounded-lg border border-green-100">
                        Pedido Finalizado com Sucesso
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <ChefHat className="w-5 h-5 text-gray-400" /> Cliente
                  </h3>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <p className="font-semibold text-lg">{selectedOrder.customer_name}</p>
                    <p className="text-gray-600">{selectedOrder.customer_phone}</p>
                  </div>
                </div>

                {/* Delivery Info */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-gray-400" /> Entrega
                  </h3>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx('px-2 py-1 rounded-md text-xs font-bold uppercase', selectedOrder.order_type === 'pickup' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800')}>
                        {selectedOrder.order_type === 'pickup' ? 'Retirada' : 'Delivery'}
                      </span>
                    </div>
                    <p className="text-gray-700">{selectedOrder.address}</p>
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-gray-400" /> Pagamento
                  </h3>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Método:</span>
                      <span className="font-medium">
                        {selectedOrder.payment_method === 'pix' ? 'PIX' :
                         selectedOrder.payment_method === 'credit_card' ? 'Cartão de Crédito' :
                         selectedOrder.payment_method === 'debit_card' ? 'Cartão de Débito' :
                         selectedOrder.payment_method === 'cash' ? 'Dinheiro' : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Momento:</span>
                      <span className="font-medium">
                        {selectedOrder.payment_timing === 'online' ? 'Online' : 
                         selectedOrder.order_type === 'pickup' ? 'Na Retirada' : 'Na Entrega'}
                      </span>
                    </div>
                    {selectedOrder.payment_method === 'cash' && selectedOrder.change_for && (
                      <div className="flex justify-between text-orange-600">
                        <span>Troco para:</span>
                        <span className="font-bold">R$ {selectedOrder.change_for.toFixed(2).replace('.', ',')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Itens do Pedido</h3>
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
                    {selectedOrder.items?.map((item: OrderItem) => (
                      <div key={item.id} className="p-4 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between font-medium mb-1 text-gray-900">
                          <span>{item.quantity}x {item.item_name}</span>
                          <span>R$ {(item.price_at_time * item.quantity).toFixed(2).replace('.', ',')}</span>
                        </div>
                        {item.complements && item.complements.length > 0 && (
                          <div className="text-sm text-gray-500 pl-4 mt-2 space-y-1 border-l-2 border-purple-100 ml-1">
                            {item.complements.map((comp, idx) => (
                              <div key={idx} className="flex justify-between">
                                <span>+ {comp.quantity > 1 ? `${comp.quantity}x ` : ''}{comp.name}</span>
                                <span>R$ {(comp.price * comp.quantity).toFixed(2).replace('.', ',')}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className="p-4 bg-gray-50 rounded-b-xl flex justify-between items-center">
                      <span className="font-bold text-gray-900">Total</span>
                      <span className="font-bold text-xl text-purple-600">R$ {selectedOrder.total.toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
