// HaloArc.tsx
import { Skia, Canvas, Path, Paint, useValue } from '@shopify/react-native-skia'
import { View, StyleSheet } from 'react-native'

type HaloArcProps = {
  color: string
  opacity: number
  radius?: number
  thickness?: number
  startAngle?: number
  endAngle?: number
}

export function HaloArc({
  color,
  opacity,
  radius = 120,
  thickness = 20,
  startAngle = -120,
  endAngle = 120,
}: HaloArcProps) {
  const path = Skia.Path.Make()
  path.addArc(
    { x: 0, y: 0, width: radius * 2, height: radius * 2 },
    startAngle,
    endAngle - startAngle
  )

  const paint = Skia.Paint()
  paint.setColor(Skia.Color(color))
  paint.setAntiAlias(true)
  paint.setStyle('stroke')
  paint.setStrokeWidth(thickness)
  paint.setStrokeCap('round')
  paint.setAlphaf(Math.floor(opacity * 255))

  return (
    <View style={styles.container}>
      <Canvas style={{ width: radius * 2 + thickness, height: radius * 2 + thickness }}>
        <Path path={path} paint={paint} />
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
