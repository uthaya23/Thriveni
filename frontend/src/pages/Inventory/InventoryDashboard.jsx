import React, { useState, useEffect } from 'react';
import { FiPlus, FiMinusCircle, FiPlusCircle, FiAlertTriangle, FiFileText } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import StockEntryModal from './StockEntryModal';
import IssueStockModal from './IssueStockModal';
import ReceiveStockModal from './ReceiveStockModal';

export default function InventoryDashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/inventory');
      setItems(res.data);
    } catch (error) {
      toast.error('Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const lowStockItems = items.filter(item => item.status === 'Low Stock');
  const totalValue = items.reduce((sum, item) => sum + (item.currentStock * item.unitCost), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory & Fuel Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage workshop consumables, fuels, and oils.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/reports?tab=inventory" className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 font-medium transition-colors shadow-sm">
            <FiFileText />
            <span>Reports</span>
          </Link>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm">
            <FiPlus />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Items</span>
          <span className="text-2xl font-bold text-gray-900">{items.length}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-1">Total Value</span>
          <span className="text-2xl font-bold text-gray-900">₹{totalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
        <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-center ${lowStockItems.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-sm font-semibold uppercase tracking-wider ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>Low Stock Alerts</span>
            {lowStockItems.length > 0 && <FiAlertTriangle className="text-red-500" />}
          </div>
          <span className={`text-2xl font-bold ${lowStockItems.length > 0 ? 'text-red-700' : 'text-gray-900'}`}>{lowStockItems.length}</span>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex gap-2 flex-col justify-center">
          <button onClick={() => setShowReceiveModal(true)} className="flex items-center justify-center gap-2 w-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100 font-medium transition-colors text-sm">
            <FiPlusCircle /> Receive Stock
          </button>
          <button onClick={() => setShowIssueModal(true)} className="flex items-center justify-center gap-2 w-full bg-orange-50 text-orange-700 border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-100 font-medium transition-colors text-sm">
            <FiMinusCircle /> Issue Stock
          </button>
        </div>
      </div>

      {/* Low Stock Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start gap-3 shadow-sm">
          <FiAlertTriangle className="text-red-500 mt-0.5" size={20} />
          <div>
            <h3 className="text-red-800 font-bold text-sm">Action Required: Low Stock Detected</h3>
            <p className="text-red-700 text-sm mt-1">
              The following items have dropped below their minimum stock levels:
              <span className="font-semibold ml-1">
                {lowStockItems.map(i => i.itemName).join(', ')}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Stock Status Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Current Stock Status</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Current Stock</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Min Level</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Store Loc.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading inventory data...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No items found. Create your first inventory item to get started.</td>
                </tr>
              ) : (
                items.map(item => (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-gray-800">{item.itemName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.category === 'Consumable' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 text-right">
                      {item.currentStock.toLocaleString('en-IN', { maximumFractionDigits: 2 })} <span className="text-gray-400 font-sans text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.status === 'Low Stock' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                          <FiAlertTriangle /> Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 font-mono text-right">
                      {item.minStockLevel} <span className="text-gray-400 font-sans text-xs ml-1">{item.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{item.storeLocation || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && <StockEntryModal onClose={() => setShowAddModal(false)} onSuccess={fetchItems} />}
      {showIssueModal && <IssueStockModal items={items} onClose={() => setShowIssueModal(false)} onSuccess={fetchItems} />}
      {showReceiveModal && <ReceiveStockModal items={items} onClose={() => setShowReceiveModal(false)} onSuccess={fetchItems} />}

    </div>
  );
}
