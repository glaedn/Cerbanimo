import React, { useMemo } from 'react';
import styled from '@emotion/styled';
import { useAppStore } from '../../../store/useAppStore';
import theme from '../../../styles/theme';
import { resolveEntityPath, getEntityIcon } from '../../../utils/entityResolver';
import {
  Rocket,
  AlertCircle,
  Package,
  Users,
  Layout,
  User,
  Circle,
  X,
  ExternalLink,
  Activity,
  Heart,
  GitBranch
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const InspectorContainer = styled.div`
  background: ${theme.tokens.colors.surface.overlay};
  backdrop-filter: blur(12px);
  border: 1px solid ${theme.tokens.colors.brand.primary};
  border-radius: ${theme.borders.borderRadiusMd};
  padding: ${theme.tokens.spacing.md};
  color: ${theme.tokens.colors.text.primary};
  width: 320px;
  max-height: 60vh;
  overflow-y: auto;
  box-shadow: ${theme.tokens.glow.primary};
  display: flex;
  flex-direction: column;
  gap: ${theme.tokens.spacing.md};
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: ${theme.tokens.spacing.sm};
  right: ${theme.tokens.spacing.sm};
  background: none;
  border: none;
  color: ${theme.tokens.colors.text.muted};
  cursor: pointer;
  &:hover { color: ${theme.tokens.colors.brand.secondary}; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.tokens.spacing.sm};
`;

const IconWrapper = styled.div`
  color: ${theme.tokens.colors.brand.primary};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h3`
  margin: 0;
  font-family: ${theme.typography.fontFamilyAccent};
  font-size: ${theme.typography.fontSizeLg};
  color: ${theme.tokens.colors.brand.primary};
  text-transform: uppercase;
`;

const Section = styled.div`
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: ${theme.tokens.spacing.sm};
`;

const SectionTitle = styled.h4`
  margin: 0 0 ${theme.tokens.spacing.xs} 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: ${theme.tokens.colors.text.muted};
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const RelationshipList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const RelationshipItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: rgba(0, 243, 255, 0.1); }
`;

const StatusBadge = styled.span`
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  background: ${props => props.color || theme.tokens.colors.brand.primary};
  color: #000;
  font-weight: bold;
`;

const ActionButton = styled.button`
  background: ${theme.tokens.colors.brand.primary};
  color: #000;
  border: none;
  border-radius: 4px;
  padding: 8px;
  font-family: ${theme.typography.fontFamilyAccent};
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: ${theme.tokens.spacing.sm};
  &:hover { box-shadow: ${theme.tokens.glow.primary}; }
`;

const iconMap = {
  Rocket, AlertCircle, Package, Users, Layout, User, Circle
};

const EntityInspector = () => {
  const selectedEntity = useAppStore(state => state.selectedEntity);
  const selectEntity = useAppStore(state => state.selectEntity);
  const relationships = useAppStore(state => state.relationships);
  const entities = useAppStore(state => state.entities);
  const navigate = useNavigate();

  const entity = selectedEntity;

  const connectedRelationships = useMemo(() => {
    if (!entity) return [];
    return relationships.filter(r => r.source === entity.id || r.target === entity.id);
  }, [entity, relationships]);

  if (!entity) return null;

  const IconComponent = iconMap[getEntityIcon(entity.type)] || Circle;

  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('urgent') || s.includes('critical')) return theme.tokens.colors.status.urgency.critical;
    if (s.includes('active')) return theme.tokens.colors.brand.accent;
    return theme.tokens.colors.text.muted;
  };

  const handleNavigate = () => {
    const [type, id] = entity.id.split('-');
    const path = resolveEntityPath(type, id);
    navigate(path);
  };

  return (
    <InspectorContainer className="entity-inspector">
      <CloseButton onClick={() => selectEntity(null)}><X size={18} /></CloseButton>

      <Header>
        <IconWrapper><IconComponent size={24} /></IconWrapper>
        <Title>{entity.name}</Title>
      </Header>

      <Section>
        <SectionTitle><Activity size={12} /> Status</SectionTitle>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusBadge color={getStatusColor(entity.status)}>{entity.status?.toUpperCase()}</StatusBadge>
          <span style={{ fontSize: '0.8rem', color: theme.tokens.colors.text.muted }}>
            Active: {new Date(entity.lastActivity).toLocaleDateString()}
          </span>
        </div>
      </Section>

      {entity.raw?.description && (
        <Section>
          <SectionTitle>Description</SectionTitle>
          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{entity.raw.description}</p>
        </Section>
      )}

      <Section>
        <SectionTitle><GitBranch size={12} /> Relationships</SectionTitle>
        <RelationshipList>
          {connectedRelationships.length > 0 ? connectedRelationships.map((rel, idx) => {
            const otherId = rel.source === entity.id ? rel.target : rel.source;
            const otherEntity = entities[otherId];
            if (!otherEntity) return null;

            return (
              <RelationshipItem key={idx} onClick={() => selectEntity(otherEntity)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.7rem', color: theme.tokens.colors.brand.secondary }}>{rel.type}</span>
                  <span style={{ fontSize: '0.8rem' }}>{otherEntity.name}</span>
                </div>
                <StatusBadge color={getStatusColor(otherEntity.status)} style={{ fontSize: '0.6rem' }}>
                  {otherEntity.type.charAt(0).toUpperCase()}
                </StatusBadge>
              </RelationshipItem>
            );
          }) : <p style={{ fontSize: '0.8rem', fontStyle: 'italic', color: theme.tokens.colors.text.muted }}>No direct links found.</p>}
        </RelationshipList>
      </Section>

      <ActionButton onClick={handleNavigate}>
        EXPLORE FULL RECORD <ExternalLink size={16} />
      </ActionButton>
    </InspectorContainer>
  );
};

export default EntityInspector;
