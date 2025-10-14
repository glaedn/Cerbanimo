import React from 'react';

const Rituals = ({ realmId }) => {
  return (
    <div className="rituals-container">
      <h3>Rituals</h3>
      <p>Realm ID: {realmId}</p>
      <div className="coming-soon">
        <p>Co-creation rituals and ceremonies will be available here.</p>
      </div>
    </div>
  );
};

export default Rituals;