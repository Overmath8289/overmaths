const API_URL = "https://overmaths.onrender.com";

export async function getDashboardSummary(userId) {
  if (!userId) {
    throw new Error("User ID is required.");
  }

  const response = await fetch(
    `${API_URL}/api/dashboard/summary?user_id=${encodeURIComponent(userId)}`
  );

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(
      data.error || "Unable to load dashboard data."
    );
  }

  return data;
}