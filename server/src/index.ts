import "dotenv/config";
import express from "express";
import cors from "cors";
import { api } from "./routes.js";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

app.use("/api", api);

app.get("/", (_req, res) => {
  res.send("Server is running. Try /api/projects");
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, "0.0.0.0");
