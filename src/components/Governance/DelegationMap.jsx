import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { useGovernanceStore } from '../../store/useGovernanceStore';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth0 } from '@auth0/auth0-react';
import { Users, Shield, MapPin, Zap, X, Trash2 } from 'lucide-react';
import axios from 'axios';

const DelegationMap = ({ communityId }) => {
  const d3Container = useRef(null);
  const { delegations, fetchCommunityGovernance, addDelegation, revokeDelegation } = useGovernanceStore();
  const { profile } = useUserProfile();
  const { getAccessTokenSilently } = useAuth0();
  const [showModal, setShowModal] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [newDelegation, setNewDelegation] = useState({
    delegateId: '',
    domain: 'all'
  });

  useEffect(() => {
    fetchCommunityGovernance(communityId);
  }, [communityId, fetchCommunityGovernance]);

  useEffect(() => {
    if (d3Container.current && delegations.length > 0) {
      const width = d3Container.current.clientWidth;
      const height = 400;

      // Extract unique users
      const nodesMap = new Map();
      delegations.forEach(d => {
        if (!nodesMap.has(d.delegator_id)) nodesMap.set(d.delegator_id, { id: d.delegator_id, name: d.delegator_name, type: 'user' });
        if (!nodesMap.has(d.delegate_id)) nodesMap.set(d.delegate_id, { id: d.delegate_id, name: d.delegate_name, type: 'user' });
      });

      const nodes = Array.from(nodesMap.values());
      const links = delegations.map(d => ({
        source: d.delegator_id,
        target: d.delegate_id,
        domain: d.domain
      }));

      d3.select(d3Container.current).selectAll("svg").remove();
      const svg = d3.select(d3Container.current).append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height]);

      // Arrowhead marker
      svg.append("defs").append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "-0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("orient", "auto")
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("xoverflow", "visible")
        .append("svg:path")
        .attr("d", "M 0,-5 L 10 ,0 L 0,5")
        .attr("fill", "rgba(0, 243, 255, 0.5)")
        .style("stroke", "none");

      const simulation = d3.forceSimulation(nodes)
        .force("link", d3.forceLink(links).id(d => d.id).distance(120))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(30));

      const link = svg.append("g")
        .selectAll("path")
        .data(links)
        .join("path")
        .attr("fill", "none")
        .attr("stroke", "rgba(0, 243, 255, 0.3)")
        .attr("stroke-width", 1.5)
        .attr("marker-end", "url(#arrowhead)");

      const node = svg.append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .on("click", (event, d) => {
          setSelectedNode(d);
        })
        .style("cursor", "pointer")
        .call(d3.drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }));

      node.append("circle")
        .attr("r", 15)
        .attr("fill", d => Number(d.id) === Number(profile?.id) ? "rgba(0, 243, 255, 0.2)" : "#1C1C1E")
        .attr("stroke", d => Number(d.id) === Number(profile?.id) ? "#00F3FF" : "#333")
        .attr("stroke-width", 2)
        .attr("filter", d => Number(d.id) === Number(profile?.id) ? "drop-shadow(0 0 8px rgba(0, 243, 255, 0.6))" : "none");

      node.append("text")
        .attr("dy", 30)
        .attr("text-anchor", "middle")
        .attr("fill", "#888")
        .style("font-size", "9px")
        .style("font-weight", "bold")
        .text(d => d.name);

      simulation.on("tick", () => {
        link.attr("d", d => `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`);
        node.attr("transform", d => `translate(${d.x},${d.y})`);
      });
    }
  }, [delegations]);

  const handleDelegate = async (e) => {
    e.preventDefault();
    if (!profile?.id) return;
    try {
      const token = await getAccessTokenSilently();
      await addDelegation(communityId, profile.id, newDelegation.delegateId, token);
      setShowModal(false);
      setNewDelegation({ delegateId: '', domain: 'all' });
    } catch (err) {
      alert('Error delegating authority: ' + err.message);
    }
  };

  const handleRevoke = async () => {
    if (!profile?.id) return;
    try {
      const token = await getAccessTokenSilently();
      await revokeDelegation(communityId, profile.id, token);
      setSelectedNode(null);
    } catch (err) {
      alert('Error revoking delegation: ' + err.message);
    }
  };

  const currentUserDelegation = useMemo(() => {
    if (!profile?.id) return null;
    return delegations.find(d => Number(d.delegator_id) === Number(profile.id));
  }, [delegations, profile?.id]);

  return (
    <div className="delegation-map bg-gray-950/40 p-6 rounded-2xl border border-gray-800 relative shadow-2xl overflow-hidden">
      <div className="flex justify-between items-center mb-6">
         <div>
            <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-wider flex items-center gap-2">
               <Shield size={16} className="text-cyan-400" /> Expertise Routing Topology
            </h3>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Visualizing real-time trust flows</p>
         </div>
         <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest transition"
         >
           + Initialize Delegation
         </button>
      </div>

      <div className="relative">
        {delegations.length === 0 ? (
          <div className="h-[400px] flex flex-col items-center justify-center text-center">
             <Users size={48} className="text-gray-800 mb-4" />
             <p className="text-gray-600 italic text-sm">No trust routing has been established in this community yet.</p>
          </div>
        ) : (
          <div ref={d3Container} className="h-[400px] cursor-grab active:cursor-grabbing"></div>
        )}

        {selectedNode && (
          <div className="absolute top-0 right-0 p-4 bg-black/80 backdrop-blur-md border border-white/10 rounded-xl w-48 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="flex justify-between items-start mb-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Selected Actor</div>
                <button onClick={() => setSelectedNode(null)} className="text-gray-500 hover:text-white"><X size={12} /></button>
             </div>
             <div className="text-sm font-bold text-white mb-4">{selectedNode.name}</div>

             {Number(selectedNode.id) === Number(profile?.id) && currentUserDelegation && (
               <button
                onClick={handleRevoke}
                className="w-full py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-2"
               >
                 <Trash2 size={12} /> Revoke My Trust
               </button>
             )}

             {Number(selectedNode.id) !== Number(profile?.id) && (
               <button
                onClick={() => {
                  setNewDelegation({...newDelegation, delegateId: selectedNode.id});
                  setShowModal(true);
                }}
                className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 border border-cyan-500/30 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-2"
               >
                 <Shield size={12} /> Delegate Trust
               </button>
             )}
          </div>
        )}

        {/* Legend Overlay */}
        <div className="absolute bottom-0 left-0 space-y-2 p-2 bg-black/40 backdrop-blur-sm rounded border border-white/5">
           <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase">
              <div className="w-2 h-0.5 bg-cyan-500"></div> Trust Line
           </div>
           <div className="flex items-center gap-2 text-[9px] text-gray-500 font-bold uppercase">
              <div className="w-2 h-2 rounded-full border border-cyan-500"></div> Actor Node
           </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-gray-900 border border-cyan-500/30 p-8 rounded-2xl w-full max-w-sm shadow-[0_0_60px_rgba(0,243,255,0.15)]">
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-white font-bold uppercase tracking-tight">Route Civic Trust</h3>
               <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={handleDelegate} className="space-y-5">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Target Delegate (User ID)</label>
                <div className="relative">
                   <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                   <input
                    type="number"
                    required
                    value={newDelegation.delegateId}
                    onChange={(e) => setNewDelegation({...newDelegation, delegateId: e.target.value})}
                    className="w-full bg-black border border-gray-800 p-3 pl-10 rounded-lg text-white text-sm outline-none focus:border-cyan-500 transition"
                    placeholder="Enter User ID..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase font-bold mb-1">Expertise Domain</label>
                <div className="relative">
                   <Zap className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={14} />
                   <select
                    value={newDelegation.domain}
                    onChange={(e) => setNewDelegation({...newDelegation, domain: e.target.value})}
                    className="w-full bg-black border border-gray-800 p-3 pl-10 rounded-lg text-white text-sm outline-none focus:border-cyan-500 transition appearance-none"
                  >
                    <option value="all">Global (All Domains)</option>
                    <option value="logistics">Logistics & Resource Flow</option>
                    <option value="treasury">Resource Allocation</option>
                    <option value="governance">Institutional Policy</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <button type="submit" className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-[0_0_15px_rgba(8,145,178,0.4)] transition active:scale-95">
                   Confirm Trust Route
                </button>
                <p className="text-[9px] text-gray-600 text-center uppercase font-medium leading-relaxed px-4">
                  Delegation is revocable at any time and does not transfer core identity rights.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DelegationMap;
