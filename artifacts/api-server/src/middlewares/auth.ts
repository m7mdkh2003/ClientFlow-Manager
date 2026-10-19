import { getAuth } from "@clerk/express";
import type { RequestHandler, Response } from "express";

const writeMethods = new Set(["POST", "PATCH", "PUT", "DELETE"]);

export const requireAuth: RequestHandler = (req, res, next) => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  res.locals.userId = userId;
  next();
};

export const requireSameOriginWrite: RequestHandler = (req, res, next) => {
  if (!writeMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.get("origin");
  const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
  const requestHost = forwardedHost || req.get("host");

  if (!origin || !requestHost) {
    res.status(403).json({ error: "Invalid request origin" });
    return;
  }

  try {
    const originHost = new URL(origin).host.toLowerCase();
    if (originHost !== requestHost.toLowerCase()) {
      res.status(403).json({ error: "Invalid request origin" });
      return;
    }
  } catch {
    res.status(403).json({ error: "Invalid request origin" });
    return;
  }

  next();
};

export function getAuthUserId(res: Response): string {
  const userId: unknown = res.locals.userId;
  if (typeof userId !== "string") {
    throw new Error("Authenticated request is missing its user ID");
  }
  return userId;
}
