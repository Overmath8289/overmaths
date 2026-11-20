
import { supabase } from "../supabaseClient";

const API_URL = "https://overmaths.onrender.com";

export async function getMissedQuestions() {
  const { data, error } = await supabase
    .from("ai_missed_questions")
    .select("*")
    .order("last_missed_at", { ascending: false });

  if (error) {
    console.error("Error fetching missed questions:", error);
    throw error;
  }

  return data || [];
}

export async function getOriginalQuestion(questionId) {
  if (!questionId) {
    throw new Error("Question ID is missing.");
  }

  const response = await fetch(
    `${API_URL}/api/questions/${encodeURIComponent(questionId)}`
  );

  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "The original question could not be found."
        : "Unable to retrieve the original question. Please try again."
    );
  }

  const data = await response.json();

  if (!data?.question) {
    throw new Error("The original question data is unavailable.");
  }

  return data.question;
}

export async function updateMissedQuestionStatus(id, status) {
  const { data, error } = await supabase
    .from("ai_missed_questions")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating missed question:", error);
    throw error;
  }

  return data;
}
