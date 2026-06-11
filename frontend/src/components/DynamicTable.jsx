import React, { useState, useEffect } from 'react';
import { FiPlus, FiTrash2, FiCpu, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import RowPhotoCapture from './RowPhotoCapture';

/**
 * Premium, ultra-responsive dynamic table.
 * Desktop: Traditional horizontal grid/table.
 * Mobile: Highly compact, expandable accordion cards to save screen height.
 */
export default function DynamicTable({ columns, data = [], onChange, isReadOnly = false, onAI }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAddRow = () => {
    if (isReadOnly) return;
    const newRow = columns.reduce((acc, col) => {
      acc[col.key] = col.type === 'number' ? 0 : '';
      return acc;
    }, {});
    onChange([...data, newRow]);
  };

  const handleRemoveRow = (index) => {
    if (isReadOnly) return;
    const newData = [...data];
    newData.splice(index, 1);
    onChange(newData);
  };

  const handleChange = (index, key, value) => {
    if (isReadOnly) return;
    const newData = [...data];
    newData[index][key] = value;
    onChange(newData);
  };

  const toggleRowExpand = (index) => {
    setExpandedRows(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Helper for premium dynamic status coloring
  const getStatusStyle = (val) => {
    const v = (val || '').toLowerCase();
    if (v === 'available' || v === 'pass') {
      return { background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' };
    }
    if (v === 'missing' || v === 'fail') {
      return { background: '#fff5f5', color: '#e11d48', border: '1px solid #fecdd3' };
    }
    if (v === 'damaged') {
      return { background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
    }
    return { background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
  };

  const renderFieldInput = (col, row, rowIndex) => {
    const val = row[col.key] || '';
    if (col.type === 'photo') {
      return <RowPhotoCapture value={val} onChange={(v) => handleChange(rowIndex, col.key, v)} isReadOnly={isReadOnly} />;
    }
    if (col.type === 'select') {
      const statusStyle = getStatusStyle(val);
      return (
        <select
          value={val}
          onChange={e => handleChange(rowIndex, col.key, e.target.value)}
          disabled={isReadOnly}
          style={{
            width: '100%', minHeight: 38, padding: '6px 12px',
            borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
            outline: 'none', transition: 'all 0.15s',
            ...statusStyle
          }}
        >
          <option value="" style={{ background: '#fff', color: '#111' }}>Select...</option>
          {col.options?.map(opt => (
            <option key={opt} value={opt} style={{ background: '#fff', color: '#111' }}>{opt}</option>
          ))}
        </select>
      );
    }
    if (col.type === 'textarea') {
      return (
        <textarea
          value={val}
          onChange={e => handleChange(rowIndex, col.key, e.target.value)}
          placeholder={isReadOnly ? '' : `Enter ${col.label}...`}
          readOnly={isReadOnly}
          rows={1}
          style={{
            width: '100%', minHeight: 38, padding: '8px 12px',
            background: isReadOnly ? '#f8fafc' : '#fff',
            border: '1px solid #e2e8f0', borderRadius: 8,
            color: '#1e293b', fontSize: '0.8rem', fontWeight: 500, resize: 'vertical',
            outline: 'none', transition: 'all 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--thriveni-blue)'}
          onBlur={e => e.target.style.borderColor = '#e2e8f0'}
        />
      );
    }
    return (
      <input
        type={col.type || 'text'}
        value={col.type === 'date' && val.includes?.('T') ? val.split('T')[0] : val}
        onChange={e => handleChange(rowIndex, col.key, e.target.value)}
        placeholder={isReadOnly ? '' : `Enter ${col.label}...`}
        readOnly={isReadOnly}
        style={{
          width: '100%', minHeight: 38, padding: '6px 12px',
          background: isReadOnly ? '#f8fafc' : '#fff',
          border: '1px solid #e2e8f0', borderRadius: 8,
          color: '#1e293b', fontSize: '0.8rem', fontWeight: 600,
          outline: 'none', transition: 'all 0.15s',
        }}
        onFocus={e => e.target.style.borderColor = 'var(--thriveni-blue)'}
        onBlur={e => e.target.style.borderColor = '#e2e8f0'}
      />
    );
  };

  // 1. DESKTOP VIEW: Beautiful, clean data grid table
  const renderDesktop = () => {
    return (
      <div className="overflow-x-auto rounded-xl border border-slate-150 shadow-sm bg-white">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[60px] text-center">#</th>
              {columns.map(col => (
                <th
                  key={col.key}
                  className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest"
                  style={{ width: col.type === 'photo' ? 80 : col.key === 'quantity' ? 90 : col.key === 'status' ? 160 : 'auto' }}
                >
                  {col.label}
                </th>
              ))}
              {!isReadOnly && <th className="p-4 text-[10px] font-black text-slate-500 uppercase tracking-widest w-[80px] text-center">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 text-xs font-bold text-slate-400 text-center">{rowIndex + 1}</td>
                {columns.map(col => (
                  <td key={col.key} className="p-3">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {col.key === 'partName' && onAI && (
                        <button
                          onClick={() => onAI(row, rowIndex)}
                          title="Trigger AI Analysis"
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200/50 flex-shrink-0"
                        >
                          <FiCpu size={13} />
                        </button>
                      )}
                      <div className="w-full">{renderFieldInput(col, row, rowIndex)}</div>
                    </div>
                  </td>
                ))}
                {!isReadOnly && (
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleRemoveRow(rowIndex)}
                      className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors border border-rose-200/50"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // 2. MOBILE VIEW: Super compact, beautiful expandable accordion cards
  const renderMobile = () => {
    return (
      <div className="flex flex-col gap-3">
        {data.map((row, rowIndex) => {
          const isExpanded = expandedRows[rowIndex];
          // Get specific columns to show on the compact header row
          const photoCol = columns.find(c => c.type === 'photo');
          const nameCol = columns.find(c => c.key === 'partName' || c.key === 'terminal');
          const statusCol = columns.find(c => c.type === 'select');
          
          // Other columns to show when expanded
          const detailCols = columns.filter(c => c !== photoCol && c !== nameCol && c !== statusCol);

          return (
            <div
              key={rowIndex}
              style={{
                background: '#fff', border: '1px solid #e2e8f0',
                borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* COMPACT CARD HEADER */}
              <div 
                className="p-3 flex items-center justify-between gap-3 bg-slate-50/30"
                style={{ minHeight: 60 }}
              >
                {/* Left: Index, Photo & Name */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0" onClick={() => toggleRowExpand(rowIndex)}>
                  <span className="text-[10px] font-black text-slate-400">#{rowIndex + 1}</span>
                  {photoCol && (
                    <div className="flex-shrink-0 scale-90">
                      {renderFieldInput(photoCol, row, rowIndex)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-extrabold text-slate-800 truncate">
                      {row[nameCol?.key] || `${nameCol?.label} #${rowIndex + 1}`}
                    </div>
                  </div>
                </div>

                {/* Right: Status Dropdown & AI Icon & Chevron */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {onAI && (
                    <button
                      onClick={() => onAI(row, rowIndex)}
                      className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200"
                    >
                      <FiCpu size={14} />
                    </button>
                  )}
                  {statusCol && (
                    <div className="w-[120px]">
                      {renderFieldInput(statusCol, row, rowIndex)}
                    </div>
                  )}
                  <button 
                    onClick={() => toggleRowExpand(rowIndex)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    {isExpanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* EXPANDABLE DETAILS */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 bg-white space-y-4 animate-in slide-in-from-top-2 duration-150">
                  <div className="grid grid-cols-1 gap-3">
                    {detailCols.map(col => (
                      <div key={col.key}>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                          {col.label}
                        </label>
                        {renderFieldInput(col, row, rowIndex)}
                      </div>
                    ))}
                  </div>

                  {!isReadOnly && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleRemoveRow(rowIndex)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold"
                      >
                        <FiTrash2 size={13} /> Remove Entry
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ width: '100%' }}>
      {data.length === 0 ? (
        <div style={{
          padding: '36px 20px', textAlign: 'center',
          background: '#f9fafb', border: '2px dashed #e5e7eb',
          borderRadius: 14, color: '#9ca3af',
        }}>
          <div style={{ fontSize: '1.3rem', marginBottom: 6 }}>📋</div>
          <p style={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {isReadOnly ? 'No records found.' : "No records yet. Tap 'Add Entry' below."}
          </p>
        </div>
      ) : (
        isMobile ? renderMobile() : renderDesktop()
      )}

      {!isReadOnly && (
        <button onClick={handleAddRow} style={{
          width: '100%', minHeight: 42, marginTop: 14,
          background: '#f8fafc', border: '1px dashed #cbd5e1',
          borderRadius: 12, cursor: 'pointer', color: 'var(--thriveni-blue)',
          fontWeight: 700, fontSize: '0.8rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
        onMouseOver={e => e.currentTarget.style.borderColor = 'var(--thriveni-blue)'}
        onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
        >
          <FiPlus size={16} /> Add Entry
        </button>
      )}
    </div>
  );
}
