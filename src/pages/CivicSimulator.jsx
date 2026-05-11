import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Shield, Zap, TrendingUp, AlertTriangle, Play, RefreshCcw } from 'lucide-react';
import * as d3 from 'd3';

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

      g.append("g").attr("transform", `translate(0, ${height})`).call(d3.axisBottom(x)).attr("color", "#666");
      g.append("g").call(d3.axisLeft(y).ticks(5)).attr("color", "#666");

      g.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.label))
        .attr("y", d => y(d.value))
        .attr("width", x.bandwidth())
        .attr("height", d => height - y(d.value))
        .attr("fill", "#00F3FF")
        .attr("rx", 4)
        .attr("filter", "drop-shadow(0 0 5px rgba(0, 243, 255, 0.5))");
    }
  }, [results]);

  return (
    <div className="civic-simulator min-h-screen bg-black text-white p-8">
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <Zap className="text-cyan-400" size={32} />
          <h1 className="text-4xl font-bold uppercase tracking-tight">Civic Impact Simulator</h1>
        </div>
        <p className="text-gray-500 uppercase text-xs tracking-widest font-bold">Predicting Institutional Evolution for Community {communityId}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6 bg-gray-900/50 p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
            <Shield size={14} /> Simulation Parameters
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-2">Quorum Target ({params.quorum}%)</label>
              <input type="range" min="5" max="50" value={params.quorum} onChange={e => setParams({...params, quorum: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-2">Delegation Max Depth ({params.delegationDepth})</label>
              <input type="range" min="1" max="5" value={params.delegationDepth} onChange={e => setParams({...params, delegationDepth: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 font-bold uppercase mb-2">Passing Threshold ({params.voteThreshold}%)</label>
              <input type="range" min="51" max="90" value={params.voteThreshold} onChange={e => setParams({...params, voteThreshold: parseInt(e.target.value)})} className="w-full accent-cyan-500" />
            </div>
            <div className="flex items-center justify-between p-3 bg-black/40 rounded border border-white/5">
              <span className="text-[10px] text-gray-400 font-bold uppercase">Emergency Powers</span>
              <input type="checkbox" checked={params.emergencyOverride} onChange={e => setParams({...params, emergencyOverride: e.target.checked})} />
            </div>
          </div>

          <button
            onClick={runSimulation}
            className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold text-xs uppercase tracking-widest transition flex items-center justify-center gap-2"
          >
            <Play size={14} /> Run Neural Forecast
          </button>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {results ? (
            <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8 animate-in fade-in zoom-in duration-500">
               <div className="flex justify-between items-start mb-8">
                  <h3 className="text-xl font-bold flex items-center gap-3">
                    <TrendingUp className="text-cyan-400" /> Projected Outcomes
                  </h3>
                  <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase ${results.legitimacy === 'High' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    Legitimacy: {results.legitimacy}
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <svg ref={chartRef} width="450" height="250"></svg>

                  <div className="space-y-4">
                     <div className="p-4 bg-black/40 rounded border border-white/5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Coordination Speed</div>
                        <div className="text-2xl font-mono text-cyan-400">{results.speed}%</div>
                        <p className="text-[10px] text-gray-600 italic mt-1">Efficiency of institutional decision making.</p>
                     </div>
                     <div className="p-4 bg-black/40 rounded border border-white/5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Centralization Risk</div>
                        <div className="text-2xl font-mono text-orange-400">{params.delegationDepth > 3 ? 'HIGH' : 'LOW'}</div>
                        <p className="text-[10px] text-gray-600 italic mt-1">Potential for authority bottlenecks.</p>
                     </div>
                     <div className="p-4 bg-black/40 rounded border border-white/5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Burnout Risk</div>
                        <div className="text-2xl font-mono text-pink-500">{results.burnout}%</div>
                        <p className="text-[10px] text-gray-600 italic mt-1">Expected participant fatigue.</p>
                     </div>
                     <div className="p-4 bg-black/40 rounded border border-white/5">
                        <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">Regional Strain</div>
                        <div className="text-2xl font-mono text-yellow-500">{results.strain}%</div>
                        <p className="text-[10px] text-gray-600 italic mt-1">Impact on coordination overhead.</p>
                     </div>
                  </div>
               </div>

               <div className="mt-8 p-6 bg-cyan-900/10 border border-cyan-500/20 rounded-xl flex items-start gap-4">
                  <AlertTriangle className="text-cyan-400 shrink-0" size={20} />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase mb-1">Simulator Insight</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Increasing quorum targets without delegation support may lead to "Governance Gridlock." Consider enabling domain-specific delegation to maintain coordination speed.
                    </p>
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-gray-950 border border-dashed border-gray-800 rounded-2xl p-12 text-center">
              <RefreshCcw className="text-gray-800 mb-4 animate-spin-slow" size={48} />
              <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Awaiting Simulation Inputs...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CivicSimulator;
