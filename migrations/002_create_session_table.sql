-- Session table for simple auth system
-- This replaces Better Auth's session management

CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY,
    "token" text NOT NULL UNIQUE,
    "userId" text NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "createdAt" timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
);

-- User table for simple auth system
CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY,
    "email" text NOT NULL UNIQUE,
    "name" text,
    "createdAt" timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
);

-- Account table for simple auth system
CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY,
    "userId" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "providerId" text NOT NULL,
    "password" text,
    "createdAt" timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_session_token" ON "session"("token");
CREATE INDEX IF NOT EXISTS "idx_session_userId" ON "session"("userId");
CREATE INDEX IF NOT EXISTS "idx_account_userId" ON "account"("userId");
CREATE INDEX IF NOT EXISTS "idx_user_email" ON "user"("email");
