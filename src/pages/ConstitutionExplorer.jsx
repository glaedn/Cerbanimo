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
    <div className="constitution-explorer min-h-screen bg-[#050510] p-8 text-white selection:bg-cyan-500/30">
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

        <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/10 backdrop-blur-md">
           <button
             onClick={() => setActiveTab('current')}
             className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === 'current' ? 'bg-cyan-600 text-white shadow-[0_0_20px_rgba(8,145,178,0.4)] scale-105' : 'text-gray-500 hover:text-white'}`}
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
        <div className="lg:col-span-8 bg-[#0a0a1a] border border-white/10 rounded-3xl overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.8)] border-t-white/20">
           <div className="absolute top-6 left-6 z-10 flex gap-4">
              <div className="bg-black/40 backdrop-blur-xl border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan] animate-pulse"></div>
                 <span className="text-[10px] text-white font-bold uppercase tracking-[0.2em]">Active State</span>
              </div>
           </div>

           <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
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
                   <div className={`p-4 rounded border transition-all duration-500 ${comparisonVersion && comparisonVersion.content?.identity?.purpose !== activeConstitution.content.identity.purpose ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-black/40 border-white/5'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-[10px] text-cyan-400 font-bold uppercase">Art. I: Identity</h3>
                        {comparisonVersion && comparisonVersion.content?.identity?.purpose !== activeConstitution.content.identity.purpose && (
                          <span className="text-[8px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">Modified</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed italic">
                        "{activeConstitution.content.identity.purpose}"
                      </p>
                   </div>
                 )}

                 {activeConstitution?.content?.governance?.principles?.map((principle, i) => {
                   const isDifferent = comparisonVersion && (!comparisonVersion.content?.governance?.principles || comparisonVersion.content.governance.principles[i] !== principle);
                   return (
                     <div key={i} className={`p-4 rounded border transition-all duration-500 ${isDifferent ? 'bg-yellow-500/10 border-yellow-500/50' : 'bg-black/40 border-white/5'}`}>
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="text-[10px] text-cyan-400 font-bold uppercase">Art. II.{i+1}: Principal</h3>
                          {isDifferent && (
                            <span className="text-[8px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold uppercase">Modified</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {principle}
                        </p>
                     </div>
                   );
                 })}

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
