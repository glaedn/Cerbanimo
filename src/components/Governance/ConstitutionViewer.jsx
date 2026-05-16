import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ConstitutionViewer = ({ communityId }) => {
  const [constitution, setConstitution] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConstitution = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/governance/community/${communityId}/constitution`);
        setConstitution(res.data);
      } catch (err) {
        console.error('Error fetching constitution:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchConstitution();
  }, [communityId]);

  if (loading) return <div className="text-gray-500 italic">Accessing civic DNA...</div>;
  if (!constitution) return <div className="p-4 bg-gray-900 border border-dashed border-gray-700 text-gray-500 rounded">No formal constitution has been ratified for this community.</div>;

  return (
    <div className="constitution-viewer bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-900 px-4 py-2 border-b border-gray-800 flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase">Living Constitution v{constitution.version}</h3>
        <span className="text-[10px] text-gray-600">RATIFIED: {new Date(constitution.created_at).toLocaleDateString()}</span>
      </div>
      <div className="p-6 prose prose-invert max-w-none">
        {constitution.content.identity && (
          <section className="mb-6">
            <h4 className="text-cyan-400 font-bold mb-2">I. IDENTITY & PURPOSE</h4>
            <p className="text-gray-300 text-sm leading-relaxed">{constitution.content.identity.purpose}</p>
          </section>
        )}

        {constitution.content.governance && (
          <section className="mb-6">
            <h4 className="text-cyan-400 font-bold mb-2">II. GOVERNANCE PRINCIPLES</h4>
            <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
              {constitution.content.governance.principles?.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </section>
        )}

        {constitution.content.emergency && (
          <section>
            <h4 className="text-red-400 font-bold mb-2">III. EMERGENCY PROTOCOLS</h4>
            <p className="text-gray-300 text-sm italic">{constitution.content.emergency.summary}</p>
          </section>
        )}
      </div>
    </div>
  );
};

export default ConstitutionViewer;
