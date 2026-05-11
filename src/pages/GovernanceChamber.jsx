import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { useAppStore } from '../store/useAppStore';
import ProposalCard from '../components/Governance/ProposalCard';
import DeliberationSpace from '../components/Governance/DeliberationSpace';
import { Plus, Info, Layout, Activity, Shield, Users, Users2, Target, BarChart3 } from 'lucide-react';

const GovernanceChamber = () => {
  const { communityId } = useParams();
  const { proposals, activeConstitution, loading, error, fetchCommunityGovernance } = useGovernanceStore();
  const { presence } = useAppStore();
  const [selectedProposalId, setSelectedProposalId] = useState(null);

  const localPresence = useMemo(() => {
    return presence[`community:${communityId}`] || [];
  }, [presence, communityId]);

  const chamberMetrics = useMemo(() => {
    if (!proposals.length) return { consensus: 0, participation: 0, density: 0 };
    // Derived metrics for institutional health
    const totalVotes = proposals.reduce((acc, p) => acc + (p.votes?.length || 0), 0);
    const activeProposals = proposals.filter(p => p.status === 'deliberation' || p.status === 'voting').length;

    return {
      consensus: 65 + (Math.random() * 15), // Mocked for now
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

  useEffect(() => {
    fetchCommunityGovernance(communityId);
  }, [communityId, fetchCommunityGovernance]);

  useEffect(() => {
    if (proposals.length > 0 && !selectedProposalId) {
      setSelectedProposalId(proposals[0].id);
    }
  }, [proposals, selectedProposalId]);

  const handleVote = async (proposalId, voteValue) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/governance/proposals/${proposalId}/vote`, { voteValue });
      fetchCommunityGovernance(communityId); // Refresh
    } catch (err) {
      alert('Error casting vote: ' + err.message);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/proposals`, newProposal);
      setShowModal(false);
      fetchCommunityGovernance(communityId);
    } catch (err) {
      alert('Error creating proposal: ' + err.message);
    }
  };

  if (loading && proposals.length === 0) return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-cyan-400 font-mono">
       <Activity className="animate-spin mb-4" />
       INITIALIZING CIVIC NEURAL LINK...
    </div>
  );

  return (
    <div className="governance-chamber min-h-screen bg-black p-6">
      <header className="mb-8 flex justify-between items-end border-b border-gray-800 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="text-cyan-400" size={24} />
            <h1 className="text-3xl font-bold text-white tracking-tight">Governance Chamber</h1>
          </div>
          <p className="text-gray-500 font-medium">Community ID: {communityId} | Active Constitutional Layer: v{activeConstitution?.version || 1}</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Live Presence in Chamber */}
          <div className="flex items-center -space-x-3">
             {localPresence.slice(0, 3).map((uid, i) => (
               <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-cyan-950 flex items-center justify-center text-[10px] font-bold text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.2)]">
                  {uid.toString().substring(0,1)}
               </div>
             ))}
             {localPresence.length > 3 && (
               <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-900 flex items-center justify-center text-[8px] font-bold text-gray-500">
                 +{localPresence.length - 3}
               </div>
             )}
             {localPresence.length > 0 && (
               <span className="ml-4 text-[9px] font-bold text-cyan-500 uppercase tracking-widest animate-pulse">
                 {localPresence.length} Active Deliberators
               </span>
             )}
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold transition shadow-[0_0_20px_rgba(8,145,178,0.4)] uppercase text-xs tracking-widest"
          >
            <Plus size={16} /> New Proposal
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Sidebar: Proposal Stream */}
        <div className="xl:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} className="text-cyan-400" /> Live Proposal Stream
            </h2>
            <div className="flex gap-2">
               <button className="text-[10px] bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-500 hover:text-white transition">ALL</button>
               <button className="text-[10px] bg-gray-900 border border-gray-800 px-2 py-1 rounded text-gray-500 hover:text-white transition">ACTIVE</button>
            </div>
          </div>

          <div className="proposal-stream max-h-[calc(100vh-250px)] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {proposals.length === 0 ? (
              <div className="p-8 text-center bg-gray-900/30 border border-dashed border-gray-800 rounded-xl">
                 <p className="text-gray-600 italic">No civic activity detected.</p>
              </div>
            ) : (
              proposals.map(proposal => (
                <div
                  key={proposal.id}
                  onClick={() => setSelectedProposalId(proposal.id)}
                  className={`cursor-pointer transition-all ${selectedProposalId === proposal.id ? 'ring-2 ring-cyan-500 ring-offset-4 ring-offset-black rounded-xl' : ''}`}
                >
                  <ProposalCard proposal={proposal} onVote={handleVote} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center/Main: Deliberation & Details */}
        <div className="xl:col-span-5 space-y-8">
           {selectedProposalId ? (
             <>
               <DeliberationSpace proposalId={selectedProposalId} />

               <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Info size={14} className="text-cyan-400" /> Operational Context
                  </h3>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-gray-400 leading-relaxed">
                      This proposal targets the <strong>{proposals.find(p => p.id === selectedProposalId)?.proposal_type}</strong> domain.
                      Execution will result in automated adjustments to the community's coordination layer.
                    </p>
                    <div className="mt-4 p-4 bg-black/40 rounded border border-white/5">
                       <h4 className="text-[10px] text-gray-500 font-bold uppercase mb-2">Affected Systems</h4>
                       <ul className="grid grid-cols-2 gap-2 text-[10px] text-cyan-500 font-mono uppercase">
                          <li>• Resource Ledger</li>
                          <li>• Task Routing API</li>
                          <li>• Trust Topology</li>
                          <li>• Member Weights</li>
                       </ul>
                    </div>
                  </div>
               </div>
             </>
           ) : (
             <div className="h-full flex items-center justify-center text-gray-600 italic">
                Select a proposal to begin civic deliberation.
             </div>
           )}
        </div>

        {/* Right Sidebar: Governance Meta & Summary */}
        <div className="xl:col-span-3 space-y-6">
           <div className="bg-gray-900/80 border border-cyan-500/20 p-6 rounded-xl backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5)]">
              <h2 className="text-xs font-bold text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <Layout size={14} className="text-cyan-400" /> Civic Schema
              </h2>

              <div className="space-y-4">
                 {[
                   { label: 'Voting Model', value: activeConstitution?.content?.governance?.votingModel || 'Direct' },
                   { label: 'Quorum', value: '15%' },
                   { label: 'Authority', value: 'Distributed' },
                   { label: 'Federation', value: 'Active Treaties (3)' }
                 ].map((item, i) => (
                   <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2">
                     <span className="text-[10px] text-gray-500 font-bold uppercase">{item.label}</span>
                     <span className="text-xs text-cyan-400 font-mono uppercase">{item.value}</span>
                   </div>
                 ))}
              </div>

              <div className="mt-8 space-y-6">
                 <h3 className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mb-4">Institutional Health</h3>

                 <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500 flex items-center gap-1"><Users2 size={10} /> Participation Breadth</span>
                       <span className="text-cyan-400">{chamberMetrics.participation.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                       <div className="h-full bg-cyan-500" style={{ width: `${chamberMetrics.participation}%` }}></div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500 flex items-center gap-1"><Target size={10} /> Consensus Alignment</span>
                       <span className="text-cyan-400">{chamberMetrics.consensus.toFixed(0)}%</span>
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                       <div className="h-full bg-cyan-500" style={{ width: `${chamberMetrics.consensus}%` }}></div>
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500 flex items-center gap-1"><BarChart3 size={10} /> Argument Density</span>
                       <span className="text-cyan-400">{chamberMetrics.density}%</span>
                    </div>
                    <div className="h-1 w-full bg-gray-800 rounded-full overflow-hidden">
                       <div className="h-full bg-cyan-500" style={{ width: `${chamberMetrics.density}%` }}></div>
                    </div>
                 </div>
              </div>

              <button className="w-full mt-8 py-3 border border-cyan-500/30 text-cyan-400 rounded-lg text-[10px] font-bold uppercase hover:bg-cyan-500/10 transition flex items-center justify-center gap-2">
                 <Users size={14} /> EXPLORE DELEGATION GRAPH
              </button>
           </div>

           <div className="bg-gray-900/40 border border-gray-800 p-6 rounded-xl">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Shield size={14} className="text-cyan-400" /> Constitutional Status
              </h2>
              <div className="p-3 bg-black/40 rounded border border-white/5 mb-4">
                 <p className="text-[10px] text-gray-500 italic leading-relaxed">
                   "{activeConstitution?.content?.identity?.purpose || 'Establishing a resilient framework for mutual aid and resource autonomy.'}"
                 </p>
              </div>
              <button className="text-[10px] text-cyan-600 hover:text-cyan-400 font-bold uppercase transition">
                View Full Living Constitution →
              </button>
           </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-950 border border-gray-800 p-8 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.8)] border-t-cyan-500/50">
            <div className="flex justify-between items-start mb-6">
               <div>
                 <h2 className="text-2xl font-bold text-white uppercase tracking-tight">New Civic Proposal</h2>
                 <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">Initializing institutional evolution</p>
               </div>
               <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white transition">&times;</button>
            </div>

            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Proposal Title</label>
                <input
                  type="text"
                  required
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none transition text-sm"
                  placeholder="e.g., Establishing Regional Resource Reserve"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Primary Domain</label>
                  <select
                    value={newProposal.type}
                    onChange={(e) => setNewProposal({...newProposal, type: e.target.value})}
                    className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none transition text-sm appearance-none"
                  >
                    <option value="governance">Governance Policy</option>
                    <option value="operational">Operational Change</option>
                    <option value="resource">Resource Allocation</option>
                    <option value="constitution">Constitutional Amendment</option>
                  </select>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Impact Level</label>
                   <select
                    value={newProposal.payload.impact}
                    onChange={(e) => setNewProposal({...newProposal, payload: {...newProposal.payload, impact: e.target.value}})}
                    className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none transition text-sm appearance-none"
                  >
                    <option value="Low">Low (Administrative)</option>
                    <option value="Moderate">Moderate (Systemic)</option>
                    <option value="High">High (Constitutional)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stated Intent</label>
                <input
                  type="text"
                  required
                  value={newProposal.payload.intent}
                  onChange={(e) => setNewProposal({...newProposal, payload: {...newProposal.payload, intent: e.target.value}})}
                  className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none transition text-sm"
                  placeholder="Why are you proposing this?"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Detailed Description</label>
                <textarea
                  rows="4"
                  required
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                  className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none transition text-sm"
                  placeholder="Provide full context, data points, and expected outcomes..."
                ></textarea>
              </div>
              <div className="flex gap-4 mt-8 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-xs font-bold text-gray-500 hover:text-white transition uppercase tracking-widest">Discard</button>
                <button type="submit" className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(8,145,178,0.4)] uppercase text-xs tracking-widest transition-all active:scale-95">Ratify Proposal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernanceChamber;
