import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateProjectIdea, normalizeTaskImpactWeights, parseLLMJsonResponse } from './taskGenerator';

// Mock the @google/generative-ai library
const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: class {
      constructor() {}
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
  };
});

describe('taskGenerator.js', () => {
  // Clear mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseLLMJsonResponse', () => {
    it('should parse a valid JSON string', () => {
      const jsonString = '{"name": "Test", "value": 123}';
      expect(parseLLMJsonResponse(jsonString)).toEqual({ name: 'Test', value: 123 });
    });

    it('should parse a valid JSON string with leading/trailing whitespace', () => {
      const jsonString = '  {"name": "Test", "value": 123}  ';
      expect(parseLLMJsonResponse(jsonString)).toEqual({ name: 'Test', value: 123 });
    });

    it('should parse a valid JSON array string', () => {
      const jsonString = '[{"item": 1}, {"item": 2}]';
      expect(parseLLMJsonResponse(jsonString)).toEqual([{ item: 1 }, { item: 2 }]);
    });

    it('should extract and parse JSON from a string with markdown and other text', () => {
      const text = 'Some text before ```json\n{"name": "Alpha", "data": [1,2,3]}\n``` and some text after.';
      expect(parseLLMJsonResponse(text)).toEqual({ name: 'Alpha', data: [1,2,3] });
    });
    
    it('should extract and parse JSON when it is the only content', () => {
        const text = '{"name": "Only JSON", "data": true}';
        expect(parseLLMJsonResponse(text)).toEqual({ name: "Only JSON", data: true });
    });

    it('should throw an error for a string with no JSON object/array', () => {
      const text = 'This is just a plain text string.';
      expect(() => parseLLMJsonResponse(text)).toThrow('No JSON object/array found in response');
    });

    it('should throw an error for an invalid JSON string', () => {
      const text = '{"name": "Test", "value": 123, }'; // Trailing comma makes it invalid
      expect(() => parseLLMJsonResponse(text)).toThrow(); // Specific error depends on JSON.parse
    });
    
    it('should throw an error if JSON start is found but no valid end', () => {
      const text = 'Here is an unclosed object: {"name": "Test"';
      expect(() => parseLLMJsonResponse(text)).toThrow('Valid JSON object/array end not found in response');
    });
  });

  describe('normalizeTaskImpactWeights', () => {
    it('should normalize impact weights to total 100', () => {
      const tasks = normalizeTaskImpactWeights([
        { id: 1, name: 'Research', impact_weight: 2 },
        { id: 2, name: 'Build', impact_weight: 3 },
      ]);

      expect(tasks.map(t => t.impact_weight)).toEqual([40, 60]);
      expect(tasks.reduce((sum, task) => sum + task.impact_weight, 0)).toBe(100);
    });

    it('should fall back to reward tokens and add labels when weights are missing', () => {
      const tasks = normalizeTaskImpactWeights([
        { id: 1, name: 'Small', reward_tokens: 25 },
        { id: 2, name: 'Large', reward_tokens: 75 },
      ]);

      expect(tasks.map(t => t.impact_weight)).toEqual([25, 75]);
      expect(tasks[0].impact_label).toContain('Small');
    });
  });

  describe('generateProjectIdea', () => {
    const skills = ['React', 'Node.js'];
    const interests = ['AI', 'Sustainability'];

    it('should construct the prompt correctly and call generateContent', async () => {
      mockGenerateContent.mockResolvedValue({ response: { text: () => '{"Name": "Mock Project", "Description": "Mock Desc"}' } });
      await generateProjectIdea(skills, interests);
      
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
      const prompt = mockGenerateContent.mock.calls[0][0];
      expect(prompt).toContain(JSON.stringify(skills));
      expect(prompt).toContain(JSON.stringify(interests));
      expect(prompt).toContain('Format your response as JSON with keys Name and Description.');
    });

    it('should correctly parse the LLM response when valid JSON is returned', async () => {
      const mockIdea = { Name: 'EcoAI Dashboard', Description: 'A dashboard for monitoring environmental impact using AI.' };
      mockGenerateContent.mockResolvedValue({ response: { text: () => JSON.stringify(mockIdea) } });

      const result = await generateProjectIdea(skills, interests);
      expect(result).toEqual(mockIdea);
    });
    
    it('should correctly parse the LLM response when valid JSON with markdown is returned', async () => {
      const mockIdea = { Name: 'EcoAI Dashboard (Markdown)', Description: 'Markdown description.' };
      const llmResponseText = "```json\n" + JSON.stringify(mockIdea) + "\n```";
      mockGenerateContent.mockResolvedValue({ response: { text: () => llmResponseText } });

      const result = await generateProjectIdea(skills, interests);
      expect(result).toEqual(mockIdea);
    });

    it('should throw an error if the LLM call fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('LLM API Error'));
      
      await expect(generateProjectIdea(skills, interests))
        .rejects
        .toThrow('Failed to generate project idea: LLM API Error');
    });

    it('should throw an error if the LLM returns an unexpected format (not parsable JSON)', async () => {
      mockGenerateContent.mockResolvedValue({ response: { text: () => 'This is not JSON.' } });
      
      await expect(generateProjectIdea(skills, interests))
        .rejects
        .toThrow('Failed to generate project idea: No JSON object/array found in response');
    });
    
    it('should throw an error if the LLM returns JSON missing required fields', async () => {
      mockGenerateContent.mockResolvedValue({ response: { text: () => '{"NameOnly": "Test Project"}' } });
      
      await expect(generateProjectIdea(skills, interests))
        .rejects
        .toThrow('LLM response missing Name or Description for project idea.');
    });
  });
});
