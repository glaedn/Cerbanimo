/* eslint-disable react/prop-types */
import "./SpaceShell.css";

const starSeeds = [
  [8, 12, 0.7, 1.1], [16, 48, 0.45, 2.7], [24, 24, 0.8, 1.9], [32, 72, 0.5, 3.1],
  [41, 16, 0.65, 1.5], [52, 42, 0.42, 2.1], [64, 18, 0.74, 2.9], [74, 66, 0.5, 1.2],
  [86, 28, 0.78, 2.4], [94, 74, 0.45, 3.4], [12, 82, 0.55, 2.2], [27, 91, 0.36, 1.8],
  [47, 84, 0.62, 3.3], [69, 88, 0.52, 2.6], [83, 9, 0.42, 1.4], [6, 37, 0.5, 3.7],
  [37, 8, 0.38, 2.5], [58, 70, 0.7, 1.7], [78, 47, 0.34, 2.9], [91, 52, 0.58, 2.0],
];

export default function SpaceShell({ children }) {
  return (
    <div className="space-shell">
      <div className="space-backdrop" aria-hidden="true">
        <div className="space-nebula space-nebula-a" />
        <div className="space-nebula space-nebula-b" />
        <div className="space-orbit-line space-orbit-line-a" />
        <div className="space-orbit-line space-orbit-line-b" />
        <div className="space-comet" />
        <div className="space-stars">
          {starSeeds.map(([left, top, scale, delay], index) => (
            <span
              key={index}
              className="space-star"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                "--star-scale": scale,
                "--star-delay": `${delay}s`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="space-scanlines" aria-hidden="true" />
      <div className="space-shell-content">{children}</div>
    </div>
  );
}
