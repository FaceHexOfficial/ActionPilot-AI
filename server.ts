import express from 'express';
import path from 'path';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

// Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  next();
});

app.use(cors());
app.use(express.json());

// Input Sanitization to protect against XSS and HTML Injection
function sanitizeInputString(val: any): any {
  if (typeof val === 'string') {
    return val
      .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/href\s*=\s*"javascript:[^"]*"/gi, '')
      .replace(/javascript:/gi, 'blocked:');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeInputString);
  }
  if (val !== null && typeof val === 'object') {
    const obj: any = {};
    for (const key in val) {
      obj[key] = sanitizeInputString(val[key]);
    }
    return obj;
  }
  return val;
}

app.use((req, res, next) => {
  if (req.body) {
    req.body = sanitizeInputString(req.body);
  }
  next();
});

const upload = multer({ storage: multer.memoryStorage() });

// Initialize Gemini
function getAI(req?: any) {
  const userApiKey = req?.headers?.['x-gemini-api-key'] || process.env.GEMINI_API_KEY;
  if (!userApiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing. Please configure your API key in Settings under the Connections tab.");
  }
  return new GoogleGenAI({ 
    apiKey: userApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

async function generateContentWithRetry(aiClient: any, options: {
  model: string;
  contents: any;
  config?: any;
}, maxRetries = 2) {
  let retries = 0;
  while (retries <= maxRetries) {
    try {
      const response = await aiClient.models.generateContent(options);
      return response;
    } catch (error: any) {
      const isTransient = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');
      if (isTransient && retries < maxRetries) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to generate content after retries.");
}

app.post('/api/ai/analyze-task', async (req, res) => {
  try {
    const aiClient = getAI(req);
    const { prompt, currentDate, selectedDate } = req.body;
    const refCurrentDate = currentDate || new Date().toISOString();
    const refSelectedDate = selectedDate || refCurrentDate;
    
    const response = await generateContentWithRetry(aiClient, {
      model: 'gemini-2.5-flash',
      contents: `You are an AI Executive Assistant. Analyze this voice input: "${prompt}".
      The current system date is: ${refCurrentDate}.
      The currently selected calendar date is: ${refSelectedDate}.

      If the user is asking a general question, requesting a search, or just chatting, respond with a JSON object:
      {
        "isQuestion": true,
        "answer": "A concise, helpful answer that can be spoken aloud."
      }
      
      If the user is asking to create, schedule, or manage a task, respond with a JSON object representing the task.
      Determine the "dueDate" (formatted as "YYYY-MM-DD") as follows:
      - If the user specifies a relative date (e.g., 'tomorrow', 'next Monday', 'on Friday', 'next week') or absolute date (e.g., 'July 4th', '15th of next month'), calculate the date strictly relative to the current system date (${refCurrentDate}).
      - If no date is mentioned in the voice memo, default to the currently selected calendar date (${refSelectedDate}) formatted as "YYYY-MM-DD".

      CRITICAL TASK SEPARATION MANDATE:
      - If the user specifies or lists multiple events, tasks, exam dates, movie shows, or interviews on different dates or days in their input, you MUST parse the exact date from the prompt for each event and separate them into INDIVIDUAL, DISTINCT tasks inside the "tasks" array.
      - ABSOLUTELY NO SUBTASKS FOR DIFFERENT DATES: You are PROHIBITED from grouping different dates or different events together under a single task or as subtasks.
      - NEVER combine multiple events or distinct dates into a single task! 
      - You MUST extract the specific date for each task from the user's input.
      - Each task in the "tasks" array MUST have its own independent title, description, priority, category, recurring, estimatedMinutes, and dueDate (calculated strictly for that specific task's date).

      JSON format:
      {
        "isQuestion": false,
        "title": "A short clear title of the first/main task",
        "description": "Brief description of the first/main task",
        "priority": "High", "Medium", or "Low",
        "category": "Suggested category (must be one of: Work, Personal, Shopping, Health, Errands, or General)",
        "recurring": "None", "Daily", "Weekly", or "Monthly",
        "estimatedMinutes": 30,
        "dueDate": "YYYY-MM-DD",
        "subtasks": [{"title": "Step 1", "estimatedMinutes": 10}],
        "tasks": [
          // If multiple tasks or events on different dates are mentioned, list ALL of them as separate task objects here.
          // Each object in "tasks" must follow this structure:
          // { "title": "...", "description": "...", "priority": "...", "category": "...", "recurring": "...", "estimatedMinutes": 30, "dueDate": "YYYY-MM-DD", "subtasks": [...] }
        ]
      }
      
      Return ONLY valid JSON.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');
    
    if (!isRateLimit && !isTransientError) {
      console.error("Error analyzing task:", error);
    }
    if (isRateLimit || isTransientError) {
      return res.json({
        title: req.body.prompt || "New Task",
        description: isTransientError ? "AI analysis currently unavailable due to high demand. Please edit manually." : "AI analysis currently unavailable due to rate limits. Please edit manually.",
        priority: "Medium",
        category: "General",
        recurring: "None",
        estimatedMinutes: 30,
        dueDate: req.body.selectedDate ? req.body.selectedDate.split('T')[0] : new Date().toISOString().split('T')[0],
        subtasks: []
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/chat-task', async (req, res) => {
  try {
    const aiClient = getAI(req);
    const { messages, currentTask, currentDate, selectedDate } = req.body;
    const refCurrentDate = currentDate || new Date().toISOString();
    const refSelectedDate = selectedDate || refCurrentDate;

    const systemInstruction = `You are an AI Executive Assistant helping the user design, refine, and automate task scheduling.
The user is conversing with you.
If we have an existing active task/plan, its state is:
${JSON.stringify(currentTask || null)}

The current system date is: ${refCurrentDate}.
The currently selected calendar date is: ${refSelectedDate}.

Your task:
1. Understand the user's input.
2. If the user wants to create a new task/plan, generate a high-quality task plan.
3. If the user wants to update or modify the current task (e.g., "change the priority to High", "add a step for review", "delete the second step", "rename the task", "reduce the estimated time to 40 mins"), you must apply those edits to the task state and output the updated task structure.
4. Calculate the "dueDate" (formatted as "YYYY-MM-DD") for each task:
   - If the user explicitly schedules the task (e.g. "on Friday", "tomorrow", "next week", "July 4th"), compute the date relative to the current system date (${refCurrentDate}).
   - If the task is brand new and they do not specify a date, default to the currently selected calendar date (${refSelectedDate}) formatted as "YYYY-MM-DD".
   - If editing an existing task, preserve its previous "dueDate" unless they specifically request to reschedule/change the date.
5. If the user is asking a general question, chat, or other request, formulate a helpful, professional response to the user.
6. In all cases, return a conversational, spoken response in the "answer" field explaining what you did, answering their question, or greeting them.

CRITICAL TASK SEPARATION MANDATE:
- If the user specifies or lists multiple events, tasks, exam dates, movie shows, or interviews on different dates or days in their input, you MUST parse the exact date from the prompt for each event and separate them into INDIVIDUAL, DISTINCT tasks inside the "tasks" array.
- ABSOLUTELY NO SUBTASKS FOR DIFFERENT DATES: You are PROHIBITED from grouping different dates or different events together under a single task or as subtasks.
- NEVER combine multiple events or distinct dates into a single task! 
- You MUST extract the specific date for each task from the user's input.
- Each task in the "tasks" array MUST have its own independent title, description, priority, category, recurring, estimatedMinutes, and dueDate (calculated strictly for that specific task's date).

You MUST respond with a JSON object in this format:
{
  "answer": "A friendly, concise conversational response explaining what was done or answering their question.",
  "task": {
    "title": "A short clear title of the first/main task",
    "description": "Brief description of the first/main task",
    "priority": "High" | "Medium" | "Low",
    "category": "Work" | "Personal" | "Shopping" | "Health" | "Errands" | "General",
    "recurring": "None" | "Daily" | "Weekly" | "Monthly",
    "estimatedMinutes": number,
    "dueDate": "YYYY-MM-DD",
    "subtasks": [
      { "title": "Step 1 title", "estimatedMinutes": number }
    ]
  },
  "tasks": [
    // If multiple tasks or events on different dates are mentioned, list ALL of them as separate task objects here.
    // Each object in "tasks" must follow this structure:
    // { "title": "...", "description": "...", "priority": "...", "category": "...", "recurring": "...", "estimatedMinutes": number, "dueDate": "YYYY-MM-DD", "subtasks": [...] }
  ]
}
If no task is currently active/being generated, "task" and "tasks" can be null or empty.
Ensure the categories are exactly one of: Work, Personal, Shopping, Health, Errands, General.
Ensure priorities are exactly one of: High, Medium, Low.
Ensure recurring is exactly one of: None, Daily, Weekly, Monthly.
Ensure you return ONLY a valid, parseable JSON object. No other text around the JSON.`;

    const contents = [];
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    const response = await generateContentWithRetry(aiClient, {
      model: 'gemini-3.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json"
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');
    
    if (!isRateLimit && !isTransientError) {
      console.error("AI Task Chat Error:", error);
    }
    
    if (isRateLimit || isTransientError) {
      return res.json({
        answer: isTransientError 
          ? "I am temporarily experiencing high traffic, but feel free to add your tasks manually, or try again in a few seconds!" 
          : "I am temporarily paused due to rate limits. Please try again in a few seconds!",
        task: req.body.currentTask || null,
        tasks: []
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/analyze-email', async (req, res) => {
  try {
    const aiClient = getAI(req);
    const { subject, snippet, content } = req.body;
    
    const response = await generateContentWithRetry(aiClient, {
      model: 'gemini-2.5-flash',
      contents: `You are an AI Executive Assistant. Analyze this email.
      Subject: ${subject}
      Snippet: ${snippet}
      Content: ${content || ''}
      
      Determine if this email is an appointment confirmation, a train ticket, a flight ticket, a movie ticket, or another time-sensitive event reservation.
      If it is, extract a very short, spoken alert message for the user (e.g. "You received a movie ticket for Inception at 7 PM" or "You have a new doctor appointment confirmation").
      
      Return a JSON object:
      {
        "isAlertWorthy": boolean,
        "alertMessage": "string (only if isAlertWorthy is true)"
      }
      
      Return ONLY valid JSON.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');
    
    if (!isRateLimit && !isTransientError) {
      console.error("AI Email Analysis Error", error);
    }
    
    if (isRateLimit || isTransientError) {
      return res.json({
        isAlertWorthy: false,
        alertMessage: ""
      });
    }
    res.status(500).json({ error: "Failed to analyze email" });
  }
});

app.post('/api/ai/focus-task', async (req, res) => {
  try {
    const aiClient = getAI(req);
    const { tasks } = req.body;
    
    if (!tasks || tasks.length === 0) {
      return res.json({ taskId: null, reason: "No tasks available to focus on." });
    }

    const response = await generateContentWithRetry(aiClient, {
      model: 'gemini-2.5-flash',
      contents: `You are an AI Executive Assistant. Here is a list of the user's current pending tasks:
      ${JSON.stringify(tasks, null, 2)}
      
      Identify the SINGLE most important task the user should focus on today. 
      Consider High priority items, closest due dates, and task estimated time.
      
      Return a JSON object with:
      - taskId: The exact id of the chosen task.
      - reason: A short, motivating 1-2 sentence explanation of why they should do this next.
      
      Return ONLY valid JSON.`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');
    
    if (!isRateLimit && !isTransientError) {
      console.error("Error determining focus task:", error);
    }
    if (isRateLimit || isTransientError) {
      return res.json({ 
        taskId: req.body.tasks?.[0]?.id || null, 
        reason: isTransientError 
          ? "AI assistant is highly loaded right now, but we recommend tackling this task next!" 
          : "AI is on a quick break due to rate limits! Pick a task and keep the momentum going." 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/daily-digest', async (req, res) => {
  try {
    const aiClient = getAI(req);
    const { tasks, activities } = req.body;
    
    const response = await generateContentWithRetry(aiClient, {
      model: 'gemini-2.5-flash',
      contents: `You are an AI Executive Assistant. 
      Here are the user's tasks:
      ${JSON.stringify(tasks, null, 2)}
      
      Here is the user's recent activity log:
      ${JSON.stringify(activities, null, 2)}
      
      Generate a Daily Digest for the user.
      1. 'summary': A short paragraph (2-3 sentences) summarizing their recent accomplishments based on the activity log and completed tasks.
      2. 'priorities': An array of exactly 3 strings, which are the top suggested priorities for today based on their pending tasks (High priority, close due dates).
      
      Return ONLY valid JSON with this structure:
      {
        "summary": "string",
        "priorities": ["string", "string", "string"]
      }`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');
    
    if (!isRateLimit && !isTransientError) {
      console.error("Error generating daily digest:", error);
    }
    if (isRateLimit || isTransientError) {
      return res.json({
        summary: isTransientError 
          ? "You've been active today! (Note: AI summaries are temporarily unavailable due to high server demand.)"
          : "You've been active today! (Note: AI summaries are temporarily unavailable due to rate limits.)",
        priorities: [
          "Focus on pending tasks",
          "Check calendar for deadlines",
          "Take a short break"
        ]
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/today-brief', async (req, res) => {
  try {
    const aiClient = getAI(req);
    const { tasks } = req.body;

    const response = await generateContentWithRetry(aiClient, {
      model: 'gemini-3.5-flash',
      contents: `You are ActionPilot AI, an elite executive assistant.
      The user wants a concise, highly motivating spoken audio brief summarizing all of today's pending tasks.
      Here are today's pending tasks in JSON:
      ${JSON.stringify(tasks, null, 2)}

      Please summarize these tasks into a single actionable brief (2 to 4 sentences maximum).
      The summary must be written specifically to be read out loud using text-to-speech.
      IMPORTANT RULES:
      - Keep it natural, warm, conversational, and energetic.
      - NEVER use bullet points, asterisks, markdown syntax, or special characters.
      - Do NOT use abbreviations that sound weird when spoken.
      - Focus on what needs to be done today and end with a quick boost of motivation.

      Return a simple JSON object matching this structure:
      {
        "brief": "The fully formatted spoken brief text"
      }`,
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '{}');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');

    if (!isRateLimit && !isTransientError) {
      console.error("Error generating today's actionable brief:", error);
    }

    // Friendly speech fallback
    const fallbackMessage = "You have some important tasks today. Let's make today incredibly productive, one step at a time!";
    res.json({ brief: fallbackMessage });
  }
});

app.post('/api/ai/coach', async (req, res) => {
  try {
    const aiClient = getAI(req);
    const { context, message } = req.body;
    
    const response = await generateContentWithRetry(aiClient, {
      model: 'gemini-2.5-flash',
      contents: `You are ActionPilot AI, an intelligent execution partner and productivity coach. 
      Help the user complete their work. Keep your response concise, actionable, and motivating.
      User Context: ${JSON.stringify(context)}
      User Message: ${message}`
    });

    res.json({ text: response.text });
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500 || error.message?.includes('503') || error.message?.includes('500') || error.message?.includes('UNAVAILABLE') || error.message?.includes('unavailable');
    
    if (!isRateLimit && !isTransientError) {
      console.error("Error generating coach response:", error);
    }
    if (isRateLimit || isTransientError) {
      return res.json({ 
        text: isTransientError 
          ? "I'm temporarily experiencing high traffic, but remember that small, steady steps lead to big progress! You've got this!" 
          : "I'm currently resting due to rate limits, but you're doing great! Keep it up!" 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/agent-action', async (req, res) => {
  const { prompt: promptText, currentDate } = req.body;
  try {
    const aiClient = getAI(req);
    const refCurrentDate = currentDate || new Date().toISOString();

    const systemInstruction = `
      You are ActionPilot AI, a highly specialized, proactive AI Task, Organizer, and Action Assistant. Your mission is to structure scheduling requests and automate reminders on the user's dashboard.
      Analyze the user's prompt: "${promptText}".
      The current system date is: ${refCurrentDate}.

      CRITICAL BRANDING REQUIREMENT: Always refer to yourself as "ActionPilot AI" and maintain a highly professional, helpful persona.

      CRITICAL TASK SEPARATION MANDATE (NEVER COMBINE DATES/EVENTS):
      - If the user provides a list of multiple events, tasks, exam dates, movie shows, or interviews on different dates or days, you MUST parse the exact date from the prompt for each event and separate them into INDIVIDUAL, DISTINCT top-level actions in the "actions" array.
      - ABSOLUTELY NO SUBTASKS: You are PROHIBITED from using the subtasks feature to handle different dates.
      - NEVER combine multiple events or distinct dates into a single task! 
      - You MUST extract the specific date for each task from the user's input.
      - For example, if a user says: "Prepare for Scheduled Events (Interview June 30, Movie July 5, Exam July 12)", you MUST return THREE separate "create_task" actions in the "actions" array, each having its own specific title (e.g. "Prepare & attend Interview", "Confirm ticket & attend Movie Show", "Study & sit for Exam"), specific estimatedMinutes, and specific independent dueDate ("2026-06-30", "2026-07-05", "2026-07-12" respectively).
      - Each task in the array MUST have its "dueDate" parsed directly from the prompt and calculated independently.
      - If no year is specified, assume the current or upcoming year based on the current date: ${refCurrentDate}.
      - Different dates must go to different top-level tasks! Do NOT group them under a single task.

      Determine which of the following actions they want to perform:
      1. Create a task ("create_task")
      2. Set a water/hydration reminder ("water_reminder")
      3. Set a medication reminder ("medication")
      4. Send an SMS text message ("send_sms")

      Respond with a JSON object containing:
      - "actions": an array of extracted actions. Each action in the array MUST contain:
        - "actionType": one of "create_task", "water_reminder", "medication", "send_sms", or "unknown"
        - "payload": an object representing the data of that action.
      
      Schema for action payload:
      - If actionType is "create_task":
        {
          "title": "Short descriptive title of this specific task (e.g., 'Study & sit for SS Exam')",
          "description": "Short description of this specific task (e.g., 'Exam scheduled for July 12')",
          "priority": "High" | "Medium" | "Low",
          "category": "Work" | "Personal" | "Shopping" | "Health" | "Errands" | "General",
          "recurring": "None" | "Daily" | "Weekly" | "Monthly",
          "estimatedMinutes": number,
          "dueDate": "YYYY-MM-DD" (strictly calculate this based on the specific date mentioned for this task, relative to ${refCurrentDate})
        }
      - If actionType is "water_reminder":
        {
          "name": "Drink water",
          "time": "HH:MM" (e.g. "17:00")
        }
      - If actionType is "medication":
        {
          "name": "Ibuprofen / Vitamin C etc",
          "time": "HH:MM" (e.g. "09:00"),
          "dose": "1 pill"
        }
      - If actionType is "send_sms":
        {
          "sender": "Mom" | "Dad" | "Friend" | "David",
          "content": "Message body to send",
          "time": "HH:MM"
        }

      Ensure to prevent arms, weapons, terrorism, murder, suicide, and illegal activities. If any action violates this, set that action's actionType to "safety_violation" and payload to { "reason": "Cannot perform actions related to dangerous/violent topics." }.

      Return ONLY valid JSON with the format: { "actions": [...] }
    `;

    let response;
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      try {
        response = await aiClient.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptText || "",
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
          }
        });
        break;
      } catch (error: any) {
        if ((error.status === 503 || error.status === 500) && retries < maxRetries) {
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          continue;
        }
        throw error;
      }
    }

    const result = JSON.parse(response!.text || '{"actions":[]}');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500;
    
    if (!isRateLimit && !isTransientError) {
      console.error("Agent Action Error:", error);
    }
    
    if (isRateLimit || isTransientError) {
      return res.json({
        actions: [
          {
            actionType: "create_task",
            payload: {
              title: typeof promptText === 'string' ? promptText.substring(0, 40) : "Action",
              description: isTransientError ? "Parsed in fallback mode due to high demand" : "Parsed in fallback mode due to rate limits",
              priority: "Medium",
              category: "General",
              recurring: "None",
              estimatedMinutes: 30,
              dueDate: new Date().toISOString().split('T')[0]
            }
          }
        ]
      });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/upload', upload.single('file'), async (req, res) => {
  try {
    const aiClient = getAI(req);
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1. File size limit validation (10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (req.file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ error: 'File size exceeds maximum permitted limit of 10MB.' });
    }

    // 2. MIME-type whitelist to prevent script, HTML or executable upload injections
    const ALLOWED_MIME_TYPES = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/pdf',
      'application/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif'
    ];
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ 
        error: 'Unsupported file format. Only safe text files, standard documents (.pdf, .docx, .json, .csv), and common images are permitted.' 
      });
    }

    // 3. Filename sanitization to protect against directory traversal or execution vectors
    const safeFilename = req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');

    const fileBase64 = req.file.buffer.toString('base64');
    
    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: req.file.mimetype,
            data: fileBase64
          }
        },
        "Analyze this document. Extract any tasks, deadlines, meeting dates, or important notes. Format the response as a JSON array of task objects with: title, description, dueDate (ISO string if possible), priority ('High', 'Medium', 'Low'), category (e.g. 'Work', 'Personal', 'Study'), recurring ('None', 'Daily', 'Weekly', 'Monthly'), estimatedMinutes. Return ONLY valid JSON."
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const result = JSON.parse(response.text || '[]');
    res.json(result);
  } catch (error: any) {
    const isRateLimit = error.status === 429 || error.message?.includes('429') || error.message?.includes('Quota') || error.error?.code === 429;
    const isTransientError = error.status === 503 || error.status === 500 || error.error?.code === 503 || error.error?.code === 500;
    if (!isRateLimit && !isTransientError) {
      console.error("Error analyzing file:", error);
    }
    if (isRateLimit || isTransientError) {
      return res.status(isTransientError ? 503 : 429).json({ error: isTransientError ? "AI processing unavailable due to high demand." : "AI document processing unavailable due to rate limits. Please try again later." });
    }
    res.status(500).json({ error: error.message || "Failed to process document safely." });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
