const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

async function handleResponse(res, fallbackMessage = "Request failed") {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || fallbackMessage);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res, "Invalid credentials");
}

export async function registerUser(firstName, lastName, email, password) {
  const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, password }),
  });
  return handleResponse(res, "Registration failed");
}

export async function uploadInsuranceBill(file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE_URL}/api/v1/insurance/bills/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  return handleResponse(res, "Upload failed. Please try again.");
}

export async function lookupBillingCode(code, token) {
  const res = await fetch(`${API_BASE_URL}/api/v1/insurance/codes/${code}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(res, "Failed to look up billing code");
}
