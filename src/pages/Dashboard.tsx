import { useState, useEffect } from 'react';
import { Order, Settings } from '../types';
import { DollarSign, ShoppingBag, Clock, TrendingUp } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  });
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    fetch('/api/orders')
      .then(res => res.json())
      .then((data: Order[]) => {
        const totalOrders = data.length;
        const totalRevenue = data.reduce((acc, order) => acc + order.total, 0);
        const pendingOrders = data.filter(o => o.status === 'pending').length;
        setStats({ totalOrders, totalRevenue, pendingOrders });
      });

    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings);
  }, []);

  if (!settings) return <div>Carregando...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Painel de Controle</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900">R$ {stats.totalRevenue.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full text-green-600">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Pedidos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full text-blue-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pedidos Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
            </div>
            <div className="p-3 bg-primary-50 rounded-full text-primary-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
        <p className="text-gray-500">Nenhuma atividade recente para mostrar.</p>
      </div>
    </div>
  );
}
