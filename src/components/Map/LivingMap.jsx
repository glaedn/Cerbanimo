import React, { useMemo, useCallback } from 'react';
import Map, { NavigationControl, FullscreenControl } from 'react-map-gl/maplibre';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, IconLayer, PathLayer, PolygonLayer } from '@deck.gl/layers';
import { HexagonLayer, HeatmapLayer } from '@deck.gl/aggregation-layers';
import { useAppStore } from '../../store/useAppStore';
import 'maplibre-gl/dist/maplibre-gl.css';

const LivingMap = () => {
  const {
    mapState,
    setMapState,
    entities,
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

  const layers = [
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

    // 3. Volunteer Layer (Heatmap)
    spatialEntities.filter(n => n.type === 'user').length > 0 && new HeatmapLayer({
      id: 'volunteer-density',
      data: spatialEntities.filter(n => n.type === 'user'),
      getPosition: d => [d.location.x, d.location.y],
      getWeight: 1,
      radiusPixels: 60,
      visible: activeOverlays.includes('logistics'),
      aggregation: 'SUM'
    }),

    // 4. Mission / Dispatch Layer (Placeholder paths)
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
        getTooltip={({ object }) => object && `${object.name} (${object.type})`}
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
