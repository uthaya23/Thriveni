import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FiActivity } from 'react-icons/fi';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/audit/recent?limit=100');
      setLogs(res.data?.events || res.data || []);
    } catch (err) {
      toast.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FiActivity className="text-blue-600" />
          Audit Ledger
        </h1>
        <p className="text-slate-500 mt-1">Immutable record of all system events and actions.</p>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Entity</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(!Array.isArray(logs) || logs.length === 0) ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400">No audit logs found</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">{log.performedBy?.name || 'System'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold uppercase tracking-wider">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-blue-600">{log.entityType}</div>
                        <div className="text-xs text-slate-400">{log.entityRef}</div>
                      </td>
                      <td className="px-6 py-4 max-w-md truncate" title={log.summary}>{log.summary}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
