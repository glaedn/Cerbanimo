import React from 'react';
import { useParams } from 'react-router-dom';
import DelegationMap from '../components/Governance/DelegationMap';
import { Shield } from 'lucide-react';
import * as S from '../components/Governance/GovernanceStyles';

const DelegationMapPage = () => {
  const { communityId } = useParams();

  return (
    <S.PageContainer>
      <S.Header>
        <S.TitleBlock>
          <S.Title>
            <Shield size={32} /> Expertise Routing
          </S.Title>
          <S.Subtitle>Institutional Trust Topology | Community: {communityId}</S.Subtitle>
        </S.TitleBlock>
      </S.Header>

      <div className="max-w-7xl mx-auto">
        <DelegationMap communityId={communityId} />
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
         <S.GlassPanel>
            <S.SectionLabel>Dynamic Delegation</S.SectionLabel>
            <p className="text-xs text-gray-400 leading-relaxed italic">
              Cerbanimo uses a liquid authority model. You can route your voting power to subject matter experts based on specific domains like logistics or treasury.
            </p>
         </S.GlassPanel>
         <S.GlassPanel>
            <S.SectionLabel>Domain Specificity</S.SectionLabel>
            <p className="text-xs text-gray-400 leading-relaxed italic">
              Delegation is not all-or-nothing. You can trust one peer for resource management and another for constitutional interpretation.
            </p>
         </S.GlassPanel>
         <S.GlassPanel>
            <S.SectionLabel>Instant Revocation</S.SectionLabel>
            <p className="text-xs text-gray-400 leading-relaxed italic">
              All trust routes are revocable at any moment. If a delegate's actions drift from community intent, authority returns to the delegator instantly.
            </p>
         </S.GlassPanel>
      </div>
    </S.PageContainer>
  );
};

export default DelegationMapPage;
