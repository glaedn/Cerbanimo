import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { useAppStore } from '../store/useAppStore';
import { useAuth0 } from '@auth0/auth0-react';
import ProposalCard from '../components/Governance/ProposalCard';
import DeliberationSpace from '../components/Governance/DeliberationSpace';
import { Plus, Info, Layout, Activity, Shield, Users, Users2, Target, BarChart3, X } from 'lucide-react';
import * as S from '../components/Governance/GovernanceStyles';

const GovernanceChamber = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { proposals, activeConstitution, treaties, loading, error, fetchCommunityGovernance, fetchFederationAtlas, castVote, createProposal } = useGovernanceStore();
  const { presence } = useAppStore();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedProposalId, setSelectedProposalId] = useState(null);

  const localPresence = useMemo(() => {
    return presence[`community:${communityId}`] || [];
  }, [presence, communityId]);

  const chamberMetrics = useMemo(() => {
    if (!proposals.length) return { consensus: 0, participation: 0, density: 0 };
    const totalVotes = proposals.reduce((acc, p) => acc + (p.votes?.length || 0), 0);
    const activeProposals = proposals.filter(p => p.status === 'deliberation' || p.status === 'voting').length;

    // Compute consensus as average of support across proposals
    const supportRatios = proposals
      .map(p => {
        if (!p.votes || p.votes.length === 0) return 0.5; // Neutral starting point
        const support = p.votes.filter(v => v.vote === true || v.vote?.value === true).length;
        return support / p.votes.length;
      });
    const avgConsensus = supportRatios.reduce((a, b) => a + b, 0) / supportRatios.length;

    return {
      consensus: avgConsensus * 100,
      participation: Math.min(100, (totalVotes / 50) * 100),
      density: activeProposals > 0 ? 82 : 12
    };
  }, [proposals]);

  const [showModal, setShowModal] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    type: 'governance',
    payload: {
      intent: '',
      impact: 'Moderate',
      risk: 'Low'
    }
  });

  const refreshData = async () => {
    try {
      const token = await getAccessTokenSilently();
      fetchCommunityGovernance(communityId, token);
    } catch (err) {
      console.error("Auth failed:", err);
      fetchCommunityGovernance(communityId);
    }
  };

  useEffect(() => {
    refreshData();
    const loadFederation = async () => {
      try {
        const token = await getAccessTokenSilently();
        fetchFederationAtlas(token);
      } catch (err) {
        fetchFederationAtlas();
      }
    };
    loadFederation();
  }, [communityId, fetchCommunityGovernance, fetchFederationAtlas, getAccessTokenSilently]);

  useEffect(() => {
    if (proposals.length > 0 && !selectedProposalId) {
      setSelectedProposalId(proposals[0].id);
    }
  }, [proposals, selectedProposalId]);

  const getAffectedSystems = (type) => {
    switch (type) {
      case 'resource':
        return ['• Resource Ledger', '• Matching API', '• Logistics Hub', '• Supply Chain'];
      case 'governance':
        return ['• Trust Topology', '• Member Weights', '• Delegation Graph', '• Voting Quorum'];
      case 'constitution':
        return ['• Protocol Rules', '• Core Identity', '• Rights Ledger', '• Institutional Memory'];
      case 'operational':
        return ['• Task Routing API', '• Mission Control', '• Dispatch Engine', '• Field Telemetry'];
      default:
        return ['• General Ledger', '• User Metadata', '• Cache Layers', '• Event Bus'];
    }
  };

  const selectedProposal = proposals.find(p => p.id === selectedProposalId);

  const handleVote = async (proposalId, voteValue) => {
    try {
      const token = await getAccessTokenSilently();
      await castVote(proposalId, voteValue, token);
      refreshData();
    } catch (err) {
      alert('Error casting vote: ' + err.message);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    try {
      const token = await getAccessTokenSilently();
      await createProposal(communityId, newProposal, token);
      setShowModal(false);
    } catch (err) {
      alert('Error creating proposal: ' + err.message);
    }
  };

  if (loading && proposals.length === 0) return (
    <S.PageContainer className="flex flex-col items-center justify-center">
       <Activity className="animate-pulse text-cyan" size={48} />
       <S.Subtitle className="mt-4">INITIALIZING CIVIC NEURAL LINK...</S.Subtitle>
    </S.PageContainer>
  );

  return (
    <S.PageContainer>
      <S.Header>
        <S.TitleBlock>
          <S.Title>
            <Shield size={32} /> Governance Chamber
          </S.Title>
          <S.Subtitle>Community ID: {communityId} | Active Constitutional Layer: v{activeConstitution?.version || 1}</S.Subtitle>
        </S.TitleBlock>

        <div className="flex items-center gap-6">
          <div className="flex items-center">
             {localPresence.slice(0, 3).map((uid, i) => (
               <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-cyan-900 flex items-center justify-center text-[10px] font-bold text-cyan-400 -ml-3 first:ml-0 shadow-lg">
                  {uid.toString().substring(0,1).toUpperCase()}
               </div>
             ))}
             {localPresence.length > 3 && (
               <div className="w-8 h-8 rounded-full border-2 border-black bg-[#1c1c1e] flex items-center justify-center text-[8px] font-bold text-gray-500 -ml-3">
                 +{localPresence.length - 3}
               </div>
             )}
          </div>
          {localPresence.length > 0 && (
            <S.Subtitle className="animate-pulse text-cyan">
              {localPresence.length} Active Deliberators
            </S.Subtitle>
          )}

          <S.NeonButton onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Proposal
          </S.NeonButton>
        </div>
      </S.Header>

      <S.LayoutGrid>
        {/* Left Sidebar: Proposal Stream */}
        <S.GridItem span={4}>
          <S.GlassPanel>
            <S.SectionLabel>
              <Activity size={14} /> Live Proposal Stream
            </S.SectionLabel>

            <div className="flex flex-col gap-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
              {proposals.length === 0 ? (
                <div className="text-center p-8 text-gray-600 italic border border-dashed border-white/10 rounded-xl">
                   No civic activity detected.
                </div>
              ) : (
                proposals.map(proposal => (
                  <div
                    key={proposal.id}
                    onClick={() => setSelectedProposalId(proposal.id)}
                    className={`cursor-pointer transition-all ${selectedProposalId === proposal.id ? 'ring-2 ring-cyan-500/50 rounded-2xl' : ''}`}
                  >
                    <ProposalCard proposal={proposal} onVote={handleVote} />
                  </div>
                ))
              )}
            </div>
          </S.GlassPanel>
        </S.GridItem>

        {/* Center: Deliberation & Details */}
        <S.GridItem span={5} className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2">
           {selectedProposalId ? (
             <div className="flex flex-col gap-8">
               <S.GlassPanel>
                  <DeliberationSpace proposalId={selectedProposalId} />
               </S.GlassPanel>

               <S.GlassPanel>
                  <S.SectionLabel>
                    <Info size={14} /> Operational Context
                  </S.SectionLabel>
                  <p className="text-sm text-gray-400 leading-relaxed mb-6">
                    This proposal targets the <strong className="text-white uppercase font-mono tracking-wider">{proposals.find(p => p.id === selectedProposalId)?.proposal_type}</strong> domain.
                    Execution will result in automated adjustments to the community's coordination layer.
                  </p>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                     <S.Subtitle className="mb-3 text-[10px] text-gray-500">Affected Systems</S.Subtitle>
                     <ul className="grid grid-cols-2 gap-2 text-[10px] text-cyan-400 font-mono uppercase">
                        {getAffectedSystems(selectedProposal?.proposal_type).map((sys, idx) => (
                           <li key={idx}>{sys}</li>
                        ))}
                     </ul>
                  </div>
               </S.GlassPanel>
             </div>
           ) : (
             <S.GlassPanel className="flex items-center justify-center text-gray-600 italic text-sm">
                Select a proposal from the stream to begin civic deliberation.
             </S.GlassPanel>
           )}
        </S.GridItem>

        {/* Right Sidebar: Governance Meta */}
        <S.GridItem span={3} className="max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2">
           <S.GlassPanel className="mb-8">
              <S.SectionLabel>
                <Layout size={14} /> Civic Schema
              </S.SectionLabel>

              <div className="flex flex-col gap-4 mb-8">
                 {[
                   { label: 'Voting Model', value: activeConstitution?.content?.governance?.votingModel || 'Direct' },
                   { label: 'Quorum', value: activeConstitution?.content?.governance?.quorum ? `${activeConstitution.content.governance.quorum}%` : 'N/A' },
                   { label: 'Authority', value: 'Distributed' },
                   { label: 'Federation', value: `Active Treaties (${treaties.filter(t => t.community_a === communityId || t.community_b === communityId).length})` }
                 ].map((item, i) => (
                   <S.DataRow key={i}>
                     <S.DataLabel>{item.label}</S.DataLabel>
                     <S.DataValue>{item.value}</S.DataValue>
                   </S.DataRow>
                 ))}
              </div>

              <div className="space-y-6">
                 <S.Subtitle className="text-[10px] mb-2">Institutional Health</S.Subtitle>

                 <S.MetricItem>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500 flex items-center gap-1"><Users2 size={10} /> Participation</span>
                       <span className="text-cyan-400">{chamberMetrics.participation.toFixed(0)}%</span>
                    </div>
                    <S.ProgressBar>
                       <S.ProgressFill percent={chamberMetrics.participation} />
                    </S.ProgressBar>
                 </S.MetricItem>

                 <S.MetricItem>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500 flex items-center gap-1"><Target size={10} /> Consensus</span>
                       <span className="text-cyan-400">{chamberMetrics.consensus.toFixed(0)}%</span>
                    </div>
                    <S.ProgressBar>
                       <S.ProgressFill percent={chamberMetrics.consensus} />
                    </S.ProgressBar>
                 </S.MetricItem>

                 <S.MetricItem>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500 flex items-center gap-1"><BarChart3 size={10} /> Density</span>
                       <span className="text-cyan-400">{chamberMetrics.density}%</span>
                    </div>
                    <S.ProgressBar>
                       <S.ProgressFill percent={chamberMetrics.density} />
                    </S.ProgressBar>
                 </S.MetricItem>
              </div>

              <S.NeonButton variant="outline" className="w-full mt-8" onClick={() => navigate(`/governance/${communityId}/delegation`)}>
                 <Users size={14} /> EXPLORE DELEGATION
              </S.NeonButton>
           </S.GlassPanel>

           <S.GlassPanel>
              <S.SectionLabel>
                <Shield size={14} /> Constitutional Status
              </S.SectionLabel>
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 mb-6">
                 <p className="text-[10px] text-gray-500 italic leading-relaxed">
                   "{activeConstitution?.content?.identity?.purpose || 'Establishing a resilient framework for mutual aid and resource autonomy.'}"
                 </p>
              </div>
              <S.NeonButton variant="outline" className="w-full text-[9px]" onClick={() => navigate(`/governance/${communityId}/constitution`)}>
                View Living Constitution
              </S.NeonButton>
           </S.GlassPanel>
        </S.GridItem>
      </S.LayoutGrid>

      {showModal && (
        <S.ModalOverlay>
          <S.ModalContent>
            <div className="flex justify-between items-start mb-8">
               <div>
                 <S.Title style={{ fontSize: '1.5rem' }}>New Civic Proposal</S.Title>
                 <S.Subtitle>Initializing institutional evolution</S.Subtitle>
               </div>
               <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition"><X size={24} /></button>
            </div>

            <form onSubmit={handleCreateProposal}>
              <S.FormField>
                <S.Label>Proposal Title</S.Label>
                <S.Input
                  type="text"
                  required
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  placeholder="e.g., Establishing Regional Resource Reserve"
                />
              </S.FormField>
              <div className="grid grid-cols-2 gap-4">
                <S.FormField>
                  <S.Label>Primary Domain</S.Label>
                  <S.Select
                    value={newProposal.type}
                    onChange={(e) => setNewProposal({...newProposal, type: e.target.value})}
                  >
                    <option value="governance">Governance Policy</option>
                    <option value="operational">Operational Change</option>
                    <option value="resource">Resource Allocation</option>
                    <option value="constitution">Constitutional Amendment</option>
                  </S.Select>
                </S.FormField>
                <S.FormField>
                   <S.Label>Impact Level</S.Label>
                   <S.Select
                    value={newProposal.payload.impact}
                    onChange={(e) => setNewProposal({...newProposal, payload: {...newProposal.payload, impact: e.target.value}})}
                  >
                    <option value="Low">Low (Administrative)</option>
                    <option value="Moderate">Moderate (Systemic)</option>
                    <option value="High">High (Constitutional)</option>
                  </S.Select>
                </S.FormField>
              </div>
              <S.FormField>
                <S.Label>Stated Intent</S.Label>
                <S.Input
                  type="text"
                  required
                  value={newProposal.payload.intent}
                  onChange={(e) => setNewProposal({...newProposal, payload: {...newProposal.payload, intent: e.target.value}})}
                  placeholder="Why are you proposing this?"
                />
              </S.FormField>
              <S.FormField>
                <S.Label>Detailed Description</S.Label>
                <S.TextArea
                  rows="4"
                  required
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                  placeholder="Provide full context, data points, and expected outcomes..."
                />
              </S.FormField>
              <div className="flex gap-4 mt-8 pt-4">
                <S.NeonButton type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">Discard</S.NeonButton>
                <S.NeonButton type="submit" className="flex-1">Ratify Proposal</S.NeonButton>
              </div>
            </form>
          </S.ModalContent>
        </S.ModalOverlay>
      )}
    </S.PageContainer>
  );
};

export default GovernanceChamber;
