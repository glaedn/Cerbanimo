import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Scale, MessageSquare, ShieldAlert, CheckCircle } from 'lucide-react';

const MediationSpace = () => {
  const { communityId } = useParams();
  const [activeTab, setActiveTab] = useState('active');

  const mockCases = [
    { id: 1, title: 'Resource Allocation Dispute', status: 'In Mediation', type: 'resource', parties: 2 },
    { id: 2, title: 'Constitutional Clarification', status: 'Pending Review', type: 'legal', parties: 3 },
  ];

  return (
    <div className="mediation-space min-h-screen bg-[#050510] text-white p-8 selection:bg-pink-500/30">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Heart className="text-pink-500" size={32} />
            <h1 className="text-4xl font-bold uppercase tracking-tight">Mediation Space</h1>
          </div>
          <p className="text-gray-500 uppercase text-xs tracking-widest font-bold">Conflict Repair & Restorative Justice Infrastructure</p>
        </div>
        <button className="px-6 py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-bold text-xs uppercase tracking-widest transition shadow-[0_0_20px_rgba(236,72,153,0.3)]">
          Initiate Resolution Path
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation / Filter */}
        <div className="lg:col-span-3 space-y-4">
           {['active', 'resolved', 'appeals'].map(tab => (
             <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`w-full text-left px-6 py-4 rounded-2xl border font-bold text-[10px] uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === tab ? 'bg-pink-500/10 border-pink-500 text-pink-400 shadow-[0_0_30px_rgba(236,72,153,0.2)] scale-105' : 'border-white/5 bg-white/[0.02] text-gray-500 hover:border-white/10 hover:bg-white/[0.04]'}`}
             >
               {tab} Cases
             </button>
           ))}

           <div className="p-8 bg-white/[0.03] rounded-3xl border border-white/10 backdrop-blur-2xl mt-8">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase mb-4 flex items-center gap-2">
                <Scale size={14} className="text-pink-400" /> Mediation Principles
              </h3>
              <ul className="space-y-4 text-[10px] text-gray-500 font-medium">
                 <li>• RESTORATIVE OVER PUNITIVE</li>
                 <li>• TRANSPARENT REASONING</li>
                 <li>• VOLUNTARY PARTICIPATION</li>
                 <li>• LEGITIMATE OUTCOMES</li>
              </ul>
           </div>
        </div>

        {/* Case Feed */}
        <div className="lg:col-span-6 space-y-6">
           {mockCases.map(c => (
             <div key={c.id} className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 hover:border-pink-500/50 transition-all duration-500 cursor-pointer group hover:bg-white/[0.05] shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-black rounded border border-white/5">
                        <ShieldAlert size={16} className="text-pink-500" />
                      </div>
                      <div>
                         <h3 className="text-lg font-bold group-hover:text-pink-400 transition">{c.title}</h3>
                         <span className="text-[10px] text-gray-600 font-bold uppercase">{c.type} dispute • {c.parties} parties</span>
                      </div>
                   </div>
                   <span className="text-[9px] px-2 py-1 bg-black/50 border border-pink-500/30 text-pink-400 rounded-full font-bold uppercase">
                      {c.status}
                   </span>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed mb-6">
                  Ongoing deliberation regarding the fair distribution of regional solar assets following the constitutional amendment v2.4.
                </p>

                <div className="flex gap-4">
                   <button className="flex-1 py-3 bg-black border border-gray-800 rounded-lg text-[10px] font-bold uppercase hover:bg-gray-800 transition flex items-center justify-center gap-2">
                      <MessageSquare size={12} /> View Dialogue
                   </button>
                   <button className="flex-1 py-3 bg-pink-600/20 text-pink-400 border border-pink-500/30 rounded-lg text-[10px] font-bold uppercase hover:bg-pink-600/40 transition">
                      Join Mediation
                   </button>
                </div>
             </div>
           ))}
        </div>

        {/* Accountability & Stats */}
        <div className="lg:col-span-3 space-y-6">
           <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
              <h3 className="text-[10px] font-bold text-white uppercase mb-6 tracking-widest">Resolution Health</h3>
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500">Repair Success Rate</span>
                       <span className="text-pink-400">82%</span>
                    </div>
                    <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                       <div className="h-full bg-pink-500" style={{ width: '82%' }}></div>
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase mb-2">
                       <span className="text-gray-500">Average Duration</span>
                       <span className="text-pink-400">4.2 Days</span>
                    </div>
                    <div className="h-1.5 w-full bg-black rounded-full overflow-hidden">
                       <div className="h-full bg-pink-500" style={{ width: '45%' }}></div>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-pink-900/10 border border-pink-500/20 p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-pink-400" size={20} />
                <h4 className="text-xs font-bold uppercase text-white">Trust Records</h4>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed italic">
                All mediation outcomes are recorded in the institutional ledger to ensure long-term accountability and constitutional adherence.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MediationSpace;
