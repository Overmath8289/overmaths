
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed." },
      405
    );
  }

  try {
    // ==========================================
    // 1. GET AND VALIDATE GEMINI API KEY
    // ==========================================

    const rawApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!rawApiKey) {
      console.error("GEMINI_API_KEY is missing.");

      return jsonResponse({
        error: "Gemini API key is not configured in Supabase.",
      }, 500);
    }

    // Remove accidental whitespace and line breaks.
    const apiKey = rawApiKey.replace(/\s+/g, "");

    // Reject unexpected characters instead of allowing
    // invalid values into the HTTP request header.
    if (!/^[A-Za-z0-9._-]+$/.test(apiKey)) {
      console.error(
        "Gemini API key contains invalid characters."
      );

      return jsonResponse({
        error: "The Gemini API key stored in Supabase has an invalid format. Please configure a fresh key.",
      }, 500);
    }

    console.log("Gemini API key validation passed.");

    // ==========================================
    // 2. READ REQUEST
    // ==========================================

    const body = await req.json();

    const missedQuestion = body?.missedQuestion;
    const messages = body?.messages ?? [];

    if (
      !missedQuestion ||
      typeof missedQuestion.question !== "string" ||
      !missedQuestion.question.trim()
    ) {
      return jsonResponse({
        error: "A valid missed question is required.",
      }, 400);
    }

    if (!Array.isArray(messages) || messages.length > 30) {
      return jsonResponse({
        error: "Invalid conversation history.",
      }, 400);
    }

    // ==========================================
    // 3. AI TUTOR TEACHING INSTRUCTIONS
    // ==========================================

    const systemInstruction = `
You are the Overmaths AI Study Coach, a patient,
high-quality examination tutor.

Your mission is to help students understand subjects,
correct mistakes, and become confident learners.

TEACHING RULES:

1. Explain concepts using simple, beginner-friendly language.
2. Teach step by step.
3. Never assume the student already understands.
4. Use relatable everyday examples and analogies.
5. Explain why the student's original answer was wrong.
6. Explain why the correct answer is correct.
7. Highlight common examination mistakes.
8. Give short examples where useful.
9. Ask the student a small question to check understanding.
10. Do not claim mastery just because a student says
    they understand.
11. Never invent facts or pretend an incorrect answer
    is correct.
12. Encourage the student and remain patient.
13. If the student asks an unrelated question, answer
    helpfully while guiding them back to their studies.

STUDENT'S MISSED QUESTION:

Subject: ${missedQuestion.subject || "Not specified"}

Topic: ${missedQuestion.topic || "Not specified"}

Question:
${missedQuestion.question}

Student's incorrect answer:
${missedQuestion.selectedAnswer || "Not provided"}

Correct answer:
${missedQuestion.correctAnswer || "Not provided"}

Available explanation:
${missedQuestion.explanation || "No explanation provided."}

IMPORTANT:

Start by teaching the student this particular question.
Explain the concept before simply revealing the answer.
Use a beginner-friendly teaching approach.
`;

    // ==========================================
    // 4. PREPARE CONVERSATION HISTORY
    // ==========================================

    const contents = messages
      .filter((message: any) => {
        return (
          message &&
          ["user", "assistant", "model"].includes(message.role) &&
          typeof (message.content ?? message.text) === "string"
        );
      })
      .map((message: any) => ({
        role:
          message.role === "assistant" ||
          message.role === "model"
            ? "model"
            : "user",

        parts: [
          {
            text: String(
              message.content ?? message.text
            ).slice(0, 6000),
          },
        ],
      }));

    // First lesson when there is no conversation history.
    if (contents.length === 0) {
      contents.push({
        role: "user",
        parts: [
          {
            text: "Please teach me this missed question step by step.",
          },
        ],
      });
    }

    // ==========================================
    // 5. SEND REQUEST TO GEMINI
    // ==========================================

    const model = "gemini-3.8-flash";

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    console.log("Sending request to Gemini:", model);

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },

      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: systemInstruction,
            },
          ],
        },

        contents,

        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1200,
        },
      }),
    });

    // ==========================================
    // 6. READ GEMINI RESPONSE
    // ==========================================

    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API request failed:", {
        status: geminiResponse.status,
        error: result?.error?.message || "Unknown Gemini error",
        code: result?.error?.code,
        statusText: result?.error?.status,
      });

      return jsonResponse({
        error:
          "Gemini could not generate a response. Please try again.",
        details:
          result?.error?.message || "Gemini API request failed.",
      }, 502);
    }

    // ==========================================
    // 7. EXTRACT AI RESPONSE
    // ==========================================

    const reply = result.candidates?.[0]?.content?.parts
      ?.map((part: any) => part.text || "")
      .join("")
      .trim();

    if (!reply) {
      console.error(
        "Gemini returned no text.",
        result.promptFeedback || result.candidates?.[0]?.finishReason
      );

      return jsonResponse({
        error: "The AI Tutor returned an empty response. Please try again.",
      }, 502);
    }

    console.log("AI Tutor response generated successfully.");

    // ==========================================
    // 8. RETURN RESPONSE TO OVERMATHS
    // ==========================================

    return jsonResponse({
      reply,
    });

  } catch (error) {
    console.error("AI Tutor backend error:", error);

    return jsonResponse({
      error:
        error instanceof Error
          ? error.message
          : "Something went wrong while contacting the AI Tutor.",
    }, 500);
  }
});
