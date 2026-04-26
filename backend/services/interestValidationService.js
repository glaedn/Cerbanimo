import { GoogleGenerativeAI } from "@google/generative-ai";
import pool from "../db.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Validates pending interests using Gemini AI (Gemma model).
 * Sets status to 'active' if it's a valid human interest,
 * or 'blacklisted' if it's junk, offensive, or otherwise invalid.
 */
export const validatePendingInterests = async () => {
  try {
    console.log("Starting validation of pending interests...");

    // Fetch all pending interests
    const pendingInterestsRes = await pool.query(
      "SELECT id, name FROM interests WHERE status = 'pending'"
    );

    if (pendingInterestsRes.rows.length === 0) {
      console.log("No pending interests to validate.");
      return;
    }

    const pendingInterests = pendingInterestsRes.rows;
    const model = genAI.getGenerativeModel({ model: "gemma-3-27b-it" });
    const BATCH_SIZE = 20;

    for (let i = 0; i < pendingInterests.length; i += BATCH_SIZE) {
      const batch = pendingInterests.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch of ${batch.length} interests (items ${i + 1} to ${Math.min(i + BATCH_SIZE, pendingInterests.length)})...`);

      try {
        const prompt = `
          Classify the following list of potential "interests" as either "valid" or "invalid".
          A valid interest is a real-world activity, topic, hobby, or field of study that a person might be interested in.
          An invalid interest is junk data (like random strings "asdf"), offensive content, or gibberish.

          Interests to classify:
          ${batch.map(item => `- ID: ${item.id}, Name: "${item.name}"`).join('\n')}

          Return your response as a JSON array of objects, each with "id", "classification" (either "active" or "blacklisted"), and "reason" fields.
          Ensure every ID from the input list is included in the output array.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown if present
        text = text.replace(/```json|```/g, "").trim();

        let results;
        try {
          results = JSON.parse(text);
          if (!Array.isArray(results)) {
            results = [results];
          }

          for (const res of results) {
            const status = res.classification === 'active' ? 'active' : 'blacklisted';
            await pool.query(
              "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
              [status, res.id]
            );
            console.log(`Interest ID ${res.id} validated as: ${status} (Reason: ${res.reason || 'N/A'})`);
          }
        } catch (parseErr) {
          console.error("Failed to parse batch response as JSON. Text:", text);
          // If batch parsing fails, we skip this batch but continue to the next
        }
      } catch (err) {
        console.error(`Error validating batch starting at index ${i}:`, err);
      }

      // Wait 30 seconds between batches, but not after the last batch
      if (i + BATCH_SIZE < pendingInterests.length) {
        console.log("Waiting 30 seconds before next batch...");
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }

    console.log("Finished validating pending interests.");
  } catch (err) {
    console.error("Critical error in validatePendingInterests:", err);
  }
};
