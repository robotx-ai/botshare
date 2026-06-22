import bcrypt from "bcryptjs";
import prisma from "./prismadb";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 6;

/** Random 6-digit numeric code as a string ("000000"–"999999"). */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates (or replaces) the active verification code for an email and returns
 * the PLAINTEXT code so the caller can email it. Only the hash is stored.
 */
export async function issueVerificationCode(email: string): Promise<string> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MS);

  await prisma.emailVerificationCode.upsert({
    where: { email },
    update: { codeHash, expiresAt, attempts: 0 },
    create: { email, codeHash, expiresAt },
  });

  return code;
}

type ConfirmResult = { ok: true } | { ok: false; error: string };

/**
 * Validates a submitted code. On success, marks the user's email verified and
 * clears the code. Increments the attempt counter on a wrong guess.
 */
export async function confirmVerificationCode(
  email: string,
  code: string
): Promise<ConfirmResult> {
  const record = await prisma.emailVerificationCode.findUnique({ where: { email } });
  if (!record) {
    return { ok: false, error: "No verification request found. Please sign up again." };
  }
  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationCode.delete({ where: { email } }).catch(() => {});
    return { ok: false, error: "This code has expired. Request a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) {
    await prisma.emailVerificationCode.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Invalid or expired code." };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.emailVerificationCode.delete({ where: { email } }),
  ]);
  return { ok: true };
}

/**
 * Validates a code for a password reset. Same expiry/attempt/hash checks as
 * confirmVerificationCode, but on success it only clears the code — it does
 * NOT flip emailVerified or change the password (the caller does that). Used
 * by the forgot-password flow.
 */
export async function verifyResetCode(
  email: string,
  code: string
): Promise<ConfirmResult> {
  const record = await prisma.emailVerificationCode.findUnique({ where: { email } });
  if (!record) {
    return { ok: false, error: "No reset request found. Request a new code." };
  }
  if (record.expiresAt < new Date()) {
    await prisma.emailVerificationCode.delete({ where: { email } }).catch(() => {});
    return { ok: false, error: "This code has expired. Request a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts. Request a new code." };
  }

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) {
    await prisma.emailVerificationCode.update({
      where: { email },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, error: "Invalid or expired code." };
  }

  await prisma.emailVerificationCode.delete({ where: { email } });
  return { ok: true };
}
