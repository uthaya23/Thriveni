import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../utils/api';
import { toast } from 'react-hot-toast';
import { FiActivity } from 'react-icons/fi';

export default function HistoryTab() {
  const { id } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/audit/job/${id}`);
      setLogs(res.data?.events || res.data || []);
    } catch (err) {
      toast.error('Failed to fetch job history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-4">
        <FiActivity className="text-blue-600" />
        Job Execution History
      </h2>
      
      {!Array.isArray(logs) || logs.length === 0 ? (
        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
          No audit logs found for this job.
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-200 ml-3 pl-6 space-y-6">
          {logs.map((log) => (
            <div key={log._id} className="relative">
              <div className="absolute -left-[31px] top-1 h-3 w-3 bg-white border-2 border-blue-500 rounded-full" />
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs uppercase tracking-wider">{log.action}</span>
                    <span className="text-sm">{log.summary}</span>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                    {new Date(log.createdAt).toLocaleString()}
                  </div>
                </div>
                {log.performedBy && (
                  <div className="text-xs text-slate-500 mt-2">
                    Performed by: <span className="font-semibold text-slate-700">{log.performedBy.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
