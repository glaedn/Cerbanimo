import * as d3 from "d3";

export function createSpiralPathReversed(x, y, armIndex) {
  const spiral = d3.line()
    .curve(d3.curveCardinal)
    .x(d => x + d[0])
    .y(d => y + d[1]);
  const points = [];
  const startRadius = 42;
  const endRadius = 125;
  const numPoints = 20;
  for (let i = 0; i < numPoints; i++) {
    const angle = -i * 0.2 + armIndex * Math.PI / 3;
    const radius = startRadius + i * (endRadius - startRadius) / numPoints;
    points.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }
  return spiral(points);
}

export function strokeWidth(index, totalPoints) {
  const startWidth = 3;
  const endWidth = 1;
  return startWidth - ((startWidth - endWidth) * (index / totalPoints));
}