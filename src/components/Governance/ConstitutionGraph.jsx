import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const ConstitutionGraph = ({ constitution, compareConstitution }) => {
  const d3Container = useRef(null);

  useEffect(() => {
    if (d3Container.current && constitution) {
      const width = d3Container.current.clientWidth;
      const height = d3Container.current.clientHeight || 500;

      // Map constitution content to graph nodes/links
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
      if (constitution.content?.governance?.principles) {
         constitution.content.governance.principles.forEach((p, i) => {
           nodes.push({ id: `principle-${i}`, label: p, type: 'principle', group: 2 });
           links.push({ source: 'governance', target: `principle-${i}` });
         });
      }

      if (constitution.content?.governance?.votingModel) {
        nodes.push({ id: 'voting-model', label: `Model: ${constitution.content.governance.votingModel}`, type: 'detail', group: 2 });
        links.push({ source: 'governance', target: 'voting-model' });
      }

      // If comparing, we could add indicators for differences
      // This is a simplified diff visualization
      if (compareConstitution) {
        // Logic to highlight nodes that changed could go here
      }

      d3.select(d3Container.current).selectAll("svg").remove();
      const svg = d3.select(d3Container.current).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-600))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(40));

      const link = svg.append("g")
        .attr("stroke", "rgba(34, 211, 238, 0.15)")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke-width", 1.5);

      const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g");

      node.append("circle")
        .attr("r", d => d.type === 'root' ? 14 : d.type === 'section' ? 10 : 6)
        .attr("fill", d => {
           if (d.type === 'root') return 'rgba(34, 211, 238, 0.2)';
           if (d.group === 1) return 'rgba(255, 92, 162, 0.2)';
           if (d.group === 2) return 'rgba(52, 211, 153, 0.2)';
           if (d.group === 3) return 'rgba(239, 68, 68, 0.2)';
           return 'rgba(136, 136, 136, 0.2)';
        })
        .attr("stroke", d => {
           if (d.type === 'root') return '#22d3ee';
           if (d.group === 1) return '#FF5CA2';
           if (d.group === 2) return '#34d399';
           if (d.group === 3) return '#ef4444';
           return '#888';
        })
        .attr("stroke-width", 2)
        .attr("filter", d => {
           const color = d.type === 'root' ? '#22d3ee' : (d.group === 1 ? '#FF5CA2' : (d.group === 2 ? '#34d399' : '#ef4444'));
           return `drop-shadow(0 0 8px ${color}66)`;
        });

      node.append("text")
        .attr("dx", 12)
        .attr("dy", 4)
        .attr("fill", "#ccc")
        .style("font-size", "10px")
        .style("font-family", "Orbitron, sans-serif")
        .style("text-transform", "uppercase")
        .style("letter-spacing", "0.05em")
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
  }, [constitution, compareConstitution]);

  return (
    <div ref={d3Container} className="w-full h-full">
       {!constitution && <div className="h-full flex items-center justify-center text-gray-600 font-mono italic text-xs uppercase tracking-widest">ACCESSING INSTITUTIONAL DNA...</div>}
    </div>
  );
};

export default ConstitutionGraph;
