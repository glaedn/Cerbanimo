import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Animated, Easing } from 'react-native'

type HaloSliceProps = {
  item: {
    title: string
    description: string
    tasks: string[]
    contributors: string[]
  }
  angle: number
  radius: number
  width: number
  height: number
  isCenter: boolean
  color: string
  opacity?: number
  scale?: number
  zIndex?: number
}

export const HaloSlice = ({
  item,
  angle,
  radius,
  width,
  height,
  isCenter,
  color,
  opacity = 1,
  scale = 1,
  zIndex = 1,
}: HaloSliceProps) => {
  const rad = (angle * Math.PI) / 180
  const x = radius * Math.sin(rad)
  const y = radius * 0.1 * Math.cos(rad) // halo bend

  const trayAnim = React.useRef(new Animated.Value(isCenter ? 1 : 0)).current
  const maxTrayHeight = 120

  useEffect(() => {
    Animated.timing(trayAnim, {
      toValue: isCenter ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [isCenter])

  // Interpolate tray properties
  const trayHeight = trayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, maxTrayHeight] })
  const trayTranslateY = trayAnim.interpolate({ inputRange: [0, 1], outputRange: [-maxTrayHeight / 2, 0] })
  const trayOpacity = trayAnim.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 0, 1] })
  const trayWidth = trayAnim.interpolate({ inputRange: [0, 1], outputRange: [width * 0.7, width] })

  return (
    <View
      style={{
        position: 'absolute',
        left: radius + x - width / 2,
        top: radius + y - height / 2,
        width,
        height: height + maxTrayHeight,
        alignItems: 'center',
        zIndex,
      }}
    >
      {/* Description tray behind slice */}
      <Animated.View
        style={[
          styles.descriptionContainer,
          {
            width: trayWidth,
            height: trayHeight,
            transform: [{ translateY: trayTranslateY }],
            opacity: trayOpacity,
            backgroundColor: color + 'bb',
          },
        ]}
      >
        <View style={{ flex: 1, paddingTop: 6 }}>
          <Text style={styles.descriptionText}>{item.description}</Text>
          <Text style={styles.subHeader}>Tasks:</Text>
          {item.tasks.map((t) => (
            <Text key={t} style={styles.taskText}>
              • {t}
            </Text>
          ))}
          <Text style={styles.subHeader}>Contributors:</Text>
          {item.contributors.map((c) => (
            <Text key={c} style={styles.taskText}>
              • {c}
            </Text>
          ))}
        </View>
      </Animated.View>

      {/* Slice itself */}
      <Animated.View
        style={[
          styles.slice,
          {
            width,
            height,
            borderRadius: height / 2,
            backgroundColor: color,
            opacity,
            transform: [{ scale }],
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 12,
            elevation: 10,
          },
        ]}
      >
        <Text style={styles.title}>{item.title}</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  slice: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  title: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  descriptionContainer: {
    position: 'absolute',
    bottom: 0, // dock behind slice
    left: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'white',
    padding: 6,
    overflow: 'hidden',
  },
  descriptionText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  subHeader: {
    color: '#00f3ff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  taskText: {
    color: 'white',
    fontSize: 12,
  },
})
