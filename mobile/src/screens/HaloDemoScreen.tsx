import { View, Text } from 'react-native'
import { Halo } from '../components/halo/Halo'

const demoItems = [
  { title: 'Native Gardening' },
  { title: 'Project Return to Nature' },
  { title: 'Creative Commons KCMO' },
]

export function HaloDemoScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
      }}
    >
      <Halo
        items={demoItems}
        renderItem={(item, meta) => (
          <View
            style={{
              padding: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: meta.color,
              backgroundColor: '#111',
            }}
          >
            <Text style={{ color: meta.color, fontSize: 16 }}>
              {item.title}
            </Text>
          </View>
        )}
      />
    </View>
  )
}
