import React from 'react';
import { useGovernanceStore } from '../../store/useGovernanceStore';
import { AlertTriangle, Users, Target, Activity, ShieldCheck, Zap } from 'lucide-react';
import * as S from './GovernanceStyles';

const ProposalCard = ({ proposal, onVote }) => {
  const { payload, proposal_type, title, description, status, id } = proposal;

  const getStatusColor = () => {
    switch (status) {
      case 'deliberation': return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      case 'voting': return 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
      case 'passed': return 'text-green-400 border-green-500/30 bg-green-500/10';
      case 'executed': return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
      case 'rejected': return 'text-red-400 border-red-500/30 bg-red-500/10';
      default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getTypeIcon = () => {
    switch (proposal_type) {
      case 'constitution': return <ShieldCheck size={14} />;
      case 'operational': return <Zap size={14} />;
      case 'resource': return <Target size={14} />;
      case 'social': return <Users size={14} />;
      default: return <Activity size={14} />;
    }
  };

  return (
    <div className={`proposal-card border rounded-2xl p-6 mb-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl backdrop-blur-md ${getStatusColor()}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded bg-black/40 text-cyan-400">
            {getTypeIcon()}
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-70">{proposal_type}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest">{status}</span>
      </div>

      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all">{description}</p>

      {/* Impact Indicators */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
          <div className="text-[9px] text-gray-500 font-bold uppercase mb-1 tracking-widest">Ecosystem Impact</div>
          <div className="text-xs text-cyan-400 font-bold">
            {payload?.impact || "Moderate systemic change"}
          </div>
        </div>
        <div className="bg-black/40 p-3 rounded-xl border border-white/5">
          <div className="text-[9px] text-gray-500 font-bold uppercase mb-1 flex items-center gap-1">
            <AlertTriangle size={10} className="text-orange-500" /> Risk Level
          </div>
          <div className="text-xs text-orange-400 font-medium">
            {payload?.risk || "Low institutional friction"}
          </div>
        </div>
      </div>

      {/* Intent Section */}
      {payload?.intent && (
        <div className="mb-4 text-xs italic text-gray-500 border-l-2 border-cyan-500/30 pl-3">
          "Intent: {payload.intent}"
        </div>
      )}

      {/* Action Area */}
      {(status === 'deliberation' || status === 'voting') && (
        <div className="flex gap-4 mt-4 pt-4 border-t border-white/5">
          <S.NeonButton
            onClick={() => onVote(id, true)}
            className="flex-1"
          >
            Support
          </S.NeonButton>
          <S.NeonButton
            onClick={() => onVote(id, false)}
            color="red"
            className="flex-1"
          >
            Oppose
          </S.NeonButton>
        </div>
      )}

      <div className="mt-3 flex justify-between items-center text-[10px] text-gray-600 font-bold uppercase">
         <span>Created by: Participant {proposal.created_by}</span>
         <span>{new Date(proposal.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default ProposalCard;
