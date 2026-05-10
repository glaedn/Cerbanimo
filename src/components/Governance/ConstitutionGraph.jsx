import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGovernanceStore } from '../../store/useGovernanceStore';

const ConstitutionGraph = ({ communityId }) => {
  const d3Container = useRef(null);
  const { activeConstitution } = useGovernanceStore();

  useEffect(() => {
    if (d3Container.current && activeConstitution) {
      const width = d3Container.current.clientWidth;
      const height = 500;

      // Map constitution content to graph nodes/links
      // Rules, Authority, Roles, Principles
      const nodes = [
        { id: 'constitution', label: 'Living Constitution', type: 'root', group: 0 },
        { id: 'identity', label: 'Identity & Purpose', type: 'section', group: 1 },
        { id: 'governance', label: 'Governance Rules', type: 'section', group: 2 },
        { id: 'emergency', label: 'Emergency Protocols', type: 'section', group: 3 }
      ];

      const links = [
        { source: 'constitution', target: 'identity' },
        { source: 'constitution', target: 'governance' },
        { source: 'constitution', target: 'emergency' }
      ];

      // Add sub-nodes from content
      if (activeConstitution.content?.governance?.principles) {
         activeConstitution.content.governance.principles.forEach((p, i) => {
           nodes.push({ id: `principle-${i}`, label: p, type: 'principle', group: 2 });
           links.push({ source: 'governance', target: `principle-${i}` });
         });
      }

      if (activeConstitution.content?.governance?.votingModel) {
        nodes.push({ id: 'voting-model', label: `Model: ${activeConstitution.content.governance.votingModel}`, type: 'detail', group: 2 });
        links.push({ source: 'governance', target: 'voting-model' });
      }

      d3.select(d3Container.current).selectAll("svg").remove();
      const svg = d3.select(d3Container.current).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(100))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg.append("g")
        .attr("stroke", "rgba(0, 243, 255, 0.15)")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", 1.5);

      const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g");

      node.append("circle")
        .attr("r", d => d.type === 'root' ? 12 : d.type === 'section' ? 8 : 5)
        .attr("fill", d => {
           if (d.type === 'root') return '#00F3FF';
           if (d.group === 1) return '#FF5CA2';
           if (d.group === 2) return '#00D787';
           if (d.group === 3) return '#FF4136';
           return '#888';
        })
        .attr("filter", "drop-shadow(0 0 5px rgba(0, 243, 255, 0.4))");

      node.append("text")
        .attr("dx", 12)
        .attr("dy", 4)
        .attr("fill", "#ccc")
        .style("font-size", "10px")
        .style("font-family", "Orbitron")
        .text(d => d.label);

      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node
          .attr("transform", d => `translate(${d.x},${d.y})`);
      });
    }
  }, [activeConstitution]);

  return (
    <div ref={d3Container} className="w-full h-[500px] bg-black/20 rounded-xl">
       {!activeConstitution && <div className="h-full flex items-center justify-center text-gray-600 font-mono italic">ACCESSING INSTITUTIONAL DNA...</div>}
    </div>
  );
};

export default ConstitutionGraph;
