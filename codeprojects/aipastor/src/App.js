import './App.css';
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { GoogleGenerativeAI } from "@google/generative-ai";

export default function App() {
  const [messages, setMessages] = useState([]); // { id, sender, text }
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(process.env.REACT_APP_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
      Take on the teaching style of Jesus and answer the user’s questions as they explore how Jesus might respond.  
      Act as a teacher of Jesus' words, incorporating unique parables rooted in biblical principles.  
      Reference relevant gospel passages whenever possible.  

      User Query: ${input}
      `;

      const result = await model.generateContent(prompt);
      console.log(result.response.text());
      const pastorReply = { id: (Date.now() + 1).toString(), sender: 'pastor', text: result.response.text() };
      setMessages(prev => [...prev, pastorReply]);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={[styles.message, item.sender === 'pastor' ? styles.pastor : styles.user]}>
            <Text>{item.text}</Text>
          </View>
        )}
        contentContainerStyle={styles.chatHistory}
      />
      {loading && <ActivityIndicator size="small" color="#0000ff" />}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your question..."
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton} disabled={loading}>
          {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.sendButtonText}>Send</Text>}
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#fff' },
  chatHistory: { paddingBottom: 20 },
  message: { marginVertical: 5, padding: 10, borderRadius: 5 },
  user: { backgroundColor: '#e0f7fa', alignSelf: 'flex-end' },
  pastor: { backgroundColor: '#fff9c4', alignSelf: 'flex-start' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: '#ccc', padding: 5 },
  input: { flex: 1, height: 40, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, paddingHorizontal: 10 },
  sendButton: { marginLeft: 10, backgroundColor: '#007aff', padding: 10, borderRadius: 5 },
  sendButtonText: { color: '#fff' },
});