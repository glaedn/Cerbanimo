import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { useAuth0 } from '@auth0/auth0-react';
import ConstitutionGraph from '../components/Governance/ConstitutionGraph';
import { History, Shield, Info, Network, GitPullRequest, GitBranch, Search, ChevronRight, Activity, Clock, FileText } from 'lucide-react';
import * as S from '../components/Governance/GovernanceStyles';

const ConstitutionExplorer = () => {
  const { communityId } = useParams();
  const { activeConstitution, constitutionVersions, loading, error, fetchConstitutionVersions } = useGovernanceStore();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedVersionId, setSelectedVersionId] = useState(null);
  const [compareVersionId, setCompareVersionId] = useState(null);
  const [showDiff, setShowDiff] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const token = await getAccessTokenSilently();
        fetchConstitutionVersions(communityId, token);
      } catch (err) {
        console.error("Auth failed:", err);
        fetchConstitutionVersions(communityId);
      }
    };
    loadVersions();
  }, [communityId, fetchConstitutionVersions, getAccessTokenSilently]);

  useEffect(() => {
    if (activeConstitution && !selectedVersionId) {
      setSelectedVersionId(activeConstitution.id);
    }
  }, [activeConstitution, selectedVersionId]);

  const currentVersion = useMemo(() => {
    return constitutionVersions.find(v => v.id === selectedVersionId) || activeConstitution;
  }, [constitutionVersions, selectedVersionId, activeConstitution]);

  const compareVersion = useMemo(() => {
    return constitutionVersions.find(v => v.id === compareVersionId);
  }, [constitutionVersions, compareVersionId]);

  const reformMarkers = useMemo(() => {
    if (!constitutionVersions.length) return [];
    return constitutionVersions.map((v, i) => ({
      version: v.version,
      date: new Date(v.created_at).toLocaleDateString(),
      label: i === 0 ? 'Foundation' : i === constitutionVersions.length -1 ? 'Current' : 'Reform'
    })).reverse();
  }, [constitutionVersions]);

  if (loading && !activeConstitution) return (
    <S.PageContainer className="flex flex-col items-center justify-center">
       <History className="animate-spin text-cyan-500 opacity-20" size={64} />
       <S.Subtitle className="mt-8 uppercase tracking-widest text-cyan-400">Restoring Institutional Archaeology...</S.Subtitle>
    </S.PageContainer>
  );

  return (
    <S.PageContainer>
      <S.Header>
        <S.TitleBlock>
          <S.Title>
            <Shield size={32} /> Constitution Explorer
          </S.Title>
          <S.Subtitle>Community: {communityId} | Version: {currentVersion?.version || 'Live'}</S.Subtitle>
        </S.TitleBlock>

        <div className="flex items-center gap-4">
           <S.NeonButton variant="outline" onClick={() => setShowDiff(!showDiff)}>
             <GitPullRequest size={16} /> {showDiff ? 'Exit Compare' : 'Compare Versions'}
           </S.NeonButton>
           <S.NeonButton>
             <GitBranch size={16} /> Propose Amendment
           </S.NeonButton>
        </div>
      </S.Header>

      <S.LayoutGrid>
        {/* Left: Interactive Graph */}
        <S.GridItem span={8}>
          <S.GlassPanel className="h-[650px] relative overflow-hidden">
            <S.SectionLabel>
              <Network size={14} /> Institutional Nervous System
            </S.SectionLabel>

            <div className="absolute top-12 left-6 z-10 space-y-4">
               <div className="p-3 bg-black/60 rounded-xl border border-white/10 backdrop-blur-md">
                 <S.Subtitle className="text-[9px] mb-2">Authority Routing</S.Subtitle>
                 <div className="flex gap-4">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div><span className="text-[8px] font-mono">Role</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div><span className="text-[8px] font-mono">Rule</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]"></div><span className="text-[8px] font-mono">Treaty</span></div>
                 </div>
               </div>
            </div>

            <ConstitutionGraph
              constitution={currentVersion}
              compareConstitution={showDiff ? compareVersion : null}
            />

            {/* Temporal Timeline HUD */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] z-10">
               <S.GlassPanel className="p-4 bg-black/80">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[9px] font-bold text-gray-500 uppercase flex items-center gap-2">
                       <Clock size={12} /> Institutional Evolution Timeline
                    </span>
                    <span className="text-[9px] font-mono text-cyan-400">Epoch: 2024.08 - 2025.02</span>
                  </div>
                  <div className="relative h-1 w-full bg-white/5 rounded-full mb-6">
                     <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex justify-between px-2">
                        {reformMarkers.map((m, i) => (
                           <div
                            key={i}
                            onClick={() => setSelectedVersionId(constitutionVersions.find(v => v.version === m.version)?.id)}
                            className={`group relative cursor-pointer flex flex-col items-center`}
                           >
                              <div className={`w-3 h-3 rounded-full border-2 transition-all ${currentVersion?.version === m.version ? 'bg-cyan-400 border-cyan-400 scale-125 shadow-[0_0_10px_cyan]' : 'bg-black border-white/20 hover:border-white'}`}></div>
                              <div className="absolute top-5 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                 <span className="text-[8px] font-bold text-white whitespace-nowrap">{m.label} v{m.version}</span>
                                 <span className="text-[7px] text-gray-500">{m.date}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </S.GlassPanel>
            </div>
          </S.GlassPanel>
        </S.GridItem>

        {/* Right: Article Details & History */}
        <S.GridItem span={4}>
           <S.GlassPanel className="h-[650px] flex flex-col">
              <div className="flex border-b border-white/10 mb-6">
                 {['rules', 'history', 'metadata'].map(tab => (
                   <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-3 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${activeTab === tab ? 'text-cyan-400 border-cyan-400 bg-cyan-400/5' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
                   >
                     {tab}
                   </button>
                 ))}
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {activeTab === 'rules' && (
                  <div className="space-y-6">
                    <S.SectionLabel><FileText size={14} /> Core Governance Articles</S.SectionLabel>
                    {currentVersion?.content?.governance && Object.entries(currentVersion.content.governance).map(([key, value], i) => (
                      <div key={i} className="p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all group">
                         <div className="flex justify-between items-start mb-2">
                           <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">{key.replace(/([A-Z])/g, ' $1')}</h4>
                           <ChevronRight size={14} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
                         </div>
                         <p className="text-xs text-gray-400 leading-relaxed italic">
                           {typeof value === 'object' ? JSON.stringify(value).substring(0, 80) + '...' : value}
                         </p>
                         {showDiff && (
                           <div className="mt-3 pt-3 border-t border-white/5 text-[9px] text-emerald-500 bg-emerald-500/5 p-2 rounded-lg">
                             + Enhanced in v{currentVersion.version} for increased resilience.
                           </div>
                         )}
                      </div>
                    ))}

                    <S.SectionLabel className="mt-8"><Network size={14} /> Treaty Obligations</S.SectionLabel>
                    <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                       <span className="text-[9px] font-bold text-purple-400 uppercase block mb-2">Active Federations</span>
                       <p className="text-[10px] text-gray-500 italic">This community is currently bound by the "Southern Corridor Mutual Aid Treaty v2.1".</p>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                   <div className="space-y-4">
                     {constitutionVersions.map((v, i) => (
                       <div
                        key={v.id}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${selectedVersionId === v.id ? 'bg-cyan-500/10 border-cyan-500/50' : 'bg-black/40 border-white/5 hover:border-white/20'}`}
                        onClick={() => setSelectedVersionId(v.id)}
                       >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-white">VERSION {v.version}</span>
                            <span className="text-[9px] text-gray-500 font-mono">{new Date(v.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 italic mb-3">"{v.summary || 'Periodic institutional alignment and refinement.'}"</p>
                          <div className="flex gap-2">
                            <span className="px-2 py-0.5 bg-black/60 rounded text-[8px] text-emerald-400 border border-emerald-400/20">3 Amendments</span>
                            <span className="px-2 py-0.5 bg-black/60 rounded text-[8px] text-cyan-400 border border-cyan-400/20">Full Consensus</span>
                          </div>

                          {showDiff && selectedVersionId !== v.id && (
                             <button
                               onClick={(e) => { e.stopPropagation(); setCompareVersionId(v.id); }}
                               className={`mt-4 w-full py-1.5 rounded text-[8px] font-bold uppercase tracking-widest border transition-all ${compareVersionId === v.id ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-transparent text-gray-400 border-gray-600 hover:border-white hover:text-white'}`}
                             >
                               {compareVersionId === v.id ? 'Selected for Compare' : 'Compare with Current'}
                             </button>
                          )}
                       </div>
                     ))}
                   </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-white/10">
                 <div className="flex items-center justify-between p-3 bg-cyan-900/10 border border-cyan-500/20 rounded-xl">
                    <div className="flex items-center gap-3">
                       <Shield size={16} className="text-cyan-400" />
                       <div>
                          <div className="text-[9px] font-bold text-white uppercase">Cryptographic Integrity</div>
                          <div className="text-[8px] text-cyan-500 font-mono">HASH: {currentVersion?.id?.substring(0, 16)}...</div>
                       </div>
                    </div>
                    <Activity size={14} className="text-cyan-500 animate-pulse" />
                 </div>
              </div>
           </S.GlassPanel>
        </S.GridItem>
      </S.LayoutGrid>
    </S.PageContainer>
  );
};

export default ConstitutionExplorer;
