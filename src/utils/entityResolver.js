/**
 * Entity Resolver Utility
 * Standardizes navigation and data resolution for the Unified World Graph.
 */

const ENTITY_TYPES = {
  MISSION: 'mission',
  NEED: 'need',
  RESOURCE: 'resource',
  COMMUNITY: 'community',
  PROJECT: 'project',
  TASK: 'task',
  USER: 'user',
  DISPATCH: 'dispatch',
  GOVERNANCE: 'governance',
  AGENT: 'agent'
};

const ENTITY_NAV_PATHS = {
  [ENTITY_TYPES.MISSION]: (id) => `/Visualizer/${id}`,
  [ENTITY_TYPES.NEED]: (id) => `/needs/${id}`,
  [ENTITY_TYPES.RESOURCE]: (id) => `/resources-inventory?id=${id}`,
  [ENTITY_TYPES.COMMUNITY]: (id) => `/communityhub/${id}`,
  [ENTITY_TYPES.PROJECT]: (id) => `/project/${id}`,
  [ENTITY_TYPES.TASK]: (id) => `/Visualizer/${id}`, // Assuming tasks resolved via Visualizer
  [ENTITY_TYPES.USER]: (id) => `/userportfolio/${id}`,
  [ENTITY_TYPES.DISPATCH]: (id) => `/coordinator-hud?dispatch=${id}`,
  [ENTITY_TYPES.GOVERNANCE]: (id) => `/civic-kernel?proposal=${id}`,
  [ENTITY_TYPES.AGENT]: (id) => `/coordinator-hud?agent=${id}`
};

export const resolveEntityPath = (type, id) => {
  const resolver = ENTITY_NAV_PATHS[type.toLowerCase()];
  return resolver ? resolver(id) : '/dashboard';
};

export const getEntityIcon = (type) => {
  // Mapping logic for standard icons based on entity type
  switch (type.toLowerCase()) {
    case ENTITY_TYPES.MISSION: return 'Rocket';
    case ENTITY_TYPES.NEED: return 'AlertCircle';
    case ENTITY_TYPES.RESOURCE: return 'Package';
    case ENTITY_TYPES.COMMUNITY: return 'Users';
    case ENTITY_TYPES.PROJECT: return 'Layout';
    case ENTITY_TYPES.USER: return 'User';
    default: return 'Circle';
  }
};

export const resolveRelationship = (entity, relationshipType) => {
  // Logic to extract specific relationships from the normalized graph cache
  // To be expanded as the graph cache matures
  return entity.relationships?.filter(rel => rel.type === relationshipType) || [];
};
