import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Zap, TrendingUp, AlertTriangle, Play, RefreshCcw } from 'lucide-react';
import * as d3 from 'd3';
import * as S from '../components/Governance/GovernanceStyles';

const CivicSimulator = () => {
  const { communityId } = useParams();
  const [params, setParams] = useState({
    quorum: 15,
    delegationDepth: 2,
    voteThreshold: 60,
    emergencyOverride: false
  });
  const [results, setResults] = useState(null);
  const chartRef = useRef(null);

  const runSimulation = () => {
    // Logic to simulate outcomes
    const score = (params.quorum * 0.4) + (params.voteThreshold * 0.2) + (params.delegationDepth * 10);
    setResults({
      participation: Math.min(100, params.quorum * 3),
      stability: 100 - (params.delegationDepth * 15),
      speed: params.emergencyOverride ? 95 : 45,
      burnout: (params.quorum > 30 ? 60 : 20) + (params.voteThreshold > 75 ? 25 : 0),
      strain: params.emergencyOverride ? 85 : 30,
      legitimacy: score > 50 ? 'High' : 'At Risk'
    });
  };

  useEffect(() => {
    if (results && chartRef.current) {
      const data = [
        { label: 'Participation', value: results.participation },
        { label: 'Stability', value: results.stability },
        { label: 'Speed', value: results.speed }
      ];

      const width = 400;
      const height = 200;
      const svg = d3.select(chartRef.current);
      svg.selectAll("*").remove();

      const x = d3.scaleBand().range([0, width]).domain(data.map(d => d.label)).padding(0.4);
      const y = d3.scaleLinear().range([height, 0]).domain([0, 100]);

      const g = svg.append("g").attr("transform", "translate(40, 20)");

      g.append("g")
        .attr("transform", `translate(0, ${height})`)
        .call(d3.axisBottom(x))
        .attr("color", "rgba(255,255,255,0.2)")
        .selectAll("text")
        .style("font-size", "8px")
        .style("font-family", "Orbitron")
        .style("text-transform", "uppercase")
        .style("fill", "rgba(255,255,255,0.5)");

      g.append("g")
        .call(d3.axisLeft(y).ticks(5))
        .attr("color", "rgba(255,255,255,0.2)")
        .selectAll("text")
        .style("font-size", "8px")
        .style("fill", "rgba(255,255,255,0.5)");

      g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", "url(#barGradient)")
        .attr("rx", 4)
        .attr("filter", "drop-shadow(0 0 5px rgba(34, 211, 238, 0.4))");

      // Add gradient
      const defs = svg.append("defs");
      const gradient = defs.append("linearGradient")
        .attr("id", "barGradient")
        .attr("x1", "0%")
        .attr("y1", "0%")
        .attr("x2", "0%")
        .attr("y2", "100%");
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#22d3ee");
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#0891b2");
    }
  }, [results]);

  return (
    <S.PageContainer>
      <S.Header>
        <S.TitleBlock>
          <S.Title>
            <Zap size={32} /> Civic Impact Simulator
          </S.Title>
          <S.Subtitle>Institutional Forecast Engine | Community: {communityId}</S.Subtitle>
        </S.TitleBlock>
      </S.Header>

      <S.LayoutGrid>
        <S.GridItem span={4}>
          <S.GlassPanel className="h-full">
            <S.SectionLabel>
              <Shield size={14} /> Simulation Parameters
            </S.SectionLabel>

            <div className="space-y-8 mt-6">
              <div>
                <div className="flex justify-between mb-2">
                  <S.Label>Quorum Target</S.Label>
                  <span className="text-cyan-400 font-mono text-xs">{params.quorum}%</span>
                </div>
                <input type="range" min="5" max="50" value={params.quorum} onChange={e => setParams({...params, quorum: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <S.Label>Delegation Max Depth</S.Label>
                  <span className="text-cyan-400 font-mono text-xs">{params.delegationDepth}</span>
                </div>
                <input type="range" min="1" max="5" value={params.delegationDepth} onChange={e => setParams({...params, delegationDepth: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <S.Label>Passing Threshold</S.Label>
                  <span className="text-cyan-400 font-mono text-xs">{params.voteThreshold}%</span>
                </div>
                <input type="range" min="51" max="90" value={params.voteThreshold} onChange={e => setParams({...params, voteThreshold: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
              </div>

              <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                <S.Label style={{ marginBottom: 0 }}>Emergency Powers</S.Label>
                <input
                  type="checkbox"
                  checked={params.emergencyOverride}
                  onChange={e => setParams({...params, emergencyOverride: e.target.checked})}
                  className="w-5 h-5 accent-cyan-500 rounded"
                />
              </div>
            </div>

            <S.NeonButton
              onClick={runSimulation}
              className="w-full mt-10 py-4 flex items-center justify-center gap-2"
            >
              <Play size={14} /> Run Neural Forecast
            </S.NeonButton>
          </S.GlassPanel>
        </S.GridItem>

        <S.GridItem span={8}>
          {results ? (
            <S.GlassPanel className="h-full p-10 animate-in fade-in zoom-in duration-500">
               <div className="flex justify-between items-start mb-10">
                  <h3 className="text-xl font-bold flex items-center gap-3 uppercase tracking-wider">
                    <TrendingUp className="text-cyan-400" /> Projected Outcomes
                  </h3>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border ${results.legitimacy === 'High' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-red-500/10 border-red-500 text-red-400'}`}>
                    Legitimacy: {results.legitimacy}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="bg-black/20 rounded-3xl p-6 border border-white/5 flex items-center justify-center">
                    <svg ref={chartRef} width="450" height="250"></svg>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                     <div className="p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all">
                        <div className="text-[9px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Coordination Speed</div>
                        <div className="text-2xl font-mono text-cyan-400">{results.speed}%</div>
                        <p className="text-[9px] text-gray-600 italic mt-1">Efficiency of institutional decision making.</p>
                     </div>
                     <div className="p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-all">
                        <div className="text-[9px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Centralization Risk</div>
                        <div className="text-2xl font-mono text-orange-400">{params.delegationDepth > 3 ? 'HIGH' : 'LOW'}</div>
                        <p className="text-[9px] text-gray-600 italic mt-1">Potential for authority bottlenecks.</p>
                     </div>
                     <div className="p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-pink-500/30 transition-all">
                        <div className="text-[9px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Burnout Risk</div>
                        <div className="text-2xl font-mono text-pink-500">{results.burnout}%</div>
                        <p className="text-[9px] text-gray-600 italic mt-1">Expected participant fatigue.</p>
                     </div>
                     <div className="p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-yellow-500/30 transition-all">
                        <div className="text-[9px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Regional Strain</div>
                        <div className="text-2xl font-mono text-yellow-500">{results.strain}%</div>
                        <p className="text-[9px] text-gray-600 italic mt-1">Impact on coordination overhead.</p>
                     </div>
                  </div>
               </div>

               <div className="mt-10 p-6 bg-cyan-900/10 border border-cyan-500/20 rounded-2xl flex items-start gap-5">
                  <AlertTriangle className="text-cyan-400 shrink-0" size={24} />
                  <div>
                    <h4 className="text-[10px] font-bold text-white uppercase mb-2 tracking-widest">Simulator Insight</h4>
                    <p className="text-xs text-gray-400 leading-relaxed italic">
                      Increasing quorum targets without delegation support may lead to "Governance Gridlock." Consider enabling domain-specific delegation to maintain coordination speed in high-urgency scenarios.
                    </p>
                  </div>
               </div>
            </S.GlassPanel>
          ) : (
            <S.GlassPanel className="h-full flex flex-col items-center justify-center text-center p-12">
              <RefreshCcw className="text-white/10 mb-6 animate-spin-slow" size={64} />
              <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em]">Awaiting Neural Simulation Parameters...</p>
            </S.GlassPanel>
          )}
        </S.GridItem>
      </S.LayoutGrid>
    </S.PageContainer>
  );
};

export default CivicSimulator;
