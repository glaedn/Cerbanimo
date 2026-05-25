import { GoogleGenerativeAI } from '@google/generative-ai';
import pool from '../db.js';

class AIGatewayService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.modelName = 'gemini-1.5-flash';
    this.monthlyTokenBudget = 1000000;
  }

  async checkTokenBudget() {
    const result = await pool.query(
      `SELECT SUM(tokens_used) as total FROM ai_token_usage
       WHERE created_at > date_trunc('month', now())`
    );
    const used = parseInt(result.rows[0]?.total || 0);
    if (used >= this.monthlyTokenBudget) {
      throw new Error('Monthly AI token budget exceeded');
    }
    return used;
  }

  async analyze(prompt, context = {}, options = {}) {
    try {
      await this.checkTokenBudget();

      const model = this.genAI.getGenerativeModel({ model: options.model || this.modelName });

      const systemInstruction = options.systemInstruction || 'You are an AI coordination agent for Cerbanimo, a civic metabolism platform.';
      const fullPrompt = `${systemInstruction}\n\nContext:\n${JSON.stringify(context, null, 2)}\n\nQuery: ${prompt}`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      const tokensEstimated = Math.ceil((fullPrompt.length + text.length) / 4);

      await pool.query(
        'INSERT INTO ai_token_usage (model, tokens_used, usage_type) VALUES ($1, $2, $3)',
        [options.model || this.modelName, tokensEstimated, options.usageType || 'analysis']
      );

      return {
        text,
        tokensEstimated,
        model: options.model || this.modelName
      };
    } catch (err) {
      console.error('AIGatewayService: Analysis failed', err);
      throw err;
    }
  }

  async synthesizeRecommendation(agentType, data, history = []) {
    const prompt = `Based on the following data and past actions, synthesize a specific, actionable coordination recommendation.
    Provide the output in JSON format with fields: "recommendationType", "targetId", "targetType", "reasoning" (object with "evidence" array and "summary" string), and "confidence" (0-1).`;

    const context = {
      agentType,
      data,
      history: history.slice(-5) // Last 5 historical events
    };

    const result = await this.analyze(prompt, context, {
      systemInstruction: 'You are an expert civic coordinator and community organizer. Your goal is to maximize social cohesion and mission momentum while preventing burnout.'
    });

    try {
      // Basic JSON extraction from markdown if necessary
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : result.text);
    } catch (err) {
      console.warn('AIGatewayService: Failed to parse AI JSON response', err);
      return {
        recommendationType: 'manual_intervention_required',
        reasoning: { summary: result.text, evidence: [] },
        confidence: 0.5
      };
    }
  }
}

export default new AIGatewayService();
