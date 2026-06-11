import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function ReceiveStockModal({ onClose, onSuccess, items }) {
  const [formData, setFormData] = useState({
    type: 'Received',
    itemId: '',
    quantity: '',
    unitCost: '',
    supplier: '',
    invoiceNumber: ''
  });
  const [loading, setLoading] = useState(false);

  const selectedItem = items.find(i => i._id === formData.itemId);

  // Auto-fill unitCost from selected item if user hasn't typed anything
  const handleItemChange = (e) => {
    const val = e.target.value;
    const item = items.find(i => i._id === val);
    setFormData({
      ...formData,
      itemId: val,
      unitCost: item ? item.unitCost : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/inventory/transaction', formData);
      toast.success('Stock received successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error receiving stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Receive Stock</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="receiveStockForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Item *</label>
              <select required value={formData.itemId} onChange={handleItemChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="">-- Select Material/Fuel --</option>
                {items.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.itemName} (Current Stock: {item.currentStock} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity Received *</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0.01" step="0.01" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Amount" />
                  {selectedItem && <span className="text-gray-500 font-semibold">{selectedItem.unit}</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Unit Cost (₹) *</label>
                <input type="number" min="0" step="0.01" required value={formData.unitCost} onChange={e => setFormData({...formData, unitCost: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g., 85" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Supplier</label>
              <input type="text" value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="Vendor Name" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Invoice Number</label>
              <input type="text" value={formData.invoiceNumber} onChange={e => setFormData({...formData, invoiceNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="INV-XXXXX" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="receiveStockForm" disabled={loading} className="px-6 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Processing...' : 'Receive Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}
