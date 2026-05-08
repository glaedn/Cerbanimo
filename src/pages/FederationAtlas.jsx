import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FederationAtlas = () => {
  const [treaties, setTreaties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAtlas = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/federation/atlas`);
        setTreaties(res.data);
      } catch (err) {
        console.error('Error fetching atlas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAtlas();
  }, []);

  if (loading) return <div>Synchronizing global treaties...</div>;

  return (
    <div className="federation-atlas p-6 min-h-screen bg-black">
      <header className="mb-12">
        <h1 className="text-4xl font-bold text-cyan-400">Federation Atlas</h1>
        <p className="text-gray-400 mt-2 text-lg">Visualizing the inter-community mutual aid network.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {treaties.map(treaty => (
          <div key={treaty.id} className="treaty-card bg-gray-900 border border-cyan-900/30 p-5 rounded-xl hover:border-cyan-500/50 transition group">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[10px] font-bold text-cyan-600 uppercase tracking-widest">{treaty.treaty_type.replace('_', ' ')}</span>
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_cyan]"></span>
            </div>

            <div className="flex items-center justify-between gap-4 mb-6">
               <div className="flex-1 text-center">
                  <div className="text-white font-bold">{treaty.community_a_name}</div>
                  <div className="text-[10px] text-gray-500">INITIATOR</div>
               </div>
               <div className="text-cyan-900 font-bold">⇄</div>
               <div className="flex-1 text-center">
                  <div className="text-white font-bold">{treaty.community_b_name}</div>
                  <div className="text-[10px] text-gray-500">PARTNER</div>
               </div>
            </div>

            <div className="bg-black/40 p-3 rounded-lg border border-gray-800">
               <h4 className="text-[10px] font-bold text-gray-500 uppercase mb-2">Treaty Terms</h4>
               <p className="text-xs text-gray-300 leading-relaxed">
                  {treaty.terms?.summary || 'Formal agreement for mutual support and resource exchange.'}
               </p>
            </div>

            <button className="w-full mt-4 py-2 text-xs font-bold text-cyan-400 opacity-0 group-hover:opacity-100 transition duration-300">
              VIEW FULL ALLIANCE
            </button>
          </div>
        ))}

        <div className="bg-gray-900/30 border border-dashed border-gray-800 p-5 rounded-xl flex flex-col items-center justify-center text-center">
            <div className="text-gray-600 mb-2">New Cooperative Signal</div>
            <button className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full text-sm font-medium transition">
              PROPOSE TREATY
            </button>
        </div>
      </div>
    </div>
  );
};

export default FederationAtlas;
