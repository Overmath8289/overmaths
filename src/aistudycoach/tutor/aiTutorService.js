
import { supabase } from "../../supabaseClient";

// Connect the frontend to our secure AI Tutor backend.
export async function askAITutor({
  missedQuestion,
  messages = [],
}) {
  if (!missedQuestion) {
    throw new Error("No missed question was provided.");
  }

  const { data, error } = await supabase.functions.invoke(
    "ai-tutor",
    {
      body: {
        missedQuestion: {
          question: missedQuestion.question_text,
          selectedAnswer: missedQuestion.selected_answer,
          correctAnswer: missedQuestion.correct_answer,
          explanation: missedQuestion.explanation,
          subject: missedQuestion.subject,
          topic: missedQuestion.topic,
        },
        messages,
      },
    }
  );

  if (error) {
    console.error("AI Tutor error:", error);
    throw new Error(
      error.message || "Unable to contact the AI Tutor."
    );
  }

  if (!data?.reply) {
    throw new Error("The AI Tutor returned an empty response.");
  }

  return data.reply;
}

