// Halo.tsx
import { View, Text, StyleSheet } from 'react-native'
import { HaloArcSlice } from './HaloSlice'
import { HALO_COLORS } from './haloColors'

type HaloProps = {
  label: string
  radius?: number
  thickness?: number
  slices?: number
}

export function Halo({
  label,
  radius = 120,
  thickness = 20,
  slices = 36,
}: HaloProps) {
  const angleStep = 360 / slices

  return (
    <View style={[styles.container, { width: radius * 2 + thickness, height: radius * 2 + thickness }]}>
      {/* Halo slices */}
      {Array.from({ length: slices }).map((_, i) => (
        <HaloArcSlice
          key={i}
          color={HALO_COLORS[i % HALO_COLORS.length]}
          rotate={i * angleStep}
          radius={radius}
          thickness={thickness}
        />
      ))}

      {/* Label */}
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    position: 'absolute',
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
