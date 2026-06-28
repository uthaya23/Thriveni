import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FiBox, FiSearch } from 'react-icons/fi';

export default function AssetRegistry() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assets');
      setAssets(res.data?.assets || res.data || []);
    } catch (err) {
      toast.error('Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = Array.isArray(assets) ? assets.filter(a => 
    a.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
    a.make?.toLowerCase().includes(search.toLowerCase()) ||
    a.equipmentModel?.toLowerCase().includes(search.toLowerCase())
  ) : [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FiBox className="text-blue-600" />
            Asset Registry
          </h1>
          <p className="text-slate-500 mt-1">Track the complete lifecycle of every serialized component.</p>
        </div>
        <div className="relative w-full md:w-72">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search serial number, make..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Serial Number</th>
                <th className="px-6 py-4">Component Type</th>
                <th className="px-6 py-4">Make / Model</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Total Jobs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAssets.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No assets found</td></tr>
              ) : (
                filteredAssets.map(asset => (
                  <tr 
                    key={asset._id} 
                    onClick={() => navigate(`/assets/${asset.serialNumber}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{asset.serialNumber}</td>
                    <td className="px-6 py-4">{asset.componentType || '-'}</td>
                    <td className="px-6 py-4">{asset.make || ''} {asset.equipmentModel ? `/ ${asset.equipmentModel}` : ''}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${asset.currentStatus === 'In Service' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {asset.currentStatus || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-blue-600">{asset.totalRebuildCount || asset.jobs?.length || 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
