
import React from 'react';
import { NPCData } from '../types';

interface NPCInspectorProps {
  npc: NPCData;
  onClose: () => void;
}

const NPCInspector: React.FC<NPCInspectorProps> = ({ npc, onClose }) => {
  return (
    <div className="w-full bg-slate-800/50 backdrop-blur-md p-4 animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `#${npc.color.toString(16).padStart(6, '0')}` }} />
          Status: {npc.name}
        </h3>
        <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">Personality</label>
          <p className="text-xs text-slate-300 capitalize">{npc.personality}</p>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-0.5">Mood</label>
          <p className="text-xs text-sky-400 capitalize font-medium">{npc.mood}</p>
        </div>
      </div>
      
      <div className="mt-3">
        <label className="text-[9px] uppercase tracking-wider text-slate-500 font-bold block mb-1">Recent Memory</label>
        <p className="text-[10px] text-slate-400 italic line-clamp-1">{npc.memory[0] || "None yet."}</p>
      </div>
    </div>
  );
};

export default NPCInspector;
