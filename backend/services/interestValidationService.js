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

    for (const interest of pendingInterests) {
      try {
        const prompt = `
          Classify the following potential "interest" as either "valid" or "invalid".
          A valid interest is a real-world activity, topic, hobby, or field of study that a person might be interested in.
          An invalid interest is junk data (like random strings "asdf"), offensive content, or gibberish.

          Interest: "${interest.name}"

          Return your response as a JSON object with a "classification" field (either "active" or "blacklisted") and a "reason" field.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown if present
        text = text.replace(/```json|```/g, "").trim();

        // Use a more robust JSON extraction if needed, but for now assuming clean JSON
        let classificationData;
        try {
            classificationData = JSON.parse(text);
        } catch (parseErr) {
            // Fallback: look for keywords if JSON parse fails
            if (text.toLowerCase().includes('"active"')) {
                classificationData = { classification: 'active', reason: 'Parsed from text' };
            } else if (text.toLowerCase().includes('"blacklisted"')) {
                classificationData = { classification: 'blacklisted', reason: 'Parsed from text' };
            } else {
                throw parseErr;
            }
        }

        const status = classificationData.classification === 'active' ? 'active' : 'blacklisted';

        await pool.query(
          "UPDATE interests SET status = $1, updated_at = NOW() WHERE id = $2",
          [status, interest.id]
        );

        console.log(`Interest "${interest.name}" validated as: ${status} (Reason: ${classificationData.reason || 'N/A'})`);
      } catch (err) {
        console.error(`Error validating interest "${interest.name}":`, err);
      }
    }

    console.log("Finished validating pending interests.");
  } catch (err) {
    console.error("Critical error in validatePendingInterests:", err);
  }
};
