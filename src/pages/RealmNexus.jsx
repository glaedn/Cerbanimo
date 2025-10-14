import React, { useState } from 'react';
import GovernanceTools from '../components/GovernanceTools';
import Rituals from '../components/Rituals';
import './RealmNexus.css';

const RealmNexus = ({ realm }) => {
  const [activeTab, setActiveTab] = useState('governance');

  if (!realm) {
    return <div>Loading Realm...</div>;
  }

  return (
    <div className="realm-nexus-container">
      <div className="realm-nexus-header">
        <h2>{realm.name}</h2>
        <p>Phase: {realm.phase || 'N/A'}</p>
      </div>
      <div className="realm-nexus-tabs">
        <button
          className={`tab-btn ${activeTab === 'governance' ? 'active' : ''}`}
          onClick={() => setActiveTab('governance')}
        >
          Governance
        </button>
        <button
          className={`tab-btn ${activeTab === 'rituals' ? 'active' : ''}`}
          onClick={() => setActiveTab('rituals')}
        >
          Rituals
        </button>
      </div>
      <div className="realm-nexus-content">
        {activeTab === 'governance' && <GovernanceTools realmId={realm.id} />}
        {activeTab === 'rituals' && <Rituals realmId={realm.id} />}
      </div>
    </div>
  );
};

export default RealmNexus;