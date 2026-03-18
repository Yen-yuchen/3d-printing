import path from "path";
import fs from "fs";
import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import jwt from "jsonwebtoken";

// NOTE: Cast to any to avoid Express type conflicts across node_modules
export const api: any = Router();

const JWT_SECRET = process.env.JWT_SECRET ?? "svp3rs3(r3t";

// ---------- File storage ----------
const STORAGE_DIR = path.resolve(process.cwd(), "storage");
fs.mkdirSync(STORAGE_DIR, { recursive: true });

// multer saves uploaded files to STORAGE_DIR with random filenames
const upload: any = multer({ dest: STORAGE_DIR });
const memoryUpload: any = multer({ storage: multer.memoryStorage() });

// ---------- Auth middleware (typed as any to avoid TS2769) ----------
const requireAuth: any = (req: any, res: any, next: any) => {
  const authHeader: string = req.headers?.authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) return res.status(401).json({ error: "missing token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user_id = Number(decoded?.user_id);

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return res.status(401).json({ error: "invalid token payload" });
    }

    req.user = { user_id };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
};

// ---------- Health ----------
api.get("/health", async (_req: any, res: any) => {
  try {
    const result = await pool.query("select now() as now");
    res.json({ ok: true, dbTime: result.rows[0].now });
  } catch (err) {
    console.error("DB health check failed", err);
    res.json({ ok: false, dbTime: null, error: "db unavailable" });
  }
});

// ---------- Users ----------
api.get("/users", async (_req: any, res: any) => {
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

api.post("/users", async (req: any, res: any) => {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  const name = String(req.body?.name ?? "").trim();

  if (!email || !name) {
    return res.status(400).json({ error: "email and name required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO public.users (email, name)
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

// Optional helper for UI (NOT auth)
api.get("/users/exists", async (req: any, res: any) => {
  const email = String(req.query?.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const result = await pool.query(
      `SELECT user_id, email, name, created_at
       FROM public.users
       WHERE lower(email) = $1
       LIMIT 1`,
      [email],
    );

    if (result.rowCount === 0) return res.json({ exists: false });
    return res.json({ exists: true, user: result.rows[0] });
  } catch (err) {
    console.error("Exists check failed:", err);
    res.status(500).json({ error: "db error" });
  }
});

// ---------- Login (email -> JWT with user_id) ----------
api.post("/login/email", async (req: any, res: any) => {
  const email = String(req.body?.email ?? "")
    .trim()
    .toLowerCase();
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const result = await pool.query(
      `SELECT user_id, email, name, created_at
       FROM public.users
       WHERE lower(email) = $1
       LIMIT 1`,
      [email],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: "no such user" });
    }

    const user = result.rows[0];

    const token = jwt.sign({ user_id: user.user_id }, JWT_SECRET, {
      expiresIn: "2h",
    });

    return res.json({ token, user });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "db error" });
  }
});

// Optional dev admin login (kept if you still use it)
api.post("/login", async (req: any, res: any) => {
  const { username, password } = req.body ?? {};
  const envUser = process.env.LOGIN_USER ?? "admin";
  const envPass = process.env.LOGIN_PASS ?? "password";

  if (!username || !password)
    return res.status(400).send("username and password required");
  if (username !== envUser || password !== envPass)
    return res.status(401).send("invalid credentials");

  const token = `devtoken-${Date.now()}`;
  res.json({ token });
});

// ---------- Models (AUTH REQUIRED) ----------

// List models for logged-in user
api.get("/models", requireAuth, async (req: any, res: any) => {
  const userId = Number(req.user?.user_id);

  try {
    const result = await pool.query(
      `SELECT model_id, user_id, model_name, file_format, uploaded_at
       FROM public.models
       WHERE user_id = $1
       ORDER BY uploaded_at DESC`,
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Failed to list models", err);
    res.status(500).json({ error: "db error" });
  }
});

// Upload model file + create DB row
api.post(
  "/models",
  requireAuth,
  upload.single("file") as any,
  async (req: any, res: any) => {
    console.log("Attempting to upload model");
    const userId = Number(req.user?.user_id);
    const file = req.file as any | undefined;

    if (!file) return res.status(400).json({ error: "file required" });

    // normalize/validate file_format to match your DB CHECK constraint
    const allowedFormats = new Set(["stl", "obj", "gltf", "glb"]);
    const original = file.originalname || "model";
    const ext = path.extname(original).replace(".", "").toLowerCase();

    if (!allowedFormats.has(ext)) {
      return res.status(400).json({
        error: `invalid file_format "${ext}". Allowed: stl, obj, gltf, glb`,
      });
    }

    const defaultName = path.basename(original, path.extname(original));
    const modelName =
      String(req.body?.model_name ?? defaultName).trim() || defaultName;

    const uploadedAt = req.body?.uploadedAt
      ? new Date(req.body.uploadedAt)
      : new Date();
    const filePath = file.filename; // currently storing multer filename
    const fileSizeBytes = Number(file.size ?? 0); // required NOT NULL in DB

    // If client sent model_id, update that row (must belong to this user)
    const modelIdRaw = String(req.body?.model_id ?? "").trim();
    const modelId = modelIdRaw ? Number(modelIdRaw) : null;

    try {
      if (modelId) {
        const result = await pool.query(
          `UPDATE public.models
       SET file_path = $1,
           file_format = $2,
           model_name = $3,
           uploaded_at = $4,
           file_size_bytes = $5
       WHERE model_id = $6 AND user_id = $7
       RETURNING model_id, user_id, file_path, file_format, model_name, uploaded_at, file_size_bytes`,
          [
            filePath,
            ext,
            modelName,
            uploadedAt,
            fileSizeBytes,
            modelId,
            userId,
          ],
        );

        if (result.rowCount === 0) {
          // either doesn't exist or doesn't belong to user
          return res.status(404).json({ error: "model not found" });
        }

        return res.status(200).json(result.rows[0]);
      }

      // Otherwise, insert new row
      const result = await pool.query(
        `INSERT INTO public.models
       (user_id, file_path, file_format, model_name, uploaded_at, file_size_bytes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING model_id, user_id, file_path, file_format, model_name, uploaded_at, file_size_bytes`,
        [userId, filePath, ext, modelName, uploadedAt, fileSizeBytes],
      );

      return res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error("Failed to save model", err);
      return res.status(500).json({ error: "db error" });
    }
  },
);

// Download model file (ownership enforced)
api.get("/models/:modelId/file", requireAuth, async (req: any, res: any) => {
  const userId = Number(req.user?.user_id);
  console.log("Getting model for download");
  const modelId = Number(req.params?.modelId);
  if (!Number.isFinite(modelId))
    return res.status(400).json({ error: "bad modelId" });

  try {
    const result = await pool.query(
      `SELECT model_id, user_id, file_path, file_format, model_name
       FROM public.models
       WHERE model_id = $1`,
      [modelId],
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "not found" });

    const row = result.rows[0];
    if (row.user_id !== userId)
      return res.status(403).json({ error: "forbidden" });

    const absPath = path.resolve(STORAGE_DIR, row.file_path);

    // prevent path traversal
    if (!absPath.startsWith(STORAGE_DIR)) {
      return res.status(400).json({ error: "invalid path" });
    }

    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: "file missing on server" });
    }

    const safeName = String(row.model_name ?? "model").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.${row.file_format}"`,
    );

    return res.sendFile(absPath);
  } catch (err) {
    console.error("Failed to send model file", err);
    return res.status(500).json({ error: "server error" });
  }
});

