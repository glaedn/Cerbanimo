import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGovernanceStore } from '../../store/useGovernanceStore';
import { MessageSquare, Plus, ThumbsUp, AlertCircle, Link as LinkIcon, FileText } from 'lucide-react';

const DeliberationSpace = ({ proposalId }) => {
  const d3Container = useRef(null);
  const { deliberationTrees, fetchDeliberation, addArgument } = useGovernanceStore();
  const tree = deliberationTrees[proposalId] || { nodes: [], links: [] };

  useEffect(() => {
    fetchDeliberation(proposalId);
  }, [proposalId, fetchDeliberation]);

  useEffect(() => {
    if (d3Container.current && tree.nodes.length > 0) {
      const width = d3Container.current.clientWidth;
      const height = 300;

      d3.select(d3Container.current).selectAll("svg").remove();
      const svg = d3.select(d3Container.current).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

      const simulation = d3.forceSimulation(tree.nodes)
        .force("link", d3.forceLink(tree.links).id(d => d.id).distance(50))
        .force("charge", d3.forceManyBody().strength(-100))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg.append("g")
        .attr("stroke", "rgba(0, 243, 255, 0.2)")
        .selectAll("line")
        .data(tree.links)
        .join("line");

      const node = svg.append("g")
        .selectAll("g")
        .data(tree.nodes)
        .join("g")
        .on("mouseover", function(event, d) {
          d3.select(this).select("circle").attr("r", 8).attr("stroke-width", 2);
        })
        .on("mouseout", function(event, d) {
          d3.select(this).select("circle").attr("r", 5).attr("stroke-width", 1);
        });

      node.append("circle")
        .attr("r", 5)
        .attr("fill", d => d.type === 'support' ? '#2ECC40' : d.type === 'concern' ? '#FF4136' : '#00F3FF')
        .attr("stroke", d => d.evidence ? "#fff" : "none")
        .attr("stroke-width", 1);

      node.append("title").text(d => d.text);

      // Evidence indicators (small satellites)
      node.filter(d => d.evidence)
        .append("circle")
        .attr("r", 2)
        .attr("cx", 6)
        .attr("cy", -6)
        .attr("fill", "#00F3FF");

      simulation.on("tick", () => {
        link
          .attr("x1", d => d.source.x)
          .attr("y1", d => d.source.y)
          .attr("x2", d => d.target.x)
          .attr("y2", d => d.target.y);

        node
          .attr("cx", d => d.x)
          .attr("cy", d => d.y);
      });
    }
  }, [tree, proposalId]);

  return (
    <div className="deliberation-space bg-gray-950/50 border border-gray-800 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex justify-between items-center">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
          <MessageSquare size={14} className="text-cyan-400" /> Civic Reasoning Map
        </h3>
        <button
          onClick={() => addArgument(proposalId, { id: Date.now(), text: 'New insight', type: 'support' })}
          className="p-1 hover:bg-cyan-500/20 rounded transition text-cyan-400"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="relative">
        {tree.nodes.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-center p-6">
            <p className="text-gray-500 text-sm italic mb-4">No structured reasoning has been mapped for this proposal yet.</p>
            <button className="px-4 py-2 border border-cyan-500/50 text-cyan-400 rounded text-xs font-bold hover:bg-cyan-500/10 transition uppercase">
              Begin Deliberation
            </button>
          </div>
        ) : (
          <div ref={d3Container} className="h-[300px]"></div>
        )}

        {/* Legend */}
        {tree.nodes.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-4">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase">
              <div className="w-2 h-2 rounded-full bg-green-500"></div> Support
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase">
              <div className="w-2 h-2 rounded-full bg-red-500"></div> Concern
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold uppercase">
              <div className="w-2 h-2 rounded-full bg-cyan-500"></div> Amendment
            </div>
          </div>
        )}
      </div>

      {/* Flat view fallback/summary */}
      <div className="p-4 border-t border-gray-800 max-h-[200px] overflow-y-auto space-y-3 custom-scrollbar">
         {tree.nodes.map(node => (
           <div key={node.id} className="flex gap-3 items-start group p-2 rounded hover:bg-white/5 transition">
             {node.type === 'support' ? <ThumbsUp size={14} className="text-green-500 mt-0.5" /> : <AlertCircle size={14} className="text-red-500 mt-0.5" />}
             <div className="flex-1">
               <div className="flex justify-between items-start mb-1">
                 <p className="text-xs text-gray-300 leading-relaxed">{node.text}</p>
                 {node.evidence && <LinkIcon size={10} className="text-cyan-400" />}
               </div>

               {node.evidence && (
                 <div className="mt-2 p-2 bg-cyan-900/10 border border-cyan-500/20 rounded flex items-center gap-2">
                    <FileText size={10} className="text-cyan-500" />
                    <span className="text-[9px] text-cyan-400 font-mono uppercase tracking-tighter">Verified Evidence: {node.evidence}</span>
                 </div>
               )}

               <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition">
                  <button className="text-[10px] text-gray-600 hover:text-cyan-400 font-bold uppercase">Reply</button>
                  <button className="text-[10px] text-gray-600 hover:text-cyan-400 font-bold uppercase">Endorse</button>
                  <button className="text-[10px] text-gray-600 hover:text-pink-400 font-bold uppercase">Challenge</button>
               </div>
             </div>
           </div>
         ))}
      </div>
    </div>
  );
};

export default DeliberationSpace;
