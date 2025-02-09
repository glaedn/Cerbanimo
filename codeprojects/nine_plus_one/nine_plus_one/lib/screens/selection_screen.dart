import 'package:flutter/material.dart';
import 'utils.dart'; // Import utility functions
import 'package:nine_plus_one/screens/results_screen.dart';

class SelectionScreen extends StatefulWidget {
  final Function(List<List<String>>) updateSelectedColors;
  final List<List<String>> storedColors;
  final int currentRound;
  final int currentPick;

  const SelectionScreen({
    super.key,
    required this.updateSelectedColors,
    required this.storedColors,
    required this.currentRound,
    required this.currentPick,
  });

  @override
  _SelectionScreenState createState() => _SelectionScreenState();
}

class _SelectionScreenState extends State<SelectionScreen> {
  late List<List<String>> colors;

  @override
  void initState() {
    super.initState();
    _initializeStoredColors();
    _generateColors();
  }

  // Ensure storedColors is properly initialized
  void _initializeStoredColors() {
    while (widget.storedColors.length < widget.currentRound) {
      widget.storedColors.add(List.generate(4, (_) => "")); // 4 picks per round
    }
  }

  void _generateColors() {
    colors = List.generate(9, (index) {
      List<String> combinedColors = [];

      // Add the specific color from the current pick number in previous rounds
      for (int round = 0; round < widget.currentRound - 1; round++) {
        if (widget.storedColors[round].length > widget.currentPick - 1) {
          combinedColors.add(widget.storedColors[round][widget.currentPick - 1]);
        } else {
          combinedColors.add("#FFFFFF"); // Default to white if not set
        }
      }

      // Add a new random color for the current round
      combinedColors.add(getRandomColor());

      return combinedColors;
    });
  }

  void _handleSelection(String selectedColor) {
    setState(() {
      // Ensure the list for the current round exists
      _initializeStoredColors();

      widget.storedColors[widget.currentRound - 1][widget.currentPick - 1] =
          selectedColor;
    });

    if (widget.currentPick == 4) {
      if (widget.currentRound < 4) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => SelectionScreen(
              updateSelectedColors: widget.updateSelectedColors,
              storedColors: widget.storedColors,
              currentRound: widget.currentRound + 1,
              currentPick: 1,
            ),
          ),
        );
      } else {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => ResultsScreen(
              storedColors: widget.storedColors,
            ),
          ),
        );
      }
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => SelectionScreen(
            updateSelectedColors: widget.updateSelectedColors,
            storedColors: widget.storedColors,
            currentRound: widget.currentRound,
            currentPick: widget.currentPick + 1,
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Round ${widget.currentRound}, Pick ${widget.currentPick}',
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: Colors.blueAccent,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Text(
              'Pick ${widget.currentPick} / 4',
              style: TextStyle(fontSize: 18),
            ),
          ),
          Expanded(
            child: GridView.builder(
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 3,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
              ),
              itemCount: colors.length,
              itemBuilder: (context, index) {
                List<String> squareColors = colors[index];

                return GestureDetector(
                  onTap: () => _handleSelection(squareColors.last),
                  child: Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.black, width: 1),
                    ),
                    child: Row(
                      children: squareColors.map((colorHex) {
                        try {
                          return Expanded(
                            child: Container(
                              color: Color(int.parse(
                                  '0xFF${colorHex.replaceAll('#', '')}')),
                            ),
                          );
                        } catch (e) {
                          return Expanded(
                            child: Container(
                              color: Colors.grey, // Default to grey on error
                            ),
                          );
                        }
                      }).toList(),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
