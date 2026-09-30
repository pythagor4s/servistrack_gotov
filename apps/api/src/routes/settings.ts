import { Router } from "express";
import { testEmailSchema, type TestEmailInput } from "@servis-track/shared";
import { prisma } from "../db";
import { validate } from "../middleware/validate";
import { sendError } from "../middleware/errors";
import type { AuthedUser } from "../middleware/authenticate";
import { EmailChannel, emailConfigured, mailFrom, verifySmtp } from "../notifications/channels/email";

export const settingsRouter = Router();

settingsRouter.get("/email", async (_req, res) => {
  const problem = emailConfigured() ? await verifySmtp() : null;
  res.status(200).json({
    configured: emailConfigured(),
    host: process.env.SMTP_HOST || null,
    port: emailConfigured() ? Number(process.env.SMTP_PORT || 587) : null,
    from: emailConfigured() ? mailFrom() : null,
    ok: emailConfigured() && problem === null,
    error: problem,
  });
});

settingsRouter.post("/email/test", validate({ body: testEmailSchema }), async (req, res) => {
  const input = res.locals.valid.body as TestEmailInput;
  const authed = res.locals.user as AuthedUser;
  const to =
    input.to ??
    (await prisma.user.findUnique({ where: { id: authed.id }, select: { email: true } }))?.email;
  if (!to) {
    return sendError(res, 400, "validation_error", "No recipient - add an email to your profile or send `to`");
  }
  const result = await new EmailChannel().send({
    recipient: to,
    subject: "[ServisTrack] Preizkusna e-pošta",
    body:
      "To je preizkusno sporočilo iz ServisTracka.\n\n" +
      "Če ga berete, je pošiljanje e-pošte nastavljeno pravilno: obvestila o novih ticketih, " +
      "stanju in komentarjih bodo prihajala na ta naslov.",
  });
  req.log.info({ to, ok: result.ok, ...(result.ok ? {} : { error: result.error }) }, "test email");
  res.status(200).json({ to, ...result });
});
