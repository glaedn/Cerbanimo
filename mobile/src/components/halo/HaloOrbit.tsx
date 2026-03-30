import React, { useRef, useState } from 'react'
import { View, StyleSheet, PanResponder, Animated } from 'react-native'
import { HaloSlice } from './HaloSlice'
import { HALO_COLORS } from './haloColors'

type HaloOrbitProps = {
  items: any[]
  radius?: number
  width?: number
  height?: number
}

export const HaloOrbit = ({ items, radius = 180, width = 140, height = 50 }: HaloOrbitProps) => {
  const rotation = useRef(new Animated.Value(0)).current
  const rotationRef = useRef(0)
  const sliceAngle = 360 / items.length
  const SNAP_SPEED = 200
  const [centerIndex, setCenterIndex] = useState(0)

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        rotation.setValue(rotationRef.current + gestureState.dx * 0.3)
      },
      onPanResponderRelease: (_, gestureState) => {
        rotationRef.current += gestureState.dx * 0.3
        const nearestIndex = Math.round(-rotationRef.current / sliceAngle)
        const targetRotation = -nearestIndex * sliceAngle

        Animated.timing(rotation, {
          toValue: targetRotation,
          duration: SNAP_SPEED,
          useNativeDriver: true,
        }).start(() => {
          rotationRef.current = targetRotation
          setCenterIndex(((nearestIndex % items.length) + items.length) % items.length)
        })
      },
    })
  ).current

  return (
    <View style={[styles.container, { width: radius * 2, height: radius * 2 }]} {...panResponder.panHandlers}>
      {items.map((item, i) => {
        // Calculate distance from center to adjust halo effect
        let distance = ((i - centerIndex + items.length) % items.length)
        if (distance > items.length / 2) distance -= items.length

        const opacity = 1 - Math.min(Math.abs(distance) * 0.25, 0.8)
        const scale = 1 - Math.min(Math.abs(distance) * 0.08, 0.3)
        const zIndex = -Math.abs(distance) + items.length // center slice in front

        return (
          <AnimatedHaloSlice
            key={i}
            item={item}
            angle={i * sliceAngle}
            radius={radius}
            width={width}
            height={height}
            color={HALO_COLORS[i % HALO_COLORS.length]}
            isCenter={i === centerIndex}
            rotation={rotation}
            opacity={opacity}
            scale={scale}
            zIndex={zIndex}
          />
        )
      })}
    </View>
  )
}

type AnimatedHaloSliceProps = React.ComponentProps<typeof HaloSlice> & {
  rotation: Animated.Value
  opacity: number
  scale: number
  zIndex: number
}

function AnimatedHaloSlice({ rotation, angle, ...rest }: AnimatedHaloSliceProps) {
  const [currentAngle, setCurrentAngle] = useState(angle)
  React.useEffect(() => {
    const id = rotation.addListener(({ value }) => setCurrentAngle(value + angle))
    return () => rotation.removeListener(id)
  }, [rotation, angle])

  return <HaloSlice {...rest} angle={currentAngle} />
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    userSelect: 'none',
  },
})
