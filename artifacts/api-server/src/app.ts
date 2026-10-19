import express, { type Express } from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);
app.use(
  cors((req, callback) => {
    const origin = req.get("origin");
    const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || req.get("host");
    let sameOrigin = false;

    if (origin && requestHost) {
      try {
        sameOrigin =
          new URL(origin).host.toLowerCase() === requestHost.toLowerCase();
      } catch {
        sameOrigin = false;
      }
    }

    callback(null, {
      origin: sameOrigin ? origin : false,
      credentials: true,
    });
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
