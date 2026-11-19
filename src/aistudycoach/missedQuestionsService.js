
import { supabase } from "../supabaseClient";

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
