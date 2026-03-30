// src/App.tsx
import { StatusBar } from 'expo-status-bar'
import { View } from 'react-native'
import { HaloDemoScreen } from './screens/HaloDemoScreen'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <HaloDemoScreen />
      </View>
    </GestureHandlerRootView>
  )
}
