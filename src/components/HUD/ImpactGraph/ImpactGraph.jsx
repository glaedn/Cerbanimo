import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import './ImpactGraph.css';

const ImpactGraph = ({ projectId, realmId, width, height }) => {
  const [data, setData] = useState({ nodes: [], links: [] });
  const graphRef = useRef();

  useEffect(() => {
    const fetchData = async () => {
      let url = '/impact/atlas';
      const params = new URLSearchParams();
      if (projectId) params.append('projectId', projectId);
      if (realmId) params.append('realmId', realmId);

      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}${url}?${params.toString()}`);
      const json = await res.json();
      setData(json);
    };

    fetchData();
  }, [projectId, realmId]);

  const getNodeColor = (type) => {
    switch (type) {
      case 'outcome': return '#ff00ff'; // Magenta
      case 'project': return '#00ffff'; // Cyan
      case 'task': return '#ffffff';    // White
      default: return '#777';
    }
  };

  return (
    <div className="impact-graph-container" style={{ width: width || '100%', height: height || '400px' }}>
      {data && data.nodes && data.nodes.length > 0 ? (
        <ForceGraph2D
          ref={graphRef}
          graphData={data}
          nodeColor={n => getNodeColor(n.type)}
          nodeLabel={n => `${n.type.toUpperCase()}: ${n.label}`}
          linkColor={() => 'rgba(0, 255, 255, 0.2)'}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={6}
          width={width}
          height={height}
        />
      ) : (
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
           No impact graph data available
        </div>
      )}
    </div>
  );
};

export default ImpactGraph;
