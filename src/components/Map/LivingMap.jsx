import React, { useMemo, useCallback } from 'react';
import Map, { NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, IconLayer, PathLayer, PolygonLayer, LineLayer } from '@deck.gl/layers';
import { HexagonLayer, HeatmapLayer } from '@deck.gl/aggregation-layers';
import { useAppStore } from '../../store/useAppStore';
import 'maplibre-gl/dist/maplibre-gl.css';

const LivingMap = () => {
  const {
    mapState,
    setMapState,
    entities,
    relationships,
    activeOverlays,
    selectedEntity,
    selectEntity,
    isCrisisMode
  } = useAppStore();

  const onViewStateChange = useCallback(({ viewState }) => {
    setMapState(viewState);
  }, [setMapState]);

  const nodes = useMemo(() => Object.values(entities), [entities]);

  const spatialEntities = useMemo(() => {
    return nodes.filter(n => n.location && n.location.x !== undefined);
  }, [nodes]);

  const constellationData = useMemo(() => {
    if (!selectedEntity || selectedEntity.type !== 'community') return { nodes: [], links: [] };

    const communityNode = entities[selectedEntity.id];
    if (!communityNode || !communityNode.location) return { nodes: [], links: [] };

    const relatedLinks = (relationships || []).filter(r =>
      r.source === selectedEntity.id || r.target === selectedEntity.id
    );

    const relatedNodes = [];
    const constellationLinks = [];

    relatedLinks.forEach((rel, index) => {
      const otherId = rel.source === selectedEntity.id ? rel.target : rel.source;
      const otherNode = entities[otherId];
      if (otherNode) {
        let pos;
        if (otherNode.location && otherNode.location.x !== undefined) {
          pos = [otherNode.location.x, otherNode.location.y];
        } else {
          // Calculate virtual position in a circle for non-spatial nodes
          const angle = (index / relatedLinks.length) * 2 * Math.PI;
          const radius = 0.003; // ~300m in degree-ish units
          pos = [
            communityNode.location.x + radius * Math.cos(angle),
            communityNode.location.y + radius * Math.sin(angle)
          ];
        }

        relatedNodes.push({
          ...otherNode,
          virtualLocation: pos,
          isVirtual: !otherNode.location || otherNode.location.x === undefined
        });

        constellationLinks.push({
          source: [communityNode.location.x, communityNode.location.y],
          target: pos,
          type: rel.type
        });
      }
    });

    return { nodes: relatedNodes, links: constellationLinks };
  }, [selectedEntity, entities, relationships]);

  const layers = [
    // 0. Constellation Layer (Connections)
    selectedEntity?.type === 'community' && new LineLayer({
      id: 'constellation-links',
      data: constellationData.links,
      getSourcePosition: d => d.source,
      getTargetPosition: d => d.target,
      getColor: [0, 243, 255, 180],
      getWidth: 2,
      pickable: false
    }),

    // 0.1 Constellation Nodes
    selectedEntity?.type === 'community' && new ScatterplotLayer({
      id: 'constellation-nodes',
      data: constellationData.nodes,
      getPosition: d => d.virtualLocation,
      getFillColor: d => {
          if (d.type === 'need') return [255, 165, 0];
          if (d.type === 'resource') return [0, 255, 255];
          if (d.type === 'project') return [0, 255, 128];
          return [255, 255, 255];
      },
      getRadius: d => (d.isVirtual ? 25 : 40),
      getLineWidth: 2,
      stroked: true,
      getLineColor: [255, 255, 255, 200],
      pickable: true,
      onClick: ({ object }) => selectEntity(object)
    }),

    // 1. Need Layer (Hexagon for density, Scatterplot for individual focus)
    spatialEntities.filter(n => n.type === 'need').length > 0 && new HexagonLayer({
      id: 'need-density',
      data: spatialEntities.filter(n => n.type === 'need'),
      getPosition: d => [d.location.x, d.location.y],
      radius: 200,
      elevationScale: 4,
      extruded: true,
      visible: activeOverlays.includes('crisis') || !activeOverlays.length,
      pickable: true
    }),

    spatialEntities.filter(n => n.type === 'need').length > 0 && new ScatterplotLayer({
      id: 'needs-individual',
      data: spatialEntities.filter(n => n.type === 'need'),
      getPosition: d => [d.location.x, d.location.y],
      getFillColor: d => d.status === 'critical' ? [255, 0, 0] : [255, 165, 0],
      getRadius: d => (selectedEntity?.id === d.id ? 50 : 30),
      pickable: true,
      onClick: ({ object }) => selectEntity(object)
    }),

    // 2. Resource Layer
    spatialEntities.filter(n => n.type === 'resource').length > 0 && new ScatterplotLayer({
      id: 'resources',
      data: spatialEntities.filter(n => n.type === 'resource'),
      getPosition: d => [d.location.x, d.location.y],
      getFillColor: [0, 255, 255],
      getRadius: 25,
      pickable: true,
      visible: activeOverlays.includes('resource') || !activeOverlays.length,
      onClick: ({ object }) => selectEntity(object)
    }),

    // 3. Community Layer
    spatialEntities.filter(n => n.type === 'community').length > 0 && new ScatterplotLayer({
      id: 'communities',
      data: spatialEntities.filter(n => n.type === 'community'),
      getPosition: d => [d.location.x, d.location.y],
      getFillColor: d => selectedEntity?.id === d.id ? [0, 243, 255] : [128, 0, 255],
      getRadius: d => selectedEntity?.id === d.id ? 150 : 100,
      pickable: true,
      stroked: true,
      getLineColor: [255, 255, 255, 200],
      getLineWidth: d => selectedEntity?.id === d.id ? 5 : 0,
      onClick: ({ object }) => selectEntity(object)
    }),

    // 4. Volunteer Layer (Heatmap)
    spatialEntities.filter(n => n.type === 'user').length > 0 && new HeatmapLayer({
      id: 'volunteer-density',
      data: spatialEntities.filter(n => n.type === 'user'),
      getPosition: d => [d.location.x, d.location.y],
      getWeight: 1,
      radiusPixels: 60,
      visible: activeOverlays.includes('logistics'),
      aggregation: 'SUM'
    }),

    // 5. Mission / Dispatch Layer (Placeholder paths)
    new PathLayer({
        id: 'dispatch-routes',
        data: [], // To be populated from SpatialDataService
        getPath: d => d.path,
        getColor: [0, 243, 255],
        getWidth: 3,
        pickable: true,
        visible: activeOverlays.includes('logistics')
    })
  ].filter(Boolean);

  return (
    <div className="living-map-container" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <DeckGL
        initialViewState={mapState}
        onViewStateChange={onViewStateChange}
        controller={{
            touchRotate: true,
            dragPan: true,
            doubleClickZoom: true,
            touchZoom: true
        }}
        layers={layers}
        getTooltip={({ object }) => {
          if (!object) return null;
          let locationInfo = '';
          if (object.city || object.state || object.country) {
            locationInfo = `\nLocation: ${[object.city, object.state, object.country].filter(Boolean).join(', ')}`;
          }
          return `${object.name} (${object.type})${locationInfo}`;
        }}
      >
        <Map
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
          reuseMaps
        >
          <NavigationControl position="top-left" />
          <FullscreenControl position="top-left" />
        </Map>
      </DeckGL>

      {isCrisisMode && (
        <div className="crisis-hud-overlay" style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            border: '2px solid rgba(255, 0, 0, 0.3)',
            boxShadow: 'inset 0 0 100px rgba(255,0,0,0.1)',
            zIndex: 10
        }} />
      )}
    </div>
  );
};

export default LivingMap;
