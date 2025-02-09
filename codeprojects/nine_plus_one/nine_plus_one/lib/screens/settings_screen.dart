import 'package:flutter/material.dart';

class SettingsScreen extends StatefulWidget {
  final Function(int) setRounds;
  final Function(bool) toggleDarkMode;

  const SettingsScreen({super.key, required this.setRounds, required this.toggleDarkMode});

  @override
  _SettingsScreenState createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  int _rounds = 2;
  bool _darkMode = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Settings')),
      body: Column(
        children: [
          ListTile(
            title: Text('Number of Rounds'),
            trailing: DropdownButton<int>(
              value: _rounds,
              items: [2, 3, 4].map((round) {
                return DropdownMenuItem<int>(
                  value: round,
                  child: Text('$round'),
                );
              }).toList(),
              onChanged: (value) {
                setState(() {
                  _rounds = value!;
                });
                widget.setRounds(_rounds);
              },
            ),
          ),
          ListTile(
            title: Text('Dark Mode'),
            trailing: Switch(
              value: _darkMode,
              onChanged: (value) {
                setState(() {
                  _darkMode = value;
                });
                widget.toggleDarkMode(_darkMode);
              },
            ),
          ),
        ],
      ),
    );
  }
}
