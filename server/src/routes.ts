import { Router } from "express";
import { pool } from "../db";

export const api = Router();

api.get("/health", async (_req, res) => {
  try {
    const result = await pool.query("select now() as now");
    res.json({ ok: true, dbTime: result.rows[0].now });
  } catch (err) {
    console.error("DB health check failed", err);
    res.json({ ok: false, dbTime: null, error: "db unavailable" });
  }
});

// read users
api.get("/users", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT user_id, email, name, created_at FROM public.users ORDER BY user_id ASC",
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to read users", err);
    res.status(500).json({ error: "db error" });
  }
});

// Check if a user exists by email (for simple email-only login UI)
// Call: GET /api/users/exists?email=someone@example.com
api.get("/users/exists", async (req, res) => {
  const email = (req.query.email as string | undefined) ?? "";
  if (!email) return res.status(400).send("email required");

  try {
    const result = await pool.query(
      "SELECT user_id, email, name, created_at FROM public.users WHERE lower(email) = lower($1) LIMIT 1",
      [email],
    );

    if (result.rowCount && result.rows[0]) {
      return res.json({ exists: true, user: result.rows[0] });
    }
    return res.json({ exists: false });
  } catch (err: any) {
    console.error(
      "Failed to check user existence",
      err && err.message ? err.message : err,
    );
    return res.status(500).json({ error: "db error" });
  }
});

// create a user
api.post("/users", async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ error: "Email and name required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (email, name)
       VALUES ($1, $2)
       RETURNING user_id, email, name, created_at`,
      [email, name],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Insert failed:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Simple login endpoint (development): returns a token when credentials match env vars
api.post("/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  const envUser = process.env.LOGIN_USER ?? "admin";
  const envPass = process.env.LOGIN_PASS ?? "password";

  if (!username || !password)
    return res.status(400).send("username and password required");
  if (username !== envUser || password !== envPass)
    return res.status(401).send("invalid credentials");

  // In production use signed JWTs; for now return a simple opaque token
  const token = `devtoken-${Date.now()}`;
  res.json({ token });
});
