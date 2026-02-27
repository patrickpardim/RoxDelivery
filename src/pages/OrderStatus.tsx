import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Order, Settings } from '../types';
import { Clock, ChefHat, CheckCircle, Truck, XCircle, Phone, MapPin, ShoppingBag } from 'lucide-react';
import { clsx } from 'clsx';

const statusSteps = [
  { key: 'pending', label: 'Pendente', icon: Clock },
  { key: 'preparing', label: 'Em Preparação', icon: ChefHat },
  { key: 'ready', label: 'Pronto', icon: CheckCircle },
  { key: 'on_way', label: 'A Caminho', icon: Truck },
  { key: 'delivered', label: 'Finalizado', icon: CheckCircle },
];

export default function OrderStatus() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    if (id) {
      fetchOrder();
      const interval = setInterval(fetchOrder, 10000); // Poll every 10s
      return () => clearInterval(interval);
    }
  }, [id]);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings);
  }, []);

  const fetchOrder = () => {
    fetch(`/api/orders/${id}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Order not found');
      })
      .then(setOrder)
      .catch(console.error);
  };

  if (!order || !settings) return <div className="flex items-center justify-center h-screen">Carregando...</div>;

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-xl font-bold text-gray-900">{settings.name}</h1>
          <p className="text-sm text-gray-500">Acompanhamento de Pedido</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Status Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {isCancelled ? 'Pedido Cancelado' : statusSteps[currentStepIndex]?.label || 'Status Desconhecido'}
            </h2>
            <p className="text-gray-500">Pedido #{order.id.slice(0, 8)}</p>
          </div>

          {!isCancelled ? (
            <div className="relative flex justify-between items-center mb-8">
              {/* Progress Bar Background */}
              <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-10" />
              
              {/* Progress Bar Fill */}
              <div 
                className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 transition-all duration-500" 
                style={{ width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%` }}
              />

              {statusSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-col items-center gap-2 bg-white px-2">
                    <div className={clsx(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                      isActive ? "bg-green-500 border-green-500 text-white" : "bg-white border-gray-200 text-gray-300",
                      isCurrent && "ring-4 ring-green-100"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={clsx(
                      "text-xs font-medium hidden md:block",
                      isActive ? "text-green-600" : "text-gray-400"
                    )}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8" />
              </div>
              <p className="text-gray-600">
                Seu pedido foi cancelado. Entre em contato com a loja para mais informações.
              </p>
            </div>
          )}

          {/* Contact Button */}
          <a 
            href={`https://wa.me/${settings.phone.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition text-center flex items-center justify-center gap-2"
          >
            <Phone className="w-5 h-5" />
            Entrar em Contato
          </a>
        </div>

        {/* Order Details */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            Resumo do Pedido
          </h3>
          
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between items-start border-b border-gray-50 pb-4 last:border-0">
                <div>
                  <div className="font-medium">
                    {item.quantity}x {item.item_name}
                  </div>
                  {item.complements && item.complements.length > 0 && (
                    <div className="text-sm text-gray-500 mt-1">
                      {item.complements.map((c: any) => (
                        <div key={c.id}>+ {c.name}</div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="font-medium text-gray-900">
                  R$ {((item.price_at_time + (item.complements?.reduce((acc: number, c: any) => acc + c.price, 0) || 0)) * item.quantity).toFixed(2).replace('.', ',')}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-gray-100 space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>R$ {(order.total - (order.order_type === 'delivery' ? settings.delivery_fee : 0)).toFixed(2).replace('.', ',')}</span>
            </div>
            {order.order_type === 'delivery' && (
              <div className="flex justify-between text-gray-600">
                <span>Taxa de Entrega</span>
                <span>R$ {settings.delivery_fee.toFixed(2).replace('.', ',')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg text-gray-900 pt-2">
              <span>Total</span>
              <span>R$ {order.total.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-purple-600" />
            Informações de Entrega
          </h3>
          
          <div className="space-y-2 text-gray-600">
            <p><span className="font-medium text-gray-900">Nome:</span> {order.customer_name}</p>
            <p><span className="font-medium text-gray-900">Telefone:</span> {order.customer_phone}</p>
            <p><span className="font-medium text-gray-900">Tipo:</span> {order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}</p>
            {order.order_type === 'delivery' && (
              <p><span className="font-medium text-gray-900">Endereço:</span> {order.address}</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
