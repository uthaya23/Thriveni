import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function StockEntryModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Consumable',
    unit: 'Kg',
    openingStock: 0,
    minStockLevel: 0,
    unitCost: 0,
    storeLocation: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/inventory', formData);
      toast.success('Item added successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error adding item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Add New Inventory Item</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="stockEntryForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name *</label>
              <input type="text" required value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g., Red Paste" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Category *</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="Consumable">Consumable</option>
                  <option value="Fuel/Oil">Fuel/Oil</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Unit *</label>
                <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="Kg">Kg</option>
                  <option value="Litre">Litre</option>
                  <option value="Nos">Nos</option>
                  <option value="gm">gm</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Opening Stock</label>
                <input type="number" min="0" step="0.01" value={formData.openingStock} onChange={e => setFormData({...formData, openingStock: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Min Level *</label>
                <input type="number" min="0" step="0.01" required value={formData.minStockLevel} onChange={e => setFormData({...formData, minStockLevel: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Cost (₹)</label>
                <input type="number" min="0" step="0.01" value={formData.unitCost} onChange={e => setFormData({...formData, unitCost: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Store Location</label>
              <input type="text" value={formData.storeLocation} onChange={e => setFormData({...formData, storeLocation: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g., Shelf A-12" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="stockEntryForm" disabled={loading} className="px-6 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Item'}
          </button>
        </div>
      </div>
    </div>
  );
}
