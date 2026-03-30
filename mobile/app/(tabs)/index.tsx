// src/screens/HaloDemoScreen.tsx
import React from 'react'
import { View } from 'react-native'
import { HaloOrbit } from '../../src/components/halo/HaloOrbit'

export const demoItems = [
  {
    title: 'Native Gardening',
    description:
      'Learn and practice sustainable gardening techniques for local plants and pollinators. Centered view shows relevant plots and tasks.',
    tasks: ['Cultivate plot 13', 'Harvest plot 5', 'Plant plot 1'],
    contributors: ['GrovaNo', 'SelenaKyle', 'CeraPaling'],
  },
  {
    title: 'Project Return to Nature',
    description:
      'Restoring local forests and natural habitats. Centered view shows active planting projects and volunteer opportunities.',
    tasks: ['Plant native trees', 'Create compost area', 'Monitor wildlife'],
    contributors: ['EcoRanger', 'ForestLover', 'WildWatcher'],
  },
  {
    title: 'Creative Commons KCMO',
    description:
      'Collaborative arts and open-source media projects in Kansas City. Centered view shows projects to approve and members to invite.',
    tasks: ['Open gallery exhibit', 'Host music jam', 'Digital archive upload'],
    contributors: ['ArtsyAmy', 'PixelPete', 'CCCrew'],
  },
  {
    title: 'Urban Beekeeping',
    description:
      'Support city pollinators and sustainable honey harvesting. Centered view shows hive management tasks and community contributors.',
    tasks: ['Inspect hive 4', 'Harvest honey', 'Plant pollinator-friendly flowers'],
    contributors: ['BeeKeeperBob', 'HoneySue', 'PollenPat'],
  },
  {
    title: 'Community Compost',
    description:
      'Neighborhood composting initiative to reduce waste. Centered view shows collection schedules and volunteer contributors.',
    tasks: ['Collect organic waste', 'Maintain compost bins', 'Distribute compost'],
    contributors: ['GreenGreg', 'EcoEllie', 'WasteNotWendy'],
  },
]


export default function HaloDemoScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
      <HaloOrbit items={demoItems} radius={150} thickness={30} verticalCurve={50} />
    </View>
  )
}
