import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload, UserRole } from "@kstack/types";

const getSecret = (raw: string) => new TextEncoder().encode(raw);

function requireSecret(name: string, devFallback: string): string {
  const val = process.env[name];
  if (!val) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error(`[FATAL] Missing required environment variable: ${name}`);
    }
    console.warn(`[SECURITY WARNING] ${name} is not set — using insecure dev fallback. Never deploy without this env var.`);
    return devFallback;
  }
  return val;
}

const JWT_SECRET = requireSecret("JWT_SECRET", "dev-secret-change-in-production-32chars");
const JWT_REFRESH_SECRET = requireSecret("JWT_REFRESH_SECRET", "dev-refresh-change-in-production-32chars");

const ACCESS_TOKEN_TTL = "15m";
const REFRESH_TOKEN_TTL = "30d";

export interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: UserRole;
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .sign(getSecret(JWT_SECRET));
}

export async function signRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .sign(getSecret(JWT_REFRESH_SECRET));
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret(JWT_SECRET));
  return payload as unknown as JwtPayload;
}

export async function verifyRefreshToken(token: string): Promise<{ sub: string }> {
  const { payload } = await jwtVerify(token, getSecret(JWT_REFRESH_SECRET));
  return { sub: payload.sub as string };
}

