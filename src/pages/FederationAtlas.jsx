import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { useAuth0 } from '@auth0/auth0-react';
import { Globe, Shield, Zap, Activity, Filter, Search, X } from 'lucide-react';
import * as S from '../components/Governance/GovernanceStyles';
import { ProgressionGuard } from '../components/ProgressionGuard';

const FederationAtlas = () => {
  const d3Container = useRef(null);
  const { treaties, fetchFederationAtlas } = useGovernanceStore();
  const { getAccessTokenSilently } = useAuth0();
  const [selectedTreaty, setSelectedTreaty] = useState(null);

  useEffect(() => {
    const loadAtlas = async () => {
      try {
        const token = await getAccessTokenSilently();
        fetchFederationAtlas(token);
      } catch (err) {
        console.error("Auth failed:", err);
        fetchFederationAtlas();
      }
    };
    loadAtlas();
  }, [fetchFederationAtlas, getAccessTokenSilently]);

  useEffect(() => {
    if (d3Container.current && treaties.length > 0) {
      const width = d3Container.current.clientWidth;
      const height = d3Container.current.clientHeight || 600;

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
        .attr("stroke", d => d.type === 'mutual_aid' ? 'rgba(34, 211, 238, 0.4)' : 'rgba(192, 132, 252, 0.4)')
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
        .attr("fill", "#050510")
        .attr("stroke", "#22d3ee")
        .attr("stroke-width", 2)
        .attr("filter", "drop-shadow(0 0 8px rgba(34, 211, 238, 0.6))");

      node.append("text")
        .attr("dy", 40)
        .attr("text-anchor", "middle")
        .attr("fill", "#fff")
        .style("font-size", "10px")
        .style("font-family", "Orbitron, sans-serif")
        .style("font-weight", "bold")
        .style("text-transform", "uppercase")
        .style("letter-spacing", "0.1em")
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
    <ProgressionGuard system="federation" lockOverlay={true}>
    <S.PageContainer>
      <S.Header>
        <S.TitleBlock>
          <S.Title>
            <Globe size={32} /> Federation Atlas
          </S.Title>
          <S.Subtitle>Global Treaty Network & Mutual Aid Corridors</S.Subtitle>
        </S.TitleBlock>

        <div className="flex gap-4">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" size={16} />
              <S.Input
                type="text"
                placeholder="Search Alliances..."
                style={{ paddingLeft: '2.5rem', width: '250px', height: '40px' }}
              />
           </div>
           <S.NeonButton variant="outline" style={{ padding: '0 12px' }}>
              <Filter size={18} />
           </S.NeonButton>
        </div>
      </S.Header>

      <S.LayoutGrid>
         {/* Map Visualization */}
         <S.GridItem span={8}>
           <S.GlassPanel className="h-[700px] relative overflow-hidden bg-[#050510]/60">
              <div className="absolute top-8 left-8 flex gap-4 z-10">
                 <div className="bg-black/60 backdrop-blur-xl px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_cyan] animate-pulse"></div>
                    <span className="text-[10px] text-white font-bold uppercase tracking-widest">Active Treaties: {treaties.length}</span>
                 </div>
              </div>

              <div ref={d3Container} className="w-full h-full cursor-grab active:cursor-grabbing"></div>

              {/* Floating Legend */}
              <div className="absolute bottom-6 left-6 p-4 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
                 <div className="flex items-center gap-3 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                    <div className="w-6 h-0.5 bg-cyan-500"></div> Mutual Aid Treaty
                 </div>
                 <div className="flex items-center gap-3 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                    <div className="w-6 h-0.5 border-t border-dashed border-purple-500"></div> Shared Mission
                 </div>
                 <div className="flex items-center gap-3 text-[8px] text-gray-400 font-bold uppercase tracking-widest">
                    <div className="w-3 h-3 rounded-full border border-cyan-500"></div> Community Hub
                 </div>
              </div>
           </S.GlassPanel>
         </S.GridItem>

         {/* Detail Sidebar */}
         <S.GridItem span={4}>
            {selectedTreaty ? (
              <S.GlassPanel className="h-[700px] flex flex-col p-8 animate-in fade-in slide-in-from-right-4 duration-500">
                 <div className="flex justify-between items-start mb-8">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">{selectedTreaty.treaty_type.replace('_', ' ')}</span>
                    <button onClick={() => setSelectedTreaty(null)} className="text-gray-500 hover:text-white transition"><X size={20} /></button>
                 </div>

                 <div className="flex items-center justify-between mb-10 px-4">
                    <div className="text-center flex-1">
                       <div className="w-16 h-16 bg-black/60 border border-cyan-500/50 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                          <Shield className="text-cyan-400" size={24} />
                       </div>
                       <div className="text-white font-bold text-[10px] uppercase tracking-wider">{selectedTreaty.community_a_name}</div>
                    </div>
                    <div className="px-2 text-cyan-900 font-bold animate-pulse text-xl">⟷</div>
                    <div className="text-center flex-1">
                       <div className="w-16 h-16 bg-black/60 border border-purple-500/50 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(192,132,252,0.2)]">
                          <Zap className="text-purple-400" size={24} />
                       </div>
                       <div className="text-white font-bold text-[10px] uppercase tracking-wider">{selectedTreaty.community_b_name}</div>
                    </div>
                 </div>

                 <div className="space-y-8 flex-1">
                    <div>
                       <S.SectionLabel>
                          <Activity size={12} /> Treaty Logistics
                       </S.SectionLabel>
                       <div className="bg-black/40 p-5 rounded-2xl border border-white/5 mt-4">
                          <p className="text-xs text-gray-400 leading-relaxed italic">
                             "${selectedTreaty.terms?.summary || 'Formal commitment to shared resource availability and emergency coordination.'}"
                          </p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                          <div className="text-[9px] text-gray-500 font-bold uppercase mb-1">Mutual Trust</div>
                          <div className="text-xs text-cyan-400 font-mono">{(selectedTreaty.trust_score || 0).toFixed(2)}/1.0</div>
                       </div>
                       <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                          <div className="text-[9px] text-gray-500 font-bold uppercase mb-1">Last Update</div>
                          <div className="text-xs text-gray-400 font-mono">
                             {selectedTreaty.updated_at ? `${Math.floor((new Date() - new Date(selectedTreaty.updated_at)) / (1000 * 60 * 60))}h ago` : 'N/A'}
                          </div>
                       </div>
                    </div>
                 </div>

                 <S.NeonButton className="w-full mt-8 py-4">
                    ENTER SHARED WORKSPACE
                 </S.NeonButton>
              </S.GlassPanel>
            ) : (
              <S.GlassPanel className="h-[700px] flex flex-col items-center justify-center text-center p-12">
                 <Globe className="text-white/10 mb-8" size={80} />
                 <h3 className="text-white font-bold mb-3 uppercase tracking-widest">Federation Insights</h3>
                 <p className="text-gray-500 text-[10px] leading-relaxed uppercase tracking-[0.2em] font-medium max-w-[200px]">
                    Select a hub or connection to analyze inter-community coordination flows.
                 </p>
              </S.GlassPanel>
            )}
         </S.GridItem>
      </S.LayoutGrid>
    </S.PageContainer>
    </ProgressionGuard>
  );
};

export default FederationAtlas;
