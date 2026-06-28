import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FiArrowLeft, FiBox, FiTool, FiCalendar, FiCheckCircle } from 'react-icons/fi';

export default function AssetDetailPage() {
  const { serialNumber } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssetHistory();
  }, [serialNumber]);

  const fetchAssetHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/assets/history/${serialNumber}`);
      setAsset(res.data);
    } catch (err) {
      toast.error('Failed to fetch asset history');
      navigate('/assets');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  if (!asset) return null;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <button onClick={() => navigate('/assets')} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-medium text-sm transition-colors">
        <FiArrowLeft /> Back to Registry
      </button>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-50 text-blue-600 p-4 rounded-xl">
              <FiBox size={32} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{asset.serialNumber}</h1>
              <p className="text-slate-500">{asset.componentType || 'Component'}</p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${asset.currentStatus === 'In Service' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {asset.currentStatus || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Make / Model</div>
            <div className="text-slate-800 font-medium">{asset.make || '-'} {asset.equipmentModel ? `/ ${asset.equipmentModel}` : ''}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Equipment No / Site</div>
            <div className="text-slate-800 font-medium">{asset.equipNo || '-'} {asset.site ? `(${asset.site})` : ''}</div>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Total Rebuilds</div>
            <div className="text-slate-800 font-bold text-lg">{asset.totalRebuildCount || asset.jobs?.length || 0}</div>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FiTool className="text-blue-600" />
        Rebuild History
      </h2>

      <div className="space-y-4">
        {!asset.jobs || asset.jobs.length === 0 ? (
          <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
            No repair jobs linked to this asset yet.
          </div>
        ) : (
          asset.jobs.map((job, idx) => (
            <div 
              key={job._id} 
              onClick={() => navigate(`/jobs/${job._id}`)}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row justify-between md:items-center gap-4 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  #{idx + 1}
                </div>
                <div>
                  <div className="font-bold text-blue-700 text-lg group-hover:underline">{job.jobNo}</div>
                  <div className="text-sm text-slate-500 flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1"><FiCalendar size={14} /> {job.dateReceived ? new Date(job.dateReceived).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="px-3 py-1 rounded bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider mb-2">
                  {job.stage}
                </span>
                {job.status === 'Completed' && (
                  <span className="flex items-center gap-1 text-sm font-semibold text-green-600">
                    <FiCheckCircle /> Completed
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
