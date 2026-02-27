import { useState, useEffect, FormEvent } from 'react';
import { ComplementCategory, Complement, Item } from '../types';
import { Plus, Trash2, Edit2, Check, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';
import ConfirmationModal from '../components/ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

export default function Complements() {
  const [categories, setCategories] = useState<ComplementCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCategory, setEditingCategory] = useState<ComplementCategory | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const { showToast } = useToast();
  
  // Product linking
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkingCategory, setLinkingCategory] = useState<ComplementCategory | null>(null);
  const [products, setProducts] = useState<Item[]>([]);
  const [linkedProductIds, setLinkedProductIds] = useState<string[]>([]);

  // New category form state
  const [newCategory, setNewCategory] = useState({
    name: '',
    is_required: false,
    min_select: 0,
    max_select: 1,
  });

  // New item form state (keyed by category ID)
  const [newItems, setNewItems] = useState<Record<string, { name: string, price: string, max_quantity: number }>>({});

  const [editingItem, setEditingItem] = useState<Complement | null>(null);

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
    fetchComplements();
    fetchProducts();
  }, []);

  const fetchComplements = () => {
    fetch('/api/complements')
      .then(res => res.json())
      .then(data => {
        setCategories(data);
        setLoading(false);
      });
  };

  const fetchProducts = () => {
    fetch('/api/admin/menu')
      .then(res => res.json())
      .then(data => setProducts(data.items));
  };

  const handleSaveCategory = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingCategory ? `/api/complements/categories/${editingCategory.id}` : '/api/complements/categories';
    const method = editingCategory ? 'PUT' : 'POST';
    const body = editingCategory ? { ...newCategory } : newCategory;

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setEditingCategory(null);
    setShowCategoryForm(false);
    setNewCategory({ name: '', is_required: false, min_select: 0, max_select: 1 });
    fetchComplements();
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
      await fetch(`/api/complements/categories/${confirmation.id}`, { method: 'DELETE' });
      showToast('Categoria excluída com sucesso!', 'success');
    } else if (confirmation.type === 'item' && confirmation.id) {
      await fetch(`/api/complements/items/${confirmation.id}`, { method: 'DELETE' });
      showToast('Item excluído com sucesso!', 'success');
    }
    fetchComplements();
    setConfirmation({ ...confirmation, isOpen: false });
  };

  const handleAddItem = async (categoryId: string) => {
    const item = newItems[categoryId];
    if (!item?.name) return;
    
    await fetch('/api/complements/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: categoryId,
        name: item.name,
        price: parseFloat(item.price) || 0,
        max_quantity: item.max_quantity || 1,
      }),
    });

    setNewItems(prev => ({ ...prev, [categoryId]: { name: '', price: '', max_quantity: 1 } }));
    fetchComplements();
    showToast('Item adicionado com sucesso!', 'success');
  };

  const updateNewItemState = (categoryId: string, field: string, value: any) => {
    setNewItems(prev => ({
      ...prev,
      [categoryId]: {
        ...(prev[categoryId] || { name: '', price: '', max_quantity: 1 }),
        [field]: value
      }
    }));
  };

  const handleUpdateItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    await fetch(`/api/complements/items/${editingItem.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingItem),
    });

    setEditingItem(null);
    fetchComplements();
    showToast('Item atualizado com sucesso!', 'success');
  };

  const toggleItemVisibility = async (item: Complement) => {
    await fetch(`/api/complements/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, is_visible: !item.is_visible }),
    });
    fetchComplements();
    showToast('Visibilidade do item atualizada!', 'success');
  };

  const openLinkModal = async (category: ComplementCategory) => {
    setLinkingCategory(category);
    const res = await fetch(`/api/complements/category/${category.id}/products`);
    const ids = await res.json();
    setLinkedProductIds(ids);
    setShowLinkModal(true);
  };

  const handleLinkProducts = async () => {
    if (!linkingCategory) return;
    await fetch(`/api/complements/category/${linkingCategory.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productIds: linkedProductIds }),
    });
    setShowLinkModal(false);
    setLinkingCategory(null);
    showToast('Produtos associados com sucesso!', 'success');
  };

  const toggleProductLink = (productId: string) => {
    setLinkedProductIds(prev => 
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
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
        <h2 className="text-2xl font-bold text-gray-800">Complementos</h2>
        <button 
          onClick={() => {
            setEditingCategory(null);
            setNewCategory({ name: '', is_required: false, min_select: 0, max_select: 1 });
            setShowCategoryForm(true);
          }}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>

      {/* Category Form */}
      {showCategoryForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold mb-4">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h3>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Categoria</label>
              <input
                type="text"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={newCategory.name}
                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                required
                placeholder="Ex: Frutas, Molhos..."
              />
            </div>
            
            <div className="flex gap-6 items-center">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_required"
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  checked={newCategory.is_required}
                  onChange={e => setNewCategory({ ...newCategory, is_required: e.target.checked })}
                />
                <label htmlFor="is_required" className="text-sm font-medium text-gray-700">Obrigatório</label>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Mínimo:</label>
                <input
                  type="number"
                  min="0"
                  className="w-20 px-2 py-1 rounded border border-gray-300"
                  value={newCategory.min_select}
                  onChange={e => setNewCategory({ ...newCategory, min_select: parseInt(e.target.value) })}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Máximo:</label>
                <input
                  type="number"
                  min="1"
                  className="w-20 px-2 py-1 rounded border border-gray-300"
                  value={newCategory.max_select}
                  onChange={e => setNewCategory({ ...newCategory, max_select: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
              <button type="button" onClick={() => setShowCategoryForm(false)} className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400">Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="space-y-6">
        {categories.map(category => (
          <div key={category.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg text-gray-800">{category.name}</h3>
                <p className="text-sm text-gray-500">
                  {category.is_required ? 'Obrigatório' : 'Opcional'} • Min: {category.min_select} • Max: {category.max_select}
                </p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => openLinkModal(category)}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
                >
                  Associar ({category.linked_products_count || 0})
                </button>
                <button 
                  onClick={() => {
                    setEditingCategory(category);
                    setNewCategory({
                      name: category.name,
                      is_required: !!category.is_required,
                      min_select: category.min_select,
                      max_select: category.max_select,
                    });
                    setShowCategoryForm(true);
                  }}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => confirmDeleteCategory(category.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Items List */}
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 font-medium">Nome do modificador</th>
                    <th className="pb-2 font-medium">Preço</th>
                    <th className="pb-2 font-medium">Qtd Max</th>
                    <th className="pb-2 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {category.items?.map(item => (
                    <tr key={item.id} className="group">
                      {editingItem?.id === item.id ? (
                        <>
                          <td className="py-2 pr-2">
                            <input 
                              type="text" 
                              className="w-full px-2 py-1 rounded border border-purple-300 focus:ring-1 focus:ring-purple-500 outline-none text-sm"
                              value={editingItem.name}
                              onChange={e => setEditingItem({ ...editingItem, name: e.target.value })}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="number" 
                              step="0.01" 
                              className="w-24 px-2 py-1 rounded border border-purple-300 focus:ring-1 focus:ring-purple-500 outline-none text-sm"
                              value={editingItem.price}
                              onChange={e => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) })}
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input 
                              type="number" 
                              min="1" 
                              className="w-16 px-2 py-1 rounded border border-purple-300 focus:ring-1 focus:ring-purple-500 outline-none text-sm"
                              value={editingItem.max_quantity}
                              onChange={e => setEditingItem({ ...editingItem, max_quantity: parseInt(e.target.value) })}
                            />
                          </td>
                          <td className="py-2 text-right flex justify-end gap-2">
                            <button onClick={handleUpdateItem} className="p-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setEditingItem(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3">{item.name}</td>
                          <td className="py-3">R$ {item.price.toFixed(2).replace('.', ',')}</td>
                          <td className="py-3">{item.max_quantity}</td>
                          <td className="py-3 text-right flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingItem(item)}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                              title="Editar"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => toggleItemVisibility(item)}
                              className={clsx("p-1.5 rounded-lg", item.is_visible ? "text-blue-600 bg-blue-50" : "text-gray-400 bg-gray-100")}
                              title={item.is_visible ? "Ocultar" : "Mostrar"}
                            >
                              {item.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            </button>
                            <button onClick={() => confirmDeleteItem(item.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                  
                  {/* Add Item Row */}
                  <tr className="bg-gray-50/50">
                    <td className="py-2 pr-2">
                      <input 
                        type="text" 
                        placeholder="Novo item" 
                        className="w-full px-3 py-1.5 rounded border border-gray-200 text-sm"
                        value={newItems[category.id]?.name || ''}
                        onChange={e => updateNewItemState(category.id, 'name', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        className="w-24 px-3 py-1.5 rounded border border-gray-200 text-sm"
                        value={newItems[category.id]?.price || ''}
                        onChange={e => updateNewItemState(category.id, 'price', e.target.value)}
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input 
                        type="number" 
                        min="1" 
                        className="w-16 px-3 py-1.5 rounded border border-gray-200 text-sm"
                        value={newItems[category.id]?.max_quantity || 1}
                        onChange={e => updateNewItemState(category.id, 'max_quantity', parseInt(e.target.value))}
                      />
                    </td>
                    <td className="py-2 text-right">
                      <button 
                        onClick={() => handleAddItem(category.id)}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-black"
                      >
                        Adicionar
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ))}
        
        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
            Nenhum complemento criado ainda.
          </div>
        )}
      </div>

      {/* Link Products Modal */}
      {showLinkModal && linkingCategory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Associar a "{linkingCategory.name}"</h3>
              <button onClick={() => setShowLinkModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-gray-500 mb-4">Selecione os produtos que terão este grupo de complementos.</p>
              <div className="space-y-2">
                {products.map(product => (
                  <label key={product.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={linkedProductIds.includes(product.id)}
                      onChange={() => toggleProductLink(product.id)}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="font-medium text-gray-700">{product.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={handleLinkProducts} className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Salvar Associações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
