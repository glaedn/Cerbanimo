import 'package:flutter/material.dart';
import 'utils.dart'; // Import your utility file
import 'results_screen.dart';

class FoodSelectionScreen extends StatefulWidget {
  final int currentRound;
  final List<List<String>> storedSelections;

  const FoodSelectionScreen({
    super.key,
    required this.currentRound,
    required this.storedSelections,
  });

  @override
  _FoodSelectionScreenState createState() => _FoodSelectionScreenState();
}

class _FoodSelectionScreenState extends State<FoodSelectionScreen> {
  late List<String> foodItems;
  late List<String> selectedFood;

  @override
  void initState() {
    super.initState();
    _generateFoodForRound();
  }

  void _generateFoodForRound() {
    switch (widget.currentRound) {
      case 1:
        foodItems = meats;
        break;
      case 2:
        foodItems = vegetables;
        break;
      case 3:
        foodItems = bases;
        break;
      case 4:
        foodItems = addons;
        break;
      default:
        foodItems = [];
    }
    selectedFood = getRandomSubset(foodItems, 9);
  }

  List<T> getRandomSubset<T>(List<T> list, int count) {
    if (count > list.length) {
      throw ArgumentError('Count cannot be greater than the size of the list.');
    }
    List<T> shuffledList = List.from(list)..shuffle();
    return shuffledList.sublist(0, count);
  }

  void _handleSelection(String selectedItem) {
    setState(() {
      // Ensure the list for each round exists
      while (widget.storedSelections.length < widget.currentRound) {
        widget.storedSelections.add([]);
      }

      // Add the selected item to the current round's list
      widget.storedSelections[widget.currentRound - 1].add(selectedItem);
    });

    int nextRound = widget.currentRound + 1;

    if (nextRound <= 4) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => FoodSelectionScreen(
            currentRound: nextRound,
            storedSelections: widget.storedSelections,
          ),
        ),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => ResultsScreen(
            storedSelections: widget.storedSelections,
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
          "Round ${widget.currentRound}",
          style: TextStyle(color: Colors.white),
        ),
        backgroundColor: Colors.blueAccent,
      ),
      body: Center(
        child: Column(
          children: [
            Expanded(
              child: GridView.builder(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 3,
                  mainAxisSpacing: 3,
                ),
                itemCount: selectedFood.length,
                itemBuilder: (context, index) {
                  String imageName = selectedFood[index];

                  return GestureDetector(
                    onTap: () => _handleSelection(imageName),
                    child: Container(
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.black),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Expanded(
                            child: Image.asset(
                              'assets/images/$imageName.jpg',
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) {
                                return Center(child: Text('Image not found'));
                              },
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Text(
                              imageName,
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            ElevatedButton(
              child: Text('Regenerate'),
              onPressed: () {
                setState(() {
                  _generateFoodForRound();
                });
              },
            ),
          ],
        ),
      ),
    );
  }
}
