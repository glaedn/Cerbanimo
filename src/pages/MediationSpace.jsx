import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { useAuth0 } from '@auth0/auth0-react';
import { Heart, Scale, MessageSquare, ShieldAlert, CheckCircle, Plus, ChevronRight } from 'lucide-react';
import * as S from '../components/Governance/GovernanceStyles';

const MediationSpace = () => {
  const { communityId } = useParams();
  const { mediationCases, fetchMediationCases, loading } = useGovernanceStore();
  const { getAccessTokenSilently } = useAuth0();
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    const loadCases = async () => {
      try {
        const token = await getAccessTokenSilently();
        fetchMediationCases(communityId, token);
      } catch (err) {
        console.error("Auth failed:", err);
        fetchMediationCases(communityId);
      }
    };
    loadCases();
  }, [communityId, fetchMediationCases, getAccessTokenSilently]);

  const filteredCases = mediationCases.filter(c => {
    if (activeTab === 'active') return c.status === 'In Mediation' || c.status === 'Pending Review';
    if (activeTab === 'resolved') return c.status === 'Resolved';
    if (activeTab === 'appeals') return c.status === 'In Appeal';
    return true;
  });

  return (
    <S.PageContainer>
      <S.Header>
        <S.TitleBlock>
          <S.Title>
            <Heart size={32} /> Mediation Space
          </S.Title>
          <S.Subtitle>Conflict Repair & Restorative Justice Infrastructure | Community: {communityId}</S.Subtitle>
        </S.TitleBlock>
        <S.NeonButton>
          <Plus size={16} /> Initiate Resolution Path
        </S.NeonButton>
      </S.Header>

      <S.LayoutGrid>
        {/* Navigation / Filter */}
        <S.GridItem span={3}>
           <div className="space-y-4">
              {['active', 'resolved', 'appeals'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-6 py-4 rounded-2xl border font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-white/5 bg-white/[0.02] text-gray-500 hover:border-white/10 hover:bg-white/[0.04]'}`}
                >
                  {tab} Cases
                </button>
              ))}

              <S.GlassPanel className="mt-8 p-6">
                 <S.SectionLabel>
                   <Scale size={14} /> Mediation Principles
                 </S.SectionLabel>
                 <ul className="space-y-4 mt-6">
                    {[
                      { label: 'Restorative Over Punitive', color: 'text-cyan-400' },
                      { label: 'Transparent Reasoning', color: 'text-purple-400' },
                      { label: 'Voluntary Participation', color: 'text-emerald-400' },
                      { label: 'Legitimate Outcomes', color: 'text-pink-400' }
                    ].map((p, i) => (
                      <li key={i} className="flex items-center gap-3">
                         <div className={`w-1 h-1 rounded-full bg-current ${p.color}`}></div>
                         <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">{p.label}</span>
                      </li>
                    ))}
                 </ul>
              </S.GlassPanel>
           </div>
        </S.GridItem>

        {/* Case Feed */}
        <S.GridItem span={6}>
           <div className="space-y-6">
              {filteredCases.map(c => (
                <S.GlassPanel key={c.id} className="p-8 hover:border-cyan-500/30 transition-all duration-500 cursor-pointer group">
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                         <div className="p-3 bg-black/60 rounded-xl border border-white/5 group-hover:border-cyan-500/50 transition-colors">
                           <ShieldAlert size={20} className="text-cyan-400" />
                         </div>
                         <div>
                            <h3 className="text-lg font-bold group-hover:text-cyan-400 transition uppercase tracking-tight">{c.title}</h3>
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{c.type} dispute • {c.parties || 0} parties</span>
                         </div>
                      </div>
                      <span className={`text-[8px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border ${c.status === 'In Mediation' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-purple-500/10 border-purple-500 text-purple-400'}`}>
                         {c.status}
                      </span>
                   </div>

                   <p className="text-xs text-gray-400 leading-relaxed mb-8 italic">
                     "{c.summary || 'Restorative dialogue in progress.'}"
                   </p>

                   <div className="flex gap-4">
                      <S.NeonButton variant="outline" className="flex-1 py-3 text-[9px]">
                         <MessageSquare size={12} /> View Dialogue
                      </S.NeonButton>
                      <S.NeonButton className="flex-1 py-3 text-[9px]">
                         Join Mediation
                      </S.NeonButton>
                   </div>
                </S.GlassPanel>
              ))}

              {!loading && filteredCases.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-center p-12 border border-dashed border-white/10 rounded-3xl opacity-30">
                  <Heart size={48} className="mb-4" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em]">No Active Conflicts Detected</p>
                </div>
              )}
              {loading && (
                <div className="h-64 flex items-center justify-center">
                   <Activity className="animate-pulse text-cyan-400" size={32} />
                </div>
              )}
           </div>
        </S.GridItem>

        {/* Accountability & Stats */}
        <S.GridItem span={3}>
           <S.GlassPanel className="mb-8">
              <S.SectionLabel>Resolution Health</S.SectionLabel>
              <div className="space-y-8 mt-6">
                 <S.MetricItem>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500">Repair Success Rate</span>
                       <span className="text-cyan-400">82%</span>
                    </div>
                    <S.ProgressBar>
                       <S.ProgressFill percent={82} />
                    </S.ProgressBar>
                 </S.MetricItem>

                 <S.MetricItem>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500">Average Duration</span>
                       <span className="text-purple-400">4.2 Days</span>
                    </div>
                    <S.ProgressBar>
                       <S.ProgressFill percent={45} style={{ backgroundColor: '#c084fc' }} />
                    </S.ProgressBar>
                 </S.MetricItem>
              </div>

              <div className="mt-10 p-5 bg-black/40 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="text-emerald-400" size={16} />
                    <h4 className="text-[9px] font-bold uppercase text-white tracking-widest">Integrity Record</h4>
                 </div>
                 <p className="text-[9px] text-gray-500 leading-relaxed italic">
                   All mediation outcomes are cryptographically anchored to the institutional ledger to ensure long-term accountability.
                 </p>
              </div>
           </S.GlassPanel>

           <S.GlassPanel className="bg-cyan-900/10 border-cyan-500/20">
              <S.SectionLabel className="text-cyan-400">Active Mediators</S.SectionLabel>
              <div className="space-y-4 mt-6">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="flex items-center justify-between group cursor-pointer">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-[10px] font-bold text-gray-500 group-hover:border-cyan-500 transition-colors">M{i}</div>
                         <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Mediator #{124 + i}</span>
                      </div>
                      <ChevronRight size={14} className="text-gray-600" />
                   </div>
                 ))}
              </div>
           </S.GlassPanel>
        </S.GridItem>
      </S.LayoutGrid>
    </S.PageContainer>
  );
};

export default MediationSpace;
