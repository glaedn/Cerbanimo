import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGovernanceStore } from '../store/useGovernanceStore';
import ConstitutionGraph from '../components/Governance/ConstitutionGraph';
import { Shield, Clock, BookOpen, GitBranch, History, Play } from 'lucide-react';

const ConstitutionExplorer = () => {
  const { communityId } = useParams();
  const { activeConstitution, constitutionHistory, fetchCommunityGovernance, fetchConstitutionHistory } = useGovernanceStore();
  const [activeTab, setActiveTab] = useState('current'); // 'current', 'history', 'evolution'
  const [comparisonVersion, setComparisonVersion] = useState(null);

  useEffect(() => {
    fetchCommunityGovernance(communityId);
    fetchConstitutionHistory(communityId);
  }, [communityId, fetchCommunityGovernance, fetchConstitutionHistory]);

  return (
    <div className="constitution-explorer min-h-screen bg-black p-8">
      <header className="mb-10 flex justify-between items-center">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <Shield className="text-cyan-400" size={28} />
             <h1 className="text-4xl font-bold text-white tracking-tight">Constitution Explorer</h1>
           </div>
           <p className="text-gray-500 font-medium tracking-wide uppercase text-xs">
             Institutional Nervous System Visualizer | Community {communityId}
           </p>
        </div>

        <div className="flex bg-gray-900/50 p-1 rounded-lg border border-gray-800">
           <button
             onClick={() => setActiveTab('current')}
             className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition ${activeTab === 'current' ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.4)]' : 'text-gray-500 hover:text-white'}`}
           >
             Live Schema
           </button>
           <button
             onClick={() => setActiveTab('history')}
             className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition ${activeTab === 'history' ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.4)]' : 'text-gray-500 hover:text-white'}`}
           >
             Version History
           </button>
           <button
             onClick={() => setActiveTab('evolution')}
             className={`px-4 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition ${activeTab === 'evolution' ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(8,145,178,0.4)]' : 'text-gray-500 hover:text-white'}`}
           >
             Temporal Evolution
           </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Visualization Area */}
        <div className="lg:col-span-8 bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden relative shadow-2xl">
           <div className="absolute top-4 left-4 z-10 flex gap-4">
              <div className="bg-black/60 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                 <span className="text-[10px] text-white font-bold uppercase tracking-widest">Active State</span>
              </div>
           </div>

           <div className="p-4 border-b border-gray-800 bg-gray-900/30 flex justify-between items-center">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Topology: Institutional Authority Graph</span>
              <div className="flex gap-2">
                 <button className="p-1.5 hover:bg-white/5 rounded text-gray-500"><GitBranch size={14} /></button>
                 <button className="p-1.5 hover:bg-white/5 rounded text-gray-500"><History size={14} /></button>
              </div>
           </div>

           <ConstitutionGraph communityId={communityId} />

           {/* Temporal Playback HUD with Reform Markers */}
           {activeTab === 'evolution' && (
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-black/80 backdrop-blur-xl border border-cyan-500/30 p-4 rounded-xl flex items-center gap-6 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
                <button className="p-2 bg-cyan-600 rounded-full text-white shadow-[0_0_15px_rgba(8,145,178,0.5)] hover:scale-110 transition">
                   <Play size={20} fill="currentColor" />
                </button>
                <div className="flex-1">
                   <div className="h-1 w-full bg-gray-800 rounded-full relative mb-4">
                      <div className="absolute left-0 top-0 h-full bg-cyan-500/40" style={{ width: '100%' }}></div>

                      {/* Reform Markers */}
                      {[20, 45, 75, 95].map((pos, i) => (
                        <div
                          key={i}
                          className="absolute w-1 h-3 bg-cyan-400 -top-1 group cursor-pointer"
                          style={{ left: `${pos}%` }}
                        >
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition bg-gray-900 border border-cyan-500/30 p-2 rounded text-[8px] text-cyan-400 whitespace-nowrap uppercase font-bold">
                            Reform Wave #{i+1}
                          </div>
                        </div>
                      ))}

                      <div className="absolute left-[60%] top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-cyan-500 shadow-[0_0_15px_white]"></div>
                   </div>
                   <div className="flex justify-between text-[8px] text-gray-500 font-bold uppercase tracking-widest">
                      <span>v1: Genesis Layer</span>
                      <span>v2: Expansion</span>
                      <span className="text-cyan-400">v3: Regional Federation</span>
                      <span>v4: Current Layer</span>
                   </div>
                </div>
                <div className="text-right border-l border-white/10 pl-6">
                   <div className="text-sm text-white font-bold font-mono tracking-tighter">ERA: 2026.04.12</div>
                   <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest">v3.0 Activated</div>
                </div>
             </div>
           )}
        </div>

        {/* Info & Sidebar */}
        <div className="lg:col-span-4 space-y-6">
           {comparisonVersion && (
             <div className="bg-cyan-900/20 border border-cyan-500/50 p-4 rounded-xl flex justify-between items-center animate-pulse">
                <div className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Comparison Mode: v{comparisonVersion.version} vs Current</div>
                <button onClick={() => setComparisonVersion(null)} className="text-cyan-400 hover:text-white">&times;</button>
             </div>
           )}

           <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <BookOpen size={16} className="text-cyan-400" /> {activeTab === 'evolution' ? 'Historical Articles' : 'Active Articles'}
                </h2>
                <span className="text-[10px] text-gray-600 font-mono">HASH: 0x82f...</span>
              </div>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                 {activeConstitution?.content?.identity && (
                   <div className="p-4 bg-black/40 rounded border border-white/5">
                      <h3 className="text-[10px] text-cyan-400 font-bold uppercase mb-2">Art. I: Identity</h3>
                      <p className="text-xs text-gray-400 leading-relaxed italic">
                        "{activeConstitution.content.identity.purpose}"
                      </p>
                   </div>
                 )}

                 {activeConstitution?.content?.governance?.principles?.map((principle, i) => (
                   <div key={i} className="p-4 bg-black/40 rounded border border-white/5">
                      <h3 className="text-[10px] text-cyan-400 font-bold uppercase mb-2">Art. II.{i+1}: Principal</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {principle}
                      </p>
                   </div>
                 ))}

                 {activeConstitution?.content?.emergency && (
                   <div className="p-4 bg-red-950/20 rounded border border-red-900/20">
                      <h3 className="text-[10px] text-red-400 font-bold uppercase mb-2">Art. III: Emergency</h3>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {activeConstitution.content.emergency.summary}
                      </p>
                   </div>
                 )}
              </div>
           </div>

           <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                 <Clock size={16} className="text-cyan-400" /> Recent Amendments
              </h2>
              <div className="space-y-3">
                 {constitutionHistory.length > 0 ? (
                   constitutionHistory.map((change, i) => (
                     <div
                       key={i}
                       onClick={() => setComparisonVersion(change)}
                       className={`flex gap-4 items-center border-b border-white/5 pb-3 cursor-pointer group transition hover:bg-white/5 p-2 rounded ${comparisonVersion?.id === change.id ? 'bg-cyan-500/10' : ''}`}
                     >
                        <div className="text-xs font-mono text-cyan-400">v{change.version}</div>
                        <div className="flex-1">
                           <div className="text-[10px] text-gray-300 font-medium group-hover:text-white transition">{change.notes || 'Institutional refinement layer.'}</div>
                           <div className="text-[9px] text-gray-600 uppercase font-bold">{new Date(change.created_at).toLocaleDateString()}</div>
                        </div>
                     </div>
                   ))
                 ) : (
                   [
                     { ver: 'v4', date: '2 days ago', note: 'Quorum adjusted to 15%' },
                     { ver: 'v3', date: '1 month ago', note: 'Emergency override protocol added' }
                   ].map((change, i) => (
                     <div key={i} className="flex gap-4 items-center border-b border-white/5 pb-3 opacity-50">
                        <div className="text-xs font-mono text-cyan-400">{change.ver}</div>
                        <div className="flex-1">
                           <div className="text-[10px] text-gray-300 font-medium">{change.note}</div>
                           <div className="text-[9px] text-gray-600 uppercase font-bold">{change.date}</div>
                        </div>
                     </div>
                   ))
                 )}
              </div>
              <button className="w-full mt-6 py-2 border border-cyan-500/30 text-cyan-400 rounded-lg text-[10px] font-bold uppercase hover:bg-cyan-500/10 transition">
                 View Historical Archive
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ConstitutionExplorer;
