import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useAuth0 } from '@auth0/auth0-react';

const API_BASE = import.meta.env.VITE_BACKEND_URL;

export const useEcosystemData = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const updateGraph = useAppStore((state) => state.updateGraph);

  const fetchData = async () => {
    let token = null;
    if (isAuthenticated) {
      try {
        token = await getAccessTokenSilently();
      } catch (e) {
        console.warn("Public access only for ecosystem data.");
      }
    }

    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

    const fetchSafe = async (url) => {
      try {
        const res = await axios.get(url, config);
        return res.data;
      } catch (e) {
        console.error(`Failed to fetch ${url}:`, e);
        return [];
      }
    };

    const [tasks, projects, communitiesRaw, needs, resources] = await Promise.all([
      fetchSafe(`${API_BASE}/tasks`),
      fetchSafe(`${API_BASE}/projects`),
      fetchSafe(`${API_BASE}/communities`),
      fetchSafe(`${API_BASE}/needs`),
      fetchSafe(`${API_BASE}/resources/catalog`),
    ]);

    const communities = communitiesRaw?.communities || communitiesRaw || [];

    return { tasks, projects, communities, needs, resources };
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ecosystem-graph'],
    queryFn: fetchData,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    if (data) {
      const nodes = [];
      const links = [];

      // 1. Process Communities
      data.communities.forEach(c => {
        nodes.push({
          id: `community-${c.id}`,
          type: 'community',
          name: c.name,
          status: 'active',
          lastActivity: c.updated_at || c.created_at,
          location: c.location_point,
          raw: c
        });
      });

      // 2. Process Needs
      data.needs.forEach(n => {
        nodes.push({
          id: `need-${n.id}`,
          type: 'need',
          name: n.name,
          status: n.urgency_level || 'medium',
          lastActivity: n.updated_at || n.created_at,
          location: n.location_point,
          raw: n
        });
        if (n.requestor_community_id) {
          links.push({ source: `community-${n.requestor_community_id}`, target: `need-${n.id}`, type: 'HOSTS' });
        }
      });

      // 3. Process Projects
      data.projects.forEach(p => {
        nodes.push({
          id: `project-${p.id}`,
          type: 'project',
          name: p.name,
          status: 'active',
          lastActivity: p.updated_at || p.created_at,
          raw: p
        });

        // Find linked need
        const linkedNeed = data.needs.find(n => n.linked_project_id === p.id || n.project_id === p.id);
        if (linkedNeed) {
          links.push({ source: `need-${linkedNeed.id}`, target: `project-${p.id}`, type: 'SPAWNED' });
        } else if (p.community_id) {
          links.push({ source: `community-${p.community_id}`, target: `project-${p.id}`, type: 'MEMBER_OF' });
        }
      });

      // 4. Process Tasks
      data.tasks.forEach(t => {
        nodes.push({
          id: `task-${t.id}`,
          type: 'task',
          name: t.name,
          status: t.status,
          lastActivity: t.updated_at || t.created_at,
          raw: t
        });

        if (t.project_id) {
          links.push({ source: `project-${t.project_id}`, target: `task-${t.id}`, type: 'CONTRIBUTES_TO' });
        }

        if (t.dependencies && t.dependencies.length > 0) {
          t.dependencies.forEach(depId => {
            links.push({ source: `task-${depId}`, target: `task-${t.id}`, type: 'DEPENDS_ON' });
          });
        }
      });

      // 5. Process Resources
      data.resources.forEach(r => {
        nodes.push({
          id: `resource-${r.id}`,
          type: 'resource',
          name: r.name,
          status: r.status,
          lastActivity: r.updated_at || r.created_at,
          location: r.location_point,
          raw: r
        });

        if (r.owner_community_id) {
          links.push({ source: `community-${r.owner_community_id}`, target: `resource-${r.id}`, type: 'MEMBER_OF' });
        }
      });

      updateGraph(nodes, links);
    }
  }, [data, updateGraph]);

  return { isLoading, error, refetch };
};
