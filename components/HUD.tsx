
import React from 'react';
import { TimeOfDay } from '../types';

interface HUDProps {
  worldTime: number;
  timeOfDay: TimeOfDay;
}

const HUD: React.FC<HUDProps> = ({ worldTime, timeOfDay }) => {
  const formatTime = (time: number) => {
    const hours = Math.floor(time);
    const minutes = Math.floor((time % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (timeOfDay) {
      case TimeOfDay.MORNING: return 'text-yellow-400';
      case TimeOfDay.EVENING: return 'text-orange-400';
      case TimeOfDay.NIGHT: return 'text-indigo-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2 p-3 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700 pointer-events-none">
      <div className="flex items-center gap-3">
        <div className={`text-2xl font-mono font-bold ${getStatusColor()}`}>
          {formatTime(worldTime)}
        </div>
        <div className="h-6 w-px bg-slate-700" />
        <div className="text-sm font-semibold uppercase tracking-widest text-slate-400">
          {timeOfDay}
        </div>
      </div>
      <div className="flex gap-1 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-sky-500 transition-all duration-300" 
          style={{ width: `${(worldTime / 24) * 100}%` }} 
        />
      </div>
    </div>
  );
};

export default HUD;
