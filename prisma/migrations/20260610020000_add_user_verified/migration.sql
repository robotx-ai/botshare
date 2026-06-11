-- Provider verification badge (admin-granted; non-blocking for listing)
ALTER TABLE "User" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;
