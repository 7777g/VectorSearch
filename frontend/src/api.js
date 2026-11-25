// TALKING TO THE BACKEND
// The backend is the Python server (FastAPI). Every screen asks it for data using the "api" function below.
// "token" = a login ticket. The server gives it to us after login, and we show it with every next request.

// Address of the FastAPI backend
const BASE = "https://vectorsearch-1.onrender.com";

// One function for all backend calls.
// options: method, token, json (for JSON body), form (for FormData / login form)
export async function api(path, options = {}) {
  const headers = {};
  let body;

  if (options.token) {
    headers.Authorization = "Bearer " + options.token;
  }
  if (options.json) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  }
  if (options.form) {
    body = options.form;
  }

  let res;
  try {
    res = await fetch(BASE + path, { method: options.method || "GET", headers: headers, body: body });
  } catch (e) {
    throw new Error("Cannot reach the server. Is the backend running?");
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (data && typeof data.detail === "string") {
      throw new Error(data.detail);
    }
    throw new Error("Something went wrong. Please check the form.");
  }
  return data;
}

// Reads the role and user id from the login token.
// Returns null if the token is broken or expired.
export function getUser(token) {
  try {
    const middle = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const data = JSON.parse(atob(middle));
    if (data.exp * 1000 < Date.now()) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// Opens a PDF in a new tab. The file needs the login token, so we download it first.
export async function openFile(id, token) {
  const win = window.open("", "_blank"); // opened first so the browser does not block it
  try {
    const res = await fetch(BASE + "/documents/" + id + "/file", {
      headers: { Authorization: "Bearer " + token },
    });
    if (!res.ok) throw new Error("bad");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (win) win.location = url;
    else window.open(url, "_blank");
  } catch (e) {
    if (win) win.close();
    throw new Error("Cannot open this file.");
  }
}
