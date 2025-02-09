import 'package:flutter/material.dart';
import 'selection_screen.dart'; // Import for color selection
import 'food_selection_screen.dart'; // Import for food selection

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _selectedOption = 'colors'; // Default option is colors

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('9 + 1 Choices', style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blueAccent,
      ),
      body: Center(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              'Choose Your Activity',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 20),
            ToggleButtons(
              isSelected: [_selectedOption == 'colors', _selectedOption == 'foods'],
              onPressed: (index) {
                setState(() {
                  _selectedOption = index == 0 ? 'colors' : 'foods';
                });
              },
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text('Colors'),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Text('Foods'),
                ),
              ],
            ),
            SizedBox(height: 40),
            ElevatedButton(
              onPressed: () {
                if (_selectedOption == 'colors') {
                  // Start color selection without needing storedColors
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (context) => SelectionScreen(
                        updateSelectedColors: (colors) {},
                        storedColors: List.generate(4, (_) => List.filled(4, '')),
                        currentRound: 1,
                        currentPick: 1,
                      ),
                    ),
                  );
                } else if (_selectedOption == 'foods') {
                  // Start food selection
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (context) => FoodSelectionScreen(currentRound: 1, storedSelections: []),
                    ),
                  );
                }
              },
              child: Text('Start'),
            ),
          ],
        ),
      ),
    );
  }
}
