import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function IssueStockModal({ onClose, onSuccess, items }) {
  const [jobs, setJobs] = useState([]);
  const [formData, setFormData] = useState({
    type: 'Issued',
    itemId: '',
    quantity: '',
    job: '',
    issuedTo: '',
    purpose: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get('/jobs');
        const jobsData = res.data?.jobs || res.data || [];
        setJobs(Array.isArray(jobsData) ? jobsData : []);
      } catch (err) {
        toast.error('Failed to load jobs');
      }
    };
    fetchJobs();
  }, []);

  const selectedItem = items.find(i => i._id === formData.itemId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.post('/inventory/transaction', formData);
      toast.success('Stock issued successfully');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error issuing stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-800">Issue Stock (Consumption)</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
            <FiX size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          <form id="issueStockForm" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Select Item *</label>
              <select required value={formData.itemId} onChange={e => setFormData({...formData, itemId: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="">-- Select Material/Fuel --</option>
                {items.map(item => (
                  <option key={item._id} value={item._id}>
                    {item.itemName} (Stock: {item.currentStock} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity Issued *</label>
              <div className="flex items-center gap-2">
                <input type="number" min="0.01" step="0.01" required value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Amount" />
                {selectedItem && <span className="text-gray-500 font-semibold">{selectedItem.unit}</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Link to Job Number (Optional)</label>
              <select value={formData.job} onChange={e => setFormData({...formData, job: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="">-- General / Workshop Use --</option>
                {jobs.map(job => (
                  <option key={job._id} value={job._id}>{job.jobNo} - {job.equipmentModel}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Issued To</label>
              <input type="text" value={formData.issuedTo} onChange={e => setFormData({...formData, issuedTo: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g., Assembly Team, Technician Name" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Purpose / Remarks</label>
              <input type="text" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g., Bearing Assembly, Cleaning" />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button type="submit" form="issueStockForm" disabled={loading} className="px-6 py-2 font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Processing...' : 'Issue Material'}
          </button>
        </div>
      </div>
    </div>
  );
}