// Delete model (ownership enforced)
api.delete("/models/:modelId", requireAuth, async (req: any, res: any) => {
  console.log("attempting to delete model");
  const userId = Number(req.user?.user_id);
  const modelId = Number(req.params?.modelId);
  if (!Number.isFinite(modelId))
    return res.status(400).json({ error: "bad modelId" });

  try {
    const find = await pool.query(
      `SELECT model_id, user_id, file_path
       FROM public.models
       WHERE model_id = $1`,
      [modelId],
    );

    if (find.rowCount === 0)
      return res.status(404).json({ error: "not found" });

    const row = find.rows[0];
    if (row.user_id !== userId)
      return res.status(403).json({ error: "forbidden" });

    await pool.query(`DELETE FROM public.models WHERE model_id = $1`, [
      modelId,
    ]);

    const absPath = path.resolve(STORAGE_DIR, row.file_path);
    if (absPath.startsWith(STORAGE_DIR) && fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete model", err);
    return res.status(500).json({ error: "server error" });
  }
});

// save localy
api.post("/save-model", memoryUpload.single("model"), (req: any, res: any) => {
  try {
    const userId = String(req.body.userId || "local-user");
    const projectId = String(req.body.projectId || "default-project");

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const safeUserId = userId.replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeProjectId = projectId.replace(/[^a-zA-Z0-9._-]/g, "_");
    const safeFileName = String(req.file.originalname || "model.glb").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );

    const saveDir = path.join(
      process.cwd(),
      "storage",
      safeUserId,
      safeProjectId,
    );

    fs.mkdirSync(saveDir, { recursive: true });

    const filePath = path.join(saveDir, safeFileName);
    fs.writeFileSync(filePath, req.file.buffer);

    return res.json({
      message: "File saved successfully",
      filePath,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to save file" });
  }
});
