import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  GitBranch,
  ArrowRight,
  Circle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const MissionEvolutionView = ({ projectId }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!projectId) return;
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/civic-kernel/mission-history/${projectId}`);
        setHistory(response.data);
      } catch (err) {
        console.error('Failed to fetch mission history', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [projectId]);

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2">
        <AlertCircle className="w-8 h-8" />
        <p>Select a mission to view its evolution</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 w-1/4 rounded" />
          <div className="h-32 bg-slate-700 rounded-lg" />
        </div>
      ) : history.length > 0 ? (
        <div className="relative pl-8 border-l border-slate-700 space-y-8">
          {history.map((event, idx) => (
            <div key={idx} className="relative">
              <div className="absolute -left-10 top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-cyan-500 z-10" />

              <div className="text-xs text-slate-500 mb-1 font-mono">
                {format(new Date(event.created_at), 'yyyy-MM-dd HH:mm')}
              </div>

              <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <GitBranch className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
                    {event.event_type.replace(/_/g, ' ')}
                  </span>
                </div>

                <p className="text-sm text-slate-300">
                  {event.event_type.includes('spawned')
                    ? `Mission materialized from need #${event.payload.needId}. Initialized with ${event.payload.taskCount} tasks.`
                    : event.event_type.includes('escalated')
                    ? 'Mission priority escalated by Coordination Agent due to lack of momentum.'
                    : `State change detected: ${event.event_type}`}
                </p>

                {event.payload.reason && (
                  <div className="mt-3 text-xs bg-slate-900/50 p-2 rounded border border-slate-700/50 text-slate-400 italic">
                    Reason: {event.payload.reason}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="relative">
            <div className="absolute -left-10 top-1 w-4 h-4 rounded-full bg-cyan-500 animate-pulse z-10" />
            <div className="text-xs text-cyan-400 font-bold uppercase tracking-tighter">Present Momentum</div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-slate-600 italic border border-dashed border-slate-800 rounded-xl">
          No significant evolutionary events recorded for this mission yet.
        </div>
      )}
    </div>
  );
};

export default MissionEvolutionView;
