const BASE = import.meta.env.VITE_API_BASE_URL || "";

async function handle(res, fallback = "Request failed") {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || fallback);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}


export async function loginUser(email, password) {
  const res = await fetch(`${BASE}/api/v1/auth/authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle(res, "Invalid credentials");
}

export async function registerUser(firstName, lastName, email, password) {
  const res = await fetch(`${BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, password }),
  });
  return handle(res, "Registration failed");
}


export async function uploadBill(file, token) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/api/v1/insurance/bills/upload`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });
  return handle(res, "Upload failed. Please ensure this is a valid PDF bill.");
}

export async function getUserBills(token) {
  const res = await fetch(`${BASE}/api/v1/insurance/bills`, {
    headers: authHeaders(token),
  });
  return handle(res, "Failed to fetch bills");
}

export async function getBill(id, token) {
  const res = await fetch(`${BASE}/api/v1/insurance/bills/${id}`, {
    headers: authHeaders(token),
  });
  return handle(res, "Failed to fetch bill");
}


export async function lookupCode(code, token) {
  const res = await fetch(`${BASE}/api/v1/insurance/codes/${code}`, {
    headers: authHeaders(token),
  });
  return handle(res, "Code not found");
}