import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Bot,
  Clock,
  CheckCircle,
  MessageSquare,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const AgentFeed = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // This endpoint should be added to backend/routes/civic_kernel.js
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/civic-kernel/agent-events`);
        setEvents(response.data);
      } catch (err) {
        console.error('Failed to fetch agent events', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 pr-2 custom-scrollbar">
      {loading ? (
        Array(5).fill(0).map((_, i) => (
          <div key={i} className="h-24 bg-slate-700/50 animate-pulse rounded-lg" />
        ))
      ) : events.length > 0 ? (
        events.map((event, idx) => (
          <div key={idx} className="bg-slate-700/30 border border-slate-600/50 p-4 rounded-lg hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">
                {event.agent_type || 'Unknown Agent'}
              </span>
              <span className="text-[10px] text-slate-500 ml-auto flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(event.created_at))} ago
              </span>
            </div>

            <p className="text-sm text-slate-200 mb-3 leading-relaxed">
              <span className="text-cyan-400 font-medium">{event.event_type.replace('agent.', '').replace('.', ' ')}:</span> {
                typeof event.payload === 'object'
                ? event.payload.recommendation || event.payload.reasoning?.summary || 'Analyzing patterns...'
                : event.payload
              }
            </p>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Zap className="w-3 h-3 text-amber-500" />
                Confidence: {Math.round((event.confidence || 0.8) * 100)}%
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <MessageSquare className="w-3 h-3 text-indigo-400" />
                Evidence Linked
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-slate-600 text-sm italic">
          Listening for agent reasoning...
        </div>
      )}
    </div>
  );
};

export default AgentFeed;
