import "dotenv/config";
import { createApp } from "./app";
import { logger } from "./logger";
import { emailConfigured, verifySmtp } from "./notifications/channels/email";

const port = Number(process.env.PORT || 4000);
const app = createApp();

const server = app.listen(port, () => {
  logger.info({ port }, "api listening");
  if (emailConfigured()) {
    void verifySmtp().then((problem) =>
      problem
        ? logger.warn({ host: process.env.SMTP_HOST, problem }, "smtp: verify failed - emails will not be delivered")
        : logger.info({ host: process.env.SMTP_HOST }, "smtp: ready"),
    );
  } else {
    logger.warn("smtp: SMTP_HOST not set - email notifications are disabled");
  }
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    logger.info({ signal }, "shutting down");
    server.close(() => process.exit(0));
  });
}
