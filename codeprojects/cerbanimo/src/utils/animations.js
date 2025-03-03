import * as d3 from "d3";

export function rotateElement(element, duration = 100000, rotationSpeed = 360) {
  d3.select(element).transition()
    .duration(duration)
    .ease(d3.easeLinear)
    .attrTween("transform", function() {
      const currentTransform = d3.select(this).attr("transform") || "rotate(0)";
      const currentRotation = (currentTransform.match(/rotate\(([-+]?\d*\.?\d+)\)/) || [0, 0])[1];
      const startAngle = parseFloat(currentRotation) || 0;
      return (t) => `rotate(${startAngle + t * rotationSpeed})`;
    })
    .on("end", function() {
      rotateElement(this, duration, rotationSpeed);
    });
}