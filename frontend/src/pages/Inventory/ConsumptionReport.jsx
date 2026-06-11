import React, { useState, useEffect } from 'react';
import { FiTrendingDown, FiDollarSign, FiBox, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import api from '../../utils/api';

export default function ConsumptionReport() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/inventory/report/monthly?month=${month}&year=${year}`);
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load consumption report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link to="/inventory" className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-semibold mb-2">
            <FiArrowLeft /> Back to Inventory
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Consumption Report</h1>
          <p className="text-gray-500 text-sm mt-1">Review material and fuel usage costs across the workshop.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={month} 
            onChange={(e) => setMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64 bg-white rounded-xl shadow-sm border border-gray-100">
          <p className="text-gray-500 font-semibold animate-pulse">Generating Report Data...</p>
        </div>
      ) : reportData ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-xl border border-indigo-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                <FiDollarSign size={24} />
              </div>
              <div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Total Consumption Cost</span>
                <span className="text-2xl font-black text-indigo-900">₹{reportData.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-xl border border-emerald-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                <FiBox size={24} />
              </div>
              <div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Items Utilized</span>
                <span className="text-2xl font-black text-emerald-900">{reportData.totalItemsConsumed}</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-white p-5 rounded-xl border border-orange-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <FiTrendingDown size={24} />
              </div>
              <div>
                <span className="text-gray-500 text-xs font-bold uppercase tracking-wider block mb-1">Report Period</span>
                <span className="text-lg font-black text-orange-900">{reportData.period}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-800">Consumption Breakdown By Material</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Item / Material</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Qty Consumed</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Cost Per Unit</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.items.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 font-medium">No materials were consumed during this period.</td>
                    </tr>
                  ) : (
                    reportData.items.map((item, index) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">{item.itemName}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-bold ${item.category === 'Consumable' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-gray-900 text-right">
                          {item.totalQuantity.toLocaleString()} <span className="text-gray-500 text-xs">{item.unit}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-gray-500 text-right text-sm">
                          ₹{item.unitCost?.toLocaleString('en-IN') || 0}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-gray-900 text-right">
                          ₹{item.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {reportData.items.length > 0 && (
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan="4" className="px-6 py-4 text-right font-bold text-gray-700 uppercase text-xs tracking-wider">Total Inventory Expense</td>
                      <td className="px-6 py-4 text-right font-black font-mono text-indigo-700 text-lg">
                        ₹{reportData.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
