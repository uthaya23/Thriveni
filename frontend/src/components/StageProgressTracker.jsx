import React from 'react';
import { FiCheck } from 'react-icons/fi';

const STAGES = ['Received', 'Visual Inspection', 'Dismantling', 'Repair / Reclamation', 'Pre-Assembly', 'Assembly', 'Testing', 'Dispatch', 'Completed'];

/**
 * Enterprise workflow tracker for stage-by-stage progression.
 * @param {String} currentStage - The current stage of the job
 */
export default function StageProgressTracker({ currentStage }) {
  const currentIdx = STAGES.indexOf(currentStage) === -1 ? 0 : STAGES.indexOf(currentStage);

  return (
    <div className="w-full py-6 overflow-x-auto">
      <div className="flex items-center min-w-max justify-center">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          
          return (
            <React.Fragment key={stage}>
              {/* Stage Node */}
              <div className="flex flex-col items-center relative z-10 w-28 group">
                <div 
                  className={`flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 shadow-sm
                    ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 
                      isActive ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100 scale-110' : 
                      'bg-white border-slate-300 text-slate-400 group-hover:border-slate-400'}`}
                >
                  {isCompleted ? <FiCheck size={18} strokeWidth={3} /> : <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>{idx + 1}</span>}
                </div>
                <span 
                  className={`mt-3 text-[11px] font-bold uppercase tracking-wider text-center transition-colors
                    ${isCompleted ? 'text-emerald-700' : 
                      isActive ? 'text-blue-800' : 
                      'text-slate-400'}`}
                >
                  {stage}
                </span>
              </div>
              
              {/* Connector Line */}
              {idx < STAGES.length - 1 && (
                <div 
                  className={`h-1 w-16 -mx-6 z-0 transition-all duration-500 rounded-full
                    ${isCompleted ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-200'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
