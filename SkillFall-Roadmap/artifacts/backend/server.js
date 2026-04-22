const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post('/api/generate-roadmap', async (req, res) => {
  try {
    const { age, primaryInterest, incomeUrgency, internetAccess, skillLevel, timeAvailability, riskTolerance } = req.body;

    // Basic validation
    if (!age || !primaryInterest) {
      return res.status(400).json({ error: 'Age and Primary Interest are required.' });
    }

    const prompt = `
      You are an expert AI career strategist for "SkillFall", a platform designed to help people rebuild their careers in a collapsing institution economy.
      
      Generate a highly personalized 30-day survival roadmap for a user with the following profile:
      - Age: ${age}
      - Primary Interest: ${primaryInterest}
      - Income Urgency: ${incomeUrgency}
      - Internet Access: ${internetAccess}
      - Current Skill Level: ${skillLevel}
      - Time Availability: ${timeAvailability}
      - Risk Tolerance: ${riskTolerance || 'medium'}

      The roadmap MUST consist of exactly 5 milestones (cards) following this progression:
      1. Foundation (FREE) - Week 1-2
      2. Proof of Work (FREE) - Week 3-4
      3. First Income (INCOME) - Month 2
      4. Scaling (INCOME) - Month 3
      5. Community/Professional Status (COMMUNITY) - Month 6

      Each milestone MUST have:
      - id: 1 to 5
      - title: A compelling name for the milestone
      - description: A brief explanation of why this is important for survival
      - badge: "FREE", "INCOME", or "COMMUNITY" (strictly follow the progression above)
      - timeLabel: "Week 1-2", "Week 3-4", "Month 2", "Month 3", or "Month 6"
      - accentColor: A hex color code (use variations of #7c3aed, #3b82f6, #00d4aa, #f59e0b, #f97316)
      - days: Exactly 3 sub-milestones, each with:
          - dayRange: e.g., "Day 1-3", "Day 4-7", etc.
          - title: What to do
          - bullets: 3 actionable steps (strings)

      Also provide a "successProbability" (number between 35 and 95) based on their profile.
      
      Return ONLY a raw JSON object with this structure:
      {
        "successProbability": 85,
        "roadmap": [
          {
            "id": 1,
            "title": "...",
            "description": "...",
            "badge": "FREE",
            "timeLabel": "Week 1-2",
            "accentColor": "#7c3aed",
            "days": [
              { "dayRange": "Day 1-3", "title": "...", "bullets": ["...", "...", "..."] },
              ...
            ]
          },
          ...
        ]
      }

      Ensure the advice is realistic, beginner-friendly, and specific to the interest "${primaryInterest}". Include specific tools and platforms.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response if Gemini wraps it in markdown code blocks
    const jsonString = text.replace(/```json|```/g, '').trim();
    const data = JSON.parse(jsonString);

    res.json(data);
  } catch (error) {
    console.error('Error generating roadmap:', error);
    res.status(500).json({ error: 'Failed to generate roadmap. Please try again.' });
  }
});

app.post('/api/recovery-assistant', async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    // System prompt to define the chatbot's personality and goals
    const systemInstruction = `
      You are the "SkillFall Recovery Assistant". Your purpose is to provide emotional support, motivation, and practical career guidance to students facing pressure, anxiety, or lack of direction.
      
      PERSONALITY:
      - Calm, supportive, empathetic, and highly practical.
      - Use "we" and "us" to show partnership.
      - Keep responses student-friendly and encouraging.
      
      CORE RULES:
      - This is NOT a medical or therapy service. Avoid medical diagnosis or deep psychological analysis.
      - If a user expresses extreme distress, suggest professional help calmly.
      - Always provide:
        1. A supportive, empathetic opening response.
        2. 2-3 small, actionable next steps.
        3. A relevant skill suggestion or motivational closing.
      
      CONTEXT:
      SkillFall helps students build skills when institutions fail. Focus on rebuild-mentality.
      
      Respond to the user's message in a clean, structured format.
    `;

    // Construct the prompt with history if available
    let promptContent = `${systemInstruction}\n\n`;
    if (history && history.length > 0) {
      promptContent += "Conversation history:\n";
      history.forEach(h => {
        promptContent += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.text}\n`;
      });
    }
    promptContent += `User: ${message}\nAssistant:`;

    const result = await model.generateContent(promptContent);
    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (error) {
    console.error('Error in recovery assistant:', error);
    res.status(500).json({ error: 'Failed to get a response. Please try again.' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
