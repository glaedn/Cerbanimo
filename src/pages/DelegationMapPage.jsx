import React from 'react';
import { useParams } from 'react-router-dom';
import DelegationMap from '../components/Governance/DelegationMap';
import { Shield } from 'lucide-react';

const DelegationMapPage = () => {
  const { communityId } = useParams();

  return (
    <div className="delegation-map-page min-h-screen bg-black p-8">
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-cyan-400" size={28} />
          <h1 className="text-4xl font-bold text-white tracking-tight">Expertise Routing Map</h1>
        </div>
        <p className="text-gray-500 font-medium tracking-wide uppercase text-xs">
          Institutional Trust Topology | Community {communityId}
        </p>
      </header>

      <div className="max-w-6xl mx-auto">
        <DelegationMap communityId={communityId} />
      </div>
    </div>
  );
};

export default DelegationMapPage;
