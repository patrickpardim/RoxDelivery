import { useState, useEffect, FormEvent } from 'react';
import { Settings as SettingsType, BusinessHours } from '../types';
import { Clock, CreditCard } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

const DAYS = [
  { id: '0', label: 'Domingo' },
  { id: '1', label: 'Segunda-feira' },
  { id: '2', label: 'Terça-feira' },
  { id: '3', label: 'Quarta-feira' },
  { id: '4', label: 'Quinta-feira' },
  { id: '5', label: 'Sexta-feira' },
  { id: '6', label: 'Sábado' },
];

export default function Settings() {
  const [settings, setSettings] = useState<SettingsType | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        // Initialize business_hours if missing
        if (!data.business_hours) {
          data.business_hours = {};
        }
        // Ensure all days exist
        DAYS.forEach(day => {
          if (!data.business_hours[day.id]) {
            data.business_hours[day.id] = { isOpen: false, ranges: [{ start: '18:00', end: '23:00' }] };
          }
        });
        // Initialize payment_methods if missing
        if (!data.payment_methods) {
          data.payment_methods = {
            pix: true,
            credit_card: true,
            debit_card: true,
            cash: true,
          };
        }
        setSettings(data);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    showToast('Alterações salvas com sucesso!', 'success');
  };

  const updateBusinessHours = (dayId: string, field: string, value: any, rangeIndex = 0) => {
    if (!settings) return;
    
    const newBusinessHours = { ...settings.business_hours };
    if (!newBusinessHours[dayId]) {
      newBusinessHours[dayId] = { isOpen: false, ranges: [{ start: '18:00', end: '23:00' }] };
    }

    if (field === 'isOpen') {
      newBusinessHours[dayId].isOpen = value;
    } else if (field === 'start' || field === 'end') {
      const newRanges = [...newBusinessHours[dayId].ranges];
      newRanges[rangeIndex] = { ...newRanges[rangeIndex], [field]: value };
      newBusinessHours[dayId].ranges = newRanges;
    }

    setSettings({ ...settings, business_hours: newBusinessHours });
  };

  const updatePaymentMethods = (field: string, value: any) => {
    if (!settings) return;
    setSettings({
      ...settings,
      payment_methods: {
        ...settings.payment_methods!,
        [field]: value
      }
    });
  };

  if (loading || !settings) return <div>Carregando...</div>;

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Configurações do Restaurante</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        {/* Basic Info */}
        <div className="space-y-6 border-b border-gray-100 pb-6">
          <h3 className="text-lg font-semibold text-gray-700">Informações Básicas</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Restaurante</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={settings.name}
              onChange={e => setSettings({ ...settings, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Símbolo da Moeda</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={settings.currency}
                onChange={e => setSettings({ ...settings, currency: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Entrega</label>
              <input
                type="number"
                step="0.01"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={settings.delivery_fee}
                onChange={e => setSettings({ ...settings, delivery_fee: parseFloat(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pedido Mínimo</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={settings.min_order}
              onChange={e => setSettings({ ...settings, min_order: parseFloat(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frete Grátis acima de (Opcional)</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
              <input
                type="number"
                step="0.01"
                className="w-full pl-8 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={settings.free_shipping_min_order || ''}
                onChange={e => setSettings({ ...settings, free_shipping_min_order: e.target.value ? parseFloat(e.target.value) : undefined })}
                placeholder="0,00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Deixe em branco para cobrar frete sempre.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número de Telefone</label>
            <input
              type="tel"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={settings.phone || ''}
              onChange={e => setSettings({ ...settings, phone: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={settings.cep || ''}
              onChange={e => setSettings({ ...settings, cep: e.target.value })}
              onBlur={async () => {
                const cep = settings.cep?.replace(/\D/g, '');
                if (cep?.length !== 8) return;
                try {
                  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                  const data = await res.json();
                  if (!data.erro) {
                    setSettings(prev => prev ? ({
                      ...prev,
                      street: data.logradouro,
                      neighborhood: data.bairro,
                      city: data.localidade,
                      state: data.uf,
                      address: `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`
                    }) : null);
                  }
                } catch (error) {
                  console.error('Erro ao buscar CEP', error);
                }
              }}
              placeholder="00000-000"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço (Rua)</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={settings.street || ''}
                onChange={e => setSettings({ ...settings, street: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={settings.number || ''}
                onChange={e => setSettings({ ...settings, number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={settings.neighborhood || ''}
                onChange={e => setSettings({ ...settings, neighborhood: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade/UF</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={settings.city || ''}
                  onChange={e => setSettings({ ...settings, city: e.target.value })}
                  placeholder="Cidade"
                />
                <input
                  type="text"
                  maxLength={2}
                  className="w-16 px-2 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center"
                  value={settings.state || ''}
                  onChange={e => setSettings({ ...settings, state: e.target.value.toUpperCase() })}
                  placeholder="UF"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Complemento (Opcional)</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={settings.complement || ''}
              onChange={e => setSettings({ ...settings, complement: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ponto de Referência (Opcional)</label>
            <input
              type="text"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={settings.reference || ''}
              onChange={e => setSettings({ ...settings, reference: e.target.value })}
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div className="space-y-6 border-b border-gray-100 pb-6">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-700">Formas de Pagamento</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
              <input 
                type="checkbox"
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                checked={settings.payment_methods?.pix || false}
                onChange={e => updatePaymentMethods('pix', e.target.checked)}
              />
              <span className="font-medium text-gray-700">Aceitar PIX</span>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
              <input 
                type="checkbox"
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                checked={settings.payment_methods?.credit_card || false}
                onChange={e => updatePaymentMethods('credit_card', e.target.checked)}
              />
              <span className="font-medium text-gray-700">Aceitar Cartão de Crédito</span>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
              <input 
                type="checkbox"
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                checked={settings.payment_methods?.debit_card || false}
                onChange={e => updatePaymentMethods('debit_card', e.target.checked)}
              />
              <span className="font-medium text-gray-700">Aceitar Cartão de Débito</span>
            </label>

            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer">
              <input 
                type="checkbox"
                className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                checked={settings.payment_methods?.cash || false}
                onChange={e => updatePaymentMethods('cash', e.target.checked)}
              />
              <span className="font-medium text-gray-700">Aceitar Dinheiro</span>
            </label>
          </div>

          {settings.payment_methods?.pix && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX (Opcional)</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={settings.payment_methods?.pix_key || ''}
                onChange={e => updatePaymentMethods('pix_key', e.target.value)}
                placeholder="CPF, CNPJ, Email, Telefone ou Chave Aleatória"
              />
            </div>
          )}
        </div>

        {/* Business Hours */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-700">Horário de Atendimento</h3>
          </div>
          
          <div className="space-y-4">
            {DAYS.map(day => {
              const schedule = settings.business_hours?.[day.id] || { isOpen: false, ranges: [{ start: '18:00', end: '23:00' }] };
              
              return (
                <div key={day.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                  <div className="flex items-center justify-between sm:w-48">
                    <span className="font-medium text-gray-700">{day.label}</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={schedule.isOpen}
                        onChange={e => updateBusinessHours(day.id, 'isOpen', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                  
                  {schedule.isOpen ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="time"
                        className="px-3 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={schedule.ranges[0]?.start || '18:00'}
                        onChange={e => updateBusinessHours(day.id, 'start', e.target.value)}
                      />
                      <span className="text-gray-500">até</span>
                      <input
                        type="time"
                        className="px-3 py-1.5 rounded border border-gray-300 focus:ring-2 focus:ring-purple-500 outline-none"
                        value={schedule.ranges[0]?.end || '23:00'}
                        onChange={e => updateBusinessHours(day.id, 'end', e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 text-gray-400 text-sm italic">
                      Fechado
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pt-4">
          <button type="submit" className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition">
            Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}
