import { useEffect, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiSave, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

const STATUSES = ['Requested', 'Approved', 'Ordered', 'Received', 'Not Required'];

export default function MaterialsTab({ jobId }) {
  const [data, setData] = useState({ items: [], totalEstimatedCost: 0, notes: '' });
  const [inventoryItems, setInventoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch materials for job
    api.get(`/materials/${jobId}`).then(res => {
      if (res.data._id) {
        setData(res.data);
      } else {
        setData({ items: [], totalEstimatedCost: 0, notes: '' });
      }
      setLoading(false);
    }).catch(() => setLoading(false));

    // Fetch active inventory items
    api.get('/inventory').then(res => {
      const items = res.data.data || res.data || [];
      setInventoryItems(items.filter(i => i.isActive));
    }).catch(() => {});
  }, [jobId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate quantities before saving
      for (const item of data.items) {
        if (item.inventoryItem && item.status === 'Received') {
          const invId = typeof item.inventoryItem === 'object' ? item.inventoryItem._id : item.inventoryItem;
          const invItem = inventoryItems.find(i => i._id === invId);
          if (invItem && invItem.currentStock < item.quantity && !item.issuedTransaction) {
            toast.error(`Insufficient stock for ${item.description}. (In stock: ${invItem.currentStock})`);
            setSaving(false);
            return;
          }
        }
      }

      // Map inventoryItem reference correctly to ObjectId before saving
      const payload = {
        ...data,
        items: data.items.map(item => ({
          ...item,
          inventoryItem: item.inventoryItem?._id || item.inventoryItem || null
        }))
      };

      const res = await api.post(`/materials/${jobId}`, payload);
      setData(res.data);
      toast.success('Materials requisition updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save materials');
    } finally {
      setSaving(false);
    }
  };

  const addItem = () => {
    setData(d => ({
      ...d,
      items: [...d.items, { description: '', materialCode: '', quantity: 1, unit: 'Nos', unitCost: 0, status: 'Requested', inventoryItem: null }]
    }));
  };

  const removeItem = (idx) => {
    setData(d => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setData(d => {
      const newItems = [...d.items];
      newItems[idx] = { ...newItems[idx], [field]: value };
      return { ...d, items: newItems };
    });
  };

  if (loading) return (
    <div className="py-20 text-center text-slate-400">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="font-semibold text-sm">Loading job materials...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-black text-slate-800">🏪 Materials & Requisitions</h2>
          <p className="text-xs text-slate-500">Link required parts directly to the inventory store or request custom parts.</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs uppercase tracking-widest shadow hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-60">
          <FiSave size={14} /> {saving ? 'Saving...' : 'Save Requisitions'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Requisition List</h3>
          <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all" onClick={addItem}>
            <FiPlus size={14} /> Add Item
          </button>
        </div>

        {!data.items.length ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-50">
            No materials requested for this job yet
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-3 w-[30%]">Source / Part Name</th>
                  <th className="px-4 py-3">Mat. Code</th>
                  <th className="px-4 py-3 w-[12%]">Quantity</th>
                  <th className="px-4 py-3 w-[10%]">Unit</th>
                  <th className="px-4 py-3">Unit Cost (₹)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((item, i) => {
                  const currentInvId = item.inventoryItem?._id || item.inventoryItem || '';
                  const matchedInv = inventoryItems.find(inv => inv._id === currentInvId);
                  const isReceived = item.status === 'Received';
                  const showStockAlert = matchedInv && matchedInv.currentStock < item.quantity && !item.issuedTransaction;

                  return (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <select 
                            value={currentInvId}
                            disabled={!!item.issuedTransaction}
                            onChange={e => {
                              const val = e.target.value;
                              if (val === '') {
                                updateItem(i, 'inventoryItem', null);
                                updateItem(i, 'description', '');
                              } else {
                                const selected = inventoryItems.find(inv => inv._id === val);
                                if (selected) {
                                  updateItem(i, 'inventoryItem', selected._id);
                                  updateItem(i, 'description', selected.itemName);
                                  updateItem(i, 'materialCode', selected.batchNumber || '');
                                  updateItem(i, 'unit', selected.unit || 'Nos');
                                  updateItem(i, 'unitCost', selected.unitCost || 0);
                                }
                              }
                            }}
                            className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
                          >
                            <option value="">-- Custom Non-Inventory Part --</option>
                            {inventoryItems.map(inv => (
                              <option key={inv._id} value={inv._id}>
                                📦 {inv.itemName} (Stock: {inv.currentStock} {inv.unit})
                              </option>
                            ))}
                          </select>
                          
                          {!item.inventoryItem && (
                            <input 
                              value={item.description} 
                              onChange={e => updateItem(i, 'description', e.target.value)} 
                              className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none" 
                              placeholder="Enter part description..."
                              required
                            />
                          )}

                          {showStockAlert && (
                            <div className="flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-50 p-1.5 rounded-lg border border-red-100">
                              <FiAlertTriangle size={12} />
                              <span>Insufficient stock. Available: {matchedInv.currentStock}</span>
                            </div>
                          )}

                          {item.issuedTransaction && (
                            <div className="flex items-center gap-1 text-[10px] text-green-700 font-bold bg-green-50 p-1.5 rounded-lg border border-green-100">
                              <FiCheckCircle size={12} />
                              <span>Stock deducted from store</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input value={item.materialCode||''} disabled={!!item.issuedTransaction} onChange={e=>updateItem(i,'materialCode',e.target.value)} className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" value={item.quantity} disabled={!!item.issuedTransaction} onChange={e=>updateItem(i,'quantity',Number(e.target.value))} className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400" min="0.01" step="any" />
                      </td>
                      <td className="px-4 py-3">
                        <input value={item.unit} disabled={!!item.inventoryItem || !!item.issuedTransaction} onChange={e=>updateItem(i,'unit',e.target.value)} className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400" />
                      </td>
                      <td className="px-4 py-3">
                        <input type="number" value={item.unitCost} disabled={!!item.issuedTransaction} onChange={e=>updateItem(i,'unitCost',Number(e.target.value))} className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400" min="0" />
                      </td>
                      <td className="px-4 py-3">
                        <select value={item.status} onChange={e=>updateItem(i,'status',e.target.value)} className="text-xs font-semibold px-2.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:ring-1 focus:ring-blue-500 outline-none">
                          {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" onClick={()=>removeItem(i)} disabled={!!item.issuedTransaction}>
                          <FiTrash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Requisition Cost Estimator</span>
            <span className="text-xs text-slate-500">Calculated automatically from item quantities and costs</span>
          </div>
          <span className="text-lg font-black text-blue-600">
            ₹ {data.items.reduce((s,i) => s + ((i.quantity||0)*(i.unitCost||0)), 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="mt-6 space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Store Requisition Notes</label>
          <textarea value={data.notes||''} onChange={e=>setData(d=>({...d,notes:e.target.value}))} rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Provide extra specifications or notes for procurement..." />
        </div>
      </div>
    </div>
  );
}
