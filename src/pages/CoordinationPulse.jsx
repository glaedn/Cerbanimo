import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AgentFeed from '../components/AgentFeed';
import {
  Activity,
  Heart,
  Target,
  Users,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

const CoordinationPulse = () => {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/civic-kernel/signals`);
        setSignals(response.data);
      } catch (err) {
        console.error('Failed to fetch pulse signals', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignals();
    const interval = setInterval(fetchSignals, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <header className="mb-12">
        <div className="flex items-center gap-3 mb-2">
          <Activity className="text-cyan-400 w-8 h-8" />
          <h1 className="text-4xl font-bold tracking-tight">Coordination Pulse</h1>
        </div>
        <p className="text-slate-400 text-lg max-w-2xl">
          Real-time monitoring of the ecosystem metabolism. Detecting coordination opportunities and stabilizing mission momentum.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <AlertTriangle className="text-amber-500 w-5 h-5" />
              Critical Signals
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-32 bg-slate-800 animate-pulse rounded-xl border border-slate-700" />
                ))
              ) : signals.length > 0 ? (
                signals.map((signal, idx) => (
                  <div key={idx} className="bg-slate-800 border border-slate-700 p-5 rounded-xl hover:border-cyan-500/50 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                        signal.severity > 70 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {signal.agent}
                      </span>
                      <div className="w-12 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${signal.severity > 70 ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${signal.severity}%` }}
                        />
                      </div>
                    </div>
                    <h3 className="font-bold text-lg mb-1">{signal.title}</h3>
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{signal.signal}</p>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-cyan-400 flex items-center gap-1">
                        RECOMMENDED ACTION <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
                  No active critical signals detected. Metabolism is stable.
                </div>
              )}
            </div>
          </section>

          <section className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Heart className="text-rose-500 w-5 h-5" />
              Community Health Clusters
            </h2>
            <div className="h-64 flex items-center justify-around gap-4">
              {signals.length > 0 ? (
                Object.entries(
                  signals.reduce((acc, s) => {
                    acc[s.agent] = acc[s.agent] || [];
                    acc[s.agent].push(s);
                    return acc;
                  }, {})
                ).map(([agent, clusterSignals]) => {
                  const avgSeverity = clusterSignals.reduce((a, b) => a + b.severity, 0) / clusterSignals.length;
                  const health = 100 - avgSeverity;
                  return (
                    <div key={agent} className="flex flex-col items-center gap-3">
                      <div
                        className="w-24 h-24 rounded-full border-4 flex items-center justify-center relative shadow-lg"
                        style={{
                          borderColor: health > 70 ? '#10b981' : health > 40 ? '#f59e0b' : '#f43f5e',
                          backgroundColor: `${health > 70 ? '#10b981' : health > 40 ? '#f59e0b' : '#f43f5e'}10`
                        }}
                      >
                        <span className="text-xl font-bold">{Math.round(health)}%</span>
                        <div
                          className="absolute inset-0 rounded-full animate-pulse"
                          style={{ border: `2px solid ${health > 70 ? '#10b981' : health > 40 ? '#f59e0b' : '#f43f5e'}40` }}
                        />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{agent}</span>
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 italic">No health data available.</div>
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 h-[calc(100vh-12rem)] sticky top-8 flex flex-col">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Target className="text-indigo-500 w-5 h-5" />
              Agent Reasoning Feed
            </h2>
            <div className="flex-1 overflow-hidden">
              <AgentFeed />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CoordinationPulse;
