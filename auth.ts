import NextAuth from "next-auth";
import type { Session } from "next-auth";
import { authConfig } from "./auth.config";

type AuthConfigShape = typeof authConfig;
type RequestHandler = (request: Request, context?: unknown) => Promise<Response> | Response;
type NextAuthReturn = {
  handlers: {
    GET: RequestHandler;
    POST: RequestHandler;
  };
  auth: (...args: unknown[]) => Promise<Session | null>;
  signIn: (...args: unknown[]) => Promise<unknown>;
  signOut: (...args: unknown[]) => Promise<unknown>;
};

type NextAuthFactory = (options: AuthConfigShape) => NextAuthReturn;

const authHandler = (NextAuth as unknown as NextAuthFactory)(authConfig);

export const { handlers, auth, signIn, signOut } = authHandler;

export const { GET, POST } = handlers;
