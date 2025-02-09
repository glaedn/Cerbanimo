import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(ColorPaletteApp());
}

final List<List<String>> initialStoredColors = List.generate(
  4, // 4 rounds
  (_) => List.generate(4, (_) => ""), // 4 picks, initialized to empty strings
);

class ColorPaletteApp extends StatelessWidget {
  const ColorPaletteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '9+1 to Decide',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: HomeScreen(),
    );
  }
}
