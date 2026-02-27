import { useState, useEffect, FormEvent } from 'react';
import { Category, Item } from '../types';
import { Plus, Trash2, Edit2, Image as ImageIcon } from 'lucide-react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

export default function Menu() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  
  // Form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [newItem, setNewItem] = useState({
    category_id: '',
    name: '',
    description: '',
    price: '',
    image_url: '',
  });

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Confirmation Modal State
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    type: 'category' | 'item' | null;
    id: string | null;
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: null,
    id: null,
    title: '',
    message: '',
  });

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = () => {
    fetch('/api/admin/menu')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories);
        setItems(data.items);
        setLoading(false);
      });
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategoryName }),
    });
    setNewCategoryName('');
    setShowCategoryForm(false);
    fetchMenu();
    showToast('Categoria adicionada com sucesso!', 'success');
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories';
    const method = editingCategory ? 'PUT' : 'POST';
    const body = editingCategory ? { name: newCategoryName } : { name: newCategoryName };

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setNewCategoryName('');
    setEditingCategory(null);
    setShowCategoryForm(false);
    fetchMenu();
    showToast('Categoria salva com sucesso!', 'success');
  };

  const confirmDeleteCategory = (id: string) => {
    setConfirmation({
      isOpen: true,
      type: 'category',
      id,
      title: 'Excluir Categoria',
      message: 'Tem certeza? Isso excluirá todos os itens desta categoria.',
    });
  };

  const confirmDeleteItem = (id: string) => {
    setConfirmation({
      isOpen: true,
      type: 'item',
      id,
      title: 'Excluir Item',
      message: 'Tem certeza que deseja excluir este item?',
    });
  };

  const handleConfirmDelete = async () => {
    if (confirmation.type === 'category' && confirmation.id) {
      await fetch(`/api/categories/${confirmation.id}`, { method: 'DELETE' });
      showToast('Categoria excluída com sucesso!', 'success');
    } else if (confirmation.type === 'item' && confirmation.id) {
      await fetch(`/api/items/${confirmation.id}`, { method: 'DELETE' });
      showToast('Item excluído com sucesso!', 'success');
    }
    fetchMenu();
    setConfirmation({ ...confirmation, isOpen: false });
  };

  const handleSaveItem = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingItem ? `/api/items/${editingItem.id}` : '/api/items';
    const method = editingItem ? 'PUT' : 'POST';
    const body = editingItem ? { ...editingItem } : { ...newItem, price: parseFloat(newItem.price) };

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (editingItem) {
      setEditingItem(null);
      setShowItemForm(false);
    } else {
      setNewItem({ category_id: '', name: '', description: '', price: '', image_url: '' });
      setShowItemForm(false);
    }
    fetchMenu();
    showToast('Item salvo com sucesso!', 'success');
  };
  
  const toggleAvailability = async (item: Item) => {
    await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, is_available: !item.is_available }),
    });
    fetchMenu();
    showToast('Disponibilidade atualizada!', 'success');
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="space-y-8">
      <ConfirmationModal
        isOpen={confirmation.isOpen}
        onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
        onConfirm={handleConfirmDelete}
        title={confirmation.title}
        message={confirmation.message}
        confirmText="Excluir"
        isDanger={true}
      />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Gestão de Cardápio</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowCategoryForm(true)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Categoria
          </button>
          <button 
            onClick={() => setShowItemForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Item
          </button>
        </div>
      </div>

      {/* Forms */}
      {showCategoryForm && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <form onSubmit={handleSaveCategory} className="flex gap-4">
            <input
              type="text"
              placeholder="Nome da Categoria"
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              required
            />
            <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
            <button 
              type="button" 
              onClick={() => {
                setShowCategoryForm(false);
                setEditingCategory(null);
                setNewCategoryName('');
              }} 
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {showItemForm && (
        <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="font-semibold mb-4">{editingItem ? 'Editar Item' : 'Adicionar Novo Item'}</h3>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={editingItem ? editingItem.category_id : newItem.category_id}
                onChange={e => editingItem ? setEditingItem({ ...editingItem, category_id: e.target.value }) : setNewItem({ ...newItem, category_id: e.target.value })}
                required
              >
                <option value="">Selecione a Categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input
                type="text"
                placeholder="Nome do Item"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={editingItem ? editingItem.name : newItem.name}
                onChange={e => editingItem ? setEditingItem({ ...editingItem, name: e.target.value }) : setNewItem({ ...newItem, name: e.target.value })}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Preço"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={editingItem ? editingItem.price : newItem.price}
                onChange={e => editingItem ? setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 }) : setNewItem({ ...newItem, price: e.target.value })}
                required
              />
              <input
                type="url"
                placeholder="URL da Imagem"
                className="px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={editingItem ? editingItem.image_url : newItem.image_url}
                onChange={e => editingItem ? setEditingItem({ ...editingItem, image_url: e.target.value }) : setNewItem({ ...newItem, image_url: e.target.value })}
              />
            </div>
            <textarea
              placeholder="Descrição"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={editingItem ? editingItem.description : newItem.description}
              onChange={e => editingItem ? setEditingItem({ ...editingItem, description: e.target.value }) : setNewItem({ ...newItem, description: e.target.value })}
              rows={3}
            />
            <div className="flex gap-4">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar Item</button>
              <button 
                type="button" 
                onClick={() => {
                  setShowItemForm(false);
                  setEditingItem(null);
                }} 
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Menu List */}
      <div className="space-y-8">
        {categories.map(category => (
          <div key={category.id}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-xl font-semibold text-gray-700">{category.name}</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditingCategory(category);
                    setNewCategoryName(category.name);
                    setShowCategoryForm(true);
                  }}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                  title="Editar Categoria"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => confirmDeleteCategory(category.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                  title="Excluir Categoria"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.filter(i => i.category_id === category.id).map(item => (
                <div key={item.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden group ${item.is_available ? 'border-gray-100' : 'border-gray-200 opacity-75'}`}>
                  <div className="h-48 overflow-hidden relative bg-gray-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button 
                        onClick={() => {
                          setEditingItem(item);
                          setShowItemForm(true);
                        }}
                        className="p-2 bg-white/90 rounded-full text-gray-600 hover:bg-gray-50 shadow-sm"
                        title="Editar Item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => confirmDeleteItem(item.id)} className="p-2 bg-white/90 rounded-full text-red-600 hover:bg-red-50 shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => toggleAvailability(item)} className={`p-2 rounded-full shadow-sm ${item.is_available ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                        {item.is_available ? 'Ativo' : 'Oculto'}
                      </button>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg">{item.name}</h4>
                      <span className="font-bold text-purple-600">R$ {item.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                    <p className="text-gray-500 text-sm line-clamp-2">{item.description}</p>
                  </div>
                </div>
              ))}
              {items.filter(i => i.category_id === category.id).length === 0 && (
                <p className="text-gray-400 italic col-span-full">Nenhum item nesta categoria.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
