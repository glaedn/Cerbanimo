import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DelegationMap = ({ communityId }) => {
  const [delegations, setDelegations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDelegation, setNewDelegation] = useState({
    delegateId: '',
    domain: 'all'
  });

  useEffect(() => {
    const fetchDelegations = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/delegations`);
        setDelegations(res.data);
      } catch (err) {
        console.error('Error fetching delegations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDelegations();
  }, [communityId]);

  const handleDelegate = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/governance/delegate`, newDelegation);
      setShowModal(false);
      // Refresh
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/delegations`);
      setDelegations(res.data);
    } catch (err) {
      alert('Error delegating authority: ' + err.message);
    }
  };

  if (loading) return <div>Mapping trust flows...</div>;

  return (
    <div className="delegation-map bg-black/40 p-4 rounded-lg border border-gray-800 relative">
      <h3 className="text-sm font-bold text-cyan-400 mb-4 uppercase tracking-wider">Expertise Routing Map</h3>
      <div className="space-y-4">
        {delegations.length === 0 ? (
          <p className="text-gray-500 text-sm">No active delegations detected.</p>
        ) : (
          delegations.map(d => (
            <div key={d.id} className="flex items-center gap-3 text-xs bg-gray-900/50 p-2 rounded border border-gray-800">
              <div className="text-white font-medium">{d.delegator_name}</div>
              <div className="flex-1 flex items-center justify-center">
                <div className="h-px bg-cyan-900 flex-1 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-gray-900 px-2 text-[10px] text-cyan-600 uppercase font-bold">{d.domain || 'All'}</span>
                  </div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 border-t border-r border-cyan-500"></div>
                </div>
              </div>
              <div className="text-cyan-400 font-bold">{d.delegate_name}</div>
            </div>
          ))
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-800">
        <button
          onClick={() => setShowModal(true)}
          className="w-full text-[10px] text-gray-500 hover:text-cyan-400 transition uppercase tracking-widest font-bold"
        >
          + Initialize New Delegation
        </button>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-gray-900 border border-cyan-900/50 p-6 rounded-xl w-full max-w-sm shadow-[0_0_50px_rgba(0,255,255,0.1)]">
            <h3 className="text-white font-bold mb-4">Delegate Authority</h3>
            <form onSubmit={handleDelegate} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Delegate ID</label>
                <input
                  type="number"
                  required
                  value={newDelegation.delegateId}
                  onChange={(e) => setNewDelegation({...newDelegation, delegateId: e.target.value})}
                  className="w-full bg-black border border-gray-800 p-2 rounded text-white text-sm outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Domain Context</label>
                <select
                  value={newDelegation.domain}
                  onChange={(e) => setNewDelegation({...newDelegation, domain: e.target.value})}
                  className="w-full bg-black border border-gray-800 p-2 rounded text-white text-sm outline-none focus:border-cyan-500"
                >
                  <option value="all">Global Authority</option>
                  <option value="logistics">Logistics & Transport</option>
                  <option value="treasury">Treasury & Resources</option>
                  <option value="governance">Governance & Policy</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 text-xs text-gray-500 font-bold uppercase">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-cyan-600 text-white rounded text-xs font-bold uppercase hover:bg-cyan-500">Route Trust</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DelegationMap;
