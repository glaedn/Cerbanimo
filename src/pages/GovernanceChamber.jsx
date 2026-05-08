import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const GovernanceChamber = () => {
  const { communityId } = useParams();
  const [proposals, setProposals] = useState([]);
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    type: 'governance',
    payload: {}
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propRes, commRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/proposals`),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/communities/${communityId}`)
        ]);
        setProposals(propRes.data);
        setCommunity(commRes.data);
      } catch (err) {
        console.error('Error fetching governance data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [communityId]);

  const handleVote = async (proposalId, voteValue) => {
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/governance/proposals/${proposalId}/vote`, { voteValue });
      // Refresh proposals
      const propRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/proposals`);
      setProposals(propRes.data);
    } catch (err) {
      alert('Error casting vote: ' + err.message);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/proposals`, newProposal);
      setShowModal(false);
      // Refresh proposals
      const propRes = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/proposals`);
      setProposals(propRes.data);
    } catch (err) {
      alert('Error creating proposal: ' + err.message);
    }
  };

  if (loading) return <div>Loading Governance Chamber...</div>;

  return (
    <div className="governance-chamber p-6">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">Governance Chamber: {community?.name}</h1>
          <p className="text-gray-400 mt-2">Deliberate, vote, and evolve community legitimacy.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full font-bold transition shadow-[0_0_15px_rgba(8,145,178,0.3)]"
        >
          NEW PROPOSAL
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="proposals-list">
          <h2 className="text-xl font-semibold mb-4 text-white">Active Proposals</h2>
          {proposals.length === 0 ? (
            <p className="text-gray-500">No active proposals at this time.</p>
          ) : (
            proposals.map(proposal => (
              <div key={proposal.id} className="proposal-card bg-gray-900 border border-gray-800 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-medium text-white">{proposal.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    proposal.status === 'deliberation' ? 'bg-blue-900 text-blue-200' :
                    proposal.status === 'executed' ? 'bg-green-900 text-green-200' :
                    'bg-gray-800 text-gray-300'
                  }`}>
                    {proposal.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-400 mt-2 text-sm">{proposal.description}</p>

                {proposal.status === 'deliberation' && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleVote(proposal.id, true)}
                      className="px-4 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-sm transition"
                    >
                      SUPPORT
                    </button>
                    <button
                      onClick={() => handleVote(proposal.id, false)}
                      className="px-4 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-sm transition"
                    >
                      OPPOSE
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        <section className="governance-meta">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
             <h2 className="text-xl font-semibold mb-4 text-white">Community Schema</h2>
             <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Voting Model</span>
                  <span className="text-cyan-400 font-mono">{community?.governance_config?.votingModel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quorum</span>
                  <span className="text-cyan-400 font-mono">{(community?.governance_config?.quorum * 100).toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Delegation</span>
                  <span className="text-cyan-400 font-mono">{community?.governance_config?.delegationEnabled ? 'ENABLED' : 'DISABLED'}</span>
                </div>
             </div>

             <button
                onClick={() => { setNewProposal({...newProposal, type: 'constitution'}); setShowModal(true); }}
                className="w-full mt-6 py-2 border border-cyan-500/50 text-cyan-400 rounded hover:bg-cyan-500/10 transition"
              >
                PROPOSE AMENDMENT
             </button>
          </div>
        </section>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-lg shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Create New Civic Proposal</h2>
            <form onSubmit={handleCreateProposal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newProposal.title}
                  onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                  className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                <select
                  value={newProposal.type}
                  onChange={(e) => setNewProposal({...newProposal, type: e.target.value})}
                  className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none"
                >
                  <option value="governance">Governance Policy</option>
                  <option value="operational">Operational Change</option>
                  <option value="resource">Resource Allocation</option>
                  <option value="constitution">Constitutional Amendment</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                <textarea
                  rows="4"
                  required
                  value={newProposal.description}
                  onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                  className="w-full bg-black border border-gray-800 p-3 rounded text-white focus:border-cyan-500 outline-none"
                ></textarea>
              </div>
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-400 hover:text-white transition">CANCEL</button>
                <button type="submit" className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded">SUBMIT PROPOSAL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernanceChamber;
