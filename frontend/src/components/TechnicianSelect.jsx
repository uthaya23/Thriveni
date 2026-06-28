import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

export default function TechnicianSelect({ value, onChange }) {
  const [technicians, setTechnicians] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [customName, setCustomName] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    api.get('/technicians/all')
      .then(res => setTechnicians(res.data.technicians || []))
      .catch(err => console.error('Failed to load technicians', err));
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedList = value ? value.split(', ').filter(Boolean) : [];

  const toggleTech = (name) => {
    let updated;
    if (selectedList.includes(name)) {
      updated = selectedList.filter(t => t !== name);
    } else {
      updated = [...selectedList, name];
    }
    onChange(updated.join(', '));
  };

  const handleAddCustom = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (customName.trim()) {
        if (!selectedList.includes(customName.trim())) {
          toggleTech(customName.trim());
        }
        setCustomName('');
      }
    }
  };

  return (
    <div className="relative tech-select-container" ref={containerRef}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Technicians</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[38px] w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium focus-within:ring-2 focus-within:ring-blue-500 bg-white outline-none cursor-pointer flex flex-wrap gap-1 items-center"
      >
        {selectedList.length > 0 ? (
          selectedList.map(name => (
            <span key={name} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold border border-blue-100">
              {name}
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); toggleTech(name); }} 
                className="hover:text-blue-900 font-bold ml-1"
              >
                ✕
              </button>
            </span>
          ))
        ) : (
          <span className="text-slate-400 font-normal">Select technicians...</span>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl p-3 space-y-2">
          <div className="max-h-40 overflow-y-auto space-y-1">
            {technicians.map(tech => {
              const isSelected = selectedList.includes(tech.name);
              return (
                <div 
                  key={tech._id} 
                  onClick={() => toggleTech(tech.name)}
                  className={`flex items-center gap-3 px-2 py-2 rounded-md text-sm font-semibold cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50 text-blue-800 shadow-sm' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`relative flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-black text-white shrink-0 ${isSelected ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    {isSelected ? (
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      tech.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span>{tech.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium leading-none">{tech.department}</span>
                  </div>
                </div>
              );
            })}
            {technicians.length === 0 && (
              <p className="text-xs text-slate-400 italic p-1">No registered technicians found</p>
            )}
          </div>
          
          <div className="pt-2 border-t border-slate-100">
            <input 
              type="text" 
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              onKeyDown={handleAddCustom}
              placeholder="Press Enter to add custom name..." 
              className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
