import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { Globe, Shield, Zap, Activity, Filter, Search } from 'lucide-react';

const FederationAtlas = () => {
  const d3Container = useRef(null);
  const { treaties, fetchFederationAtlas } = useGovernanceStore();
  const [selectedTreaty, setSelectedTreaty] = useState(null);

  useEffect(() => {
    fetchFederationAtlas();
  }, [fetchFederationAtlas]);

  useEffect(() => {
    if (d3Container.current && treaties.length > 0) {
      const width = d3Container.current.clientWidth;
      const height = 600;

      // Extract communities
      const communitiesMap = new Map();
      treaties.forEach(t => {
        if (!communitiesMap.has(t.community_a)) communitiesMap.set(t.community_a, { id: t.community_a, name: t.community_a_name });
        if (!communitiesMap.has(t.community_b)) communitiesMap.set(t.community_b, { id: t.community_b, name: t.community_b_name });
      });

      const nodes = Array.from(communitiesMap.values());
      const links = treaties.map(t => ({
        source: t.community_a,
        target: t.community_b,
        type: t.treaty_type,
        data: t
      }));

      d3.select(d3Container.current).selectAll("svg").remove();
      const svg = d3.select(d3Container.current).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(200))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", d => d.type === 'mutual_aid' ? 'rgba(0, 243, 255, 0.4)' : 'rgba(255, 92, 162, 0.4)')
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", d => d.type === 'shared_mission' ? "4,4" : "0");

      const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .on("click", (event, d) => {
           const t = treaties.find(tr => tr.community_a === d.id || tr.community_b === d.id);
           setSelectedTreaty(t);
        })
        .style("cursor", "pointer");

      node.append("circle")
        .attr("r", 20)
        .attr("fill", "#0A0A2E")
        .attr("stroke", "#00F3FF")
        .attr("stroke-width", 2)
        .attr("filter", "drop-shadow(0 0 8px rgba(0, 243, 255, 0.6))");

      node.append("text")
        .attr("dy", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "10px")
        .style("font-family", "Orbitron")
        .style("font-weight", "bold")
        .text(d => d.name);

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
  }, [treaties]);

  return (
    <div className="federation-atlas min-h-screen bg-black p-8 overflow-hidden flex flex-col">
      <header className="mb-8 flex justify-between items-start">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <Globe className="text-cyan-400" size={32} />
             <h1 className="text-4xl font-bold text-white tracking-tight">Federation Atlas</h1>
           </div>
           <p className="text-gray-500 font-medium tracking-widest uppercase text-xs">Global Treaty Network & Mutual Aid Corridors</p>
        </div>

        <div className="flex gap-4">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <input
                type="text"
                placeholder="Search Alliances..."
                className="bg-gray-900 border border-gray-800 rounded-full py-2 pl-10 pr-4 text-xs text-white focus:border-cyan-500 outline-none w-64 transition"
              />
           </div>
           <button className="p-2 bg-gray-900 border border-gray-800 rounded-full text-gray-500 hover:text-white transition">
              <Filter size={18} />
           </button>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
         {/* Map Visualization */}
         <div className="lg:col-span-8 bg-gray-950 border border-gray-800 rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="absolute top-6 left-6 flex gap-4 z-10">
               <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]"></div>
                  <span className="text-[10px] text-white font-bold uppercase tracking-widest">Active Alliances: {treaties.length}</span>
               </div>
            </div>

            <div ref={d3Container} className="w-full h-full cursor-grab active:cursor-grabbing"></div>

            {/* Floating Legend */}
            <div className="absolute bottom-6 left-6 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
               <div className="flex items-center gap-3 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  <div className="w-6 h-1 bg-cyan-500"></div> Mutual Aid Treaty
               </div>
               <div className="flex items-center gap-3 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  <div className="w-6 h-1 border-t-2 border-dashed border-pink-500"></div> Shared Mission
               </div>
               <div className="flex items-center gap-3 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                  <div className="w-3 h-3 rounded-full border-2 border-cyan-500"></div> Community Hub
               </div>
            </div>
         </div>

         {/* Detail Sidebar */}
         <div className="lg:col-span-4 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            {selectedTreaty ? (
              <div className="bg-gray-900 border border-cyan-500/30 p-8 rounded-3xl animate-in fade-in slide-in-from-right-4 duration-500 shadow-2xl">
                 <div className="flex justify-between items-start mb-8">
                    <span className="text-[10px] font-bold text-cyan-500 uppercase tracking-[0.2em]">{selectedTreaty.treaty_type.replace('_', ' ')}</span>
                    <button onClick={() => setSelectedTreaty(null)} className="text-gray-600 hover:text-white transition">&times;</button>
                 </div>

                 <div className="flex items-center justify-between mb-10">
                    <div className="text-center flex-1">
                       <div className="w-16 h-16 bg-black border border-cyan-500/50 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
                          <Shield className="text-cyan-400" size={24} />
                       </div>
                       <div className="text-white font-bold text-sm">{selectedTreaty.community_a_name}</div>
                    </div>
                    <div className="px-4 text-cyan-900 font-bold animate-pulse">⟷</div>
                    <div className="text-center flex-1">
                       <div className="w-16 h-16 bg-black border border-pink-500/50 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(255,92,162,0.2)]">
                          <Zap className="text-pink-400" size={24} />
                       </div>
                       <div className="text-white font-bold text-sm">{selectedTreaty.community_b_name}</div>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div>
                       <h4 className="text-[10px] text-gray-500 font-bold uppercase mb-3 flex items-center gap-2">
                          <Activity size={12} /> Treaty Logistics
                       </h4>
                       <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                          <p className="text-xs text-gray-400 leading-relaxed italic">
                             "{selectedTreaty.terms?.summary || 'Formal commitment to shared resource availability and emergency coordination.'}"
                          </p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                          <div className="text-[9px] text-gray-600 font-bold uppercase mb-1">Mutual Trust</div>
                          <div className="text-xs text-cyan-400 font-mono">0.89/1.0</div>
                       </div>
                       <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                          <div className="text-[9px] text-gray-600 font-bold uppercase mb-1">Last Update</div>
                          <div className="text-xs text-gray-400 font-mono">2h ago</div>
                       </div>
                    </div>
                 </div>

                 <button className="w-full mt-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(8,145,178,0.4)]">
                    ENTER SHARED WORKSPACE
                 </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-gray-900/20 border border-dashed border-gray-800 rounded-3xl">
                 <Globe className="text-gray-800 mb-6" size={64} />
                 <h3 className="text-white font-bold mb-2">Federation Insights</h3>
                 <p className="text-gray-600 text-xs leading-relaxed uppercase tracking-widest font-medium">
                    Select a hub or connection to analyze inter-community coordination flows and treaty specifics.
                 </p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default FederationAtlas;
