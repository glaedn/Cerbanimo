import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:nine_plus_one/screens/home_screen.dart';

class ResultsScreen extends StatelessWidget {
  final List<List<String>>? storedSelections; // Foods data
  final List<List<String>>? storedColors; // Colors data
  

  const ResultsScreen({
    super.key,
    this.storedSelections,
    this.storedColors,
  });

  @override
  Widget build(BuildContext context) {
    // Determine if we're in color mode or food mode based on the passed data
    final isColorMode = storedColors != null;

    // Display corresponding data
    final dataToDisplay = isColorMode ? storedColors : storedSelections;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Results',
        style: TextStyle(color: Colors.white)),
        backgroundColor: Colors.blue,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Your Selections:',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 25),
            if (dataToDisplay != null)
              Expanded(
                child: isColorMode
                    ? ListView.builder(
                        itemCount: dataToDisplay[0].length, // Group by pick index
                        itemBuilder: (context, pickIndex) {
                          // Group the color selections by pick index
                          final group = List.generate(
                              dataToDisplay.length,
                              (roundIndex) => dataToDisplay[roundIndex][pickIndex]);

                          // Prepare hex codes for copying
                          final hexCodes = group.join(', ');

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    // Display color boxes for the group
                                    ...group.map((hex) {
                                      return Container(
                                        height: 50,
                                        width: 50,
                                        margin: const EdgeInsets.only(right: 8.0),
                                        color: Color(int.parse(
                                            '0xFF${hex.replaceAll('#', '')}')),
                                      );
                                    }),
                                    // Add a copy button
                                    IconButton(
                                      icon: const Icon(Icons.copy),
                                      onPressed: () {
                                        Clipboard.setData(
                                            ClipboardData(text: hexCodes));
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(
                                            content: Text('Copied: $hexCodes'),
                                          ),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                // Display hex codes below the group
                                Text(
                                  hexCodes,
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontFamily: 'Courier',
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      )
                    : ListView.builder(
                        itemCount: dataToDisplay.length, // Length of rounds
                        itemBuilder: (context, roundIndex) {
                          final roundSelections = dataToDisplay[roundIndex];

                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                Text(
                                  'Round ${roundIndex + 1}:',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: roundSelections.map((item) {
                                    // Display image for food items
                                    return GestureDetector(
                                      onTap: () {
                                        // Handle item click if needed
                                      },
                                      child: Container(
                                        height: 250,
                                        width: 250,
                                        decoration: BoxDecoration(
                                          borderRadius:
                                              BorderRadius.circular(8),
                                          border:
                                              Border.all(color: Colors.black),
                                        ),
                                        child: Column(
                                          children: [
                                            Expanded(
                                              child: Image.asset(
                                                'assets/images/$item.jpg',
                                                // Display image for the item
                                                fit: BoxFit.cover,
                                              ),
                                            ),
                                            Padding(
                                              padding:
                                                  const EdgeInsets.all(1.0),
                                              child: Text(
                                                item,
                                                style: const TextStyle(
                                                  fontSize: 12,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
              ElevatedButton(
                child: Text('Back to Home'),
                onPressed: () {
                 // Remove all the previous routes and return to HomeScreen (effectively re-initializing)
                 Navigator.of(context).pushAndRemoveUntil(
                   MaterialPageRoute(
                    builder: (context) => HomeScreen(), // Provide empty or default data
                  ),
                  (Route<dynamic> route) => false, // Removes all the previous routes
                );
              },
            )
          ],
        ),
      ),
    );
  }
}
