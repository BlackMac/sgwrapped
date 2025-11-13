import { randomUUID } from "crypto";
console.log("[auth.config] module loaded");
import { sipgateIO } from "sipgateio";
import type { Session } from "next-auth";
import type { OAuthConfig } from "next-auth/providers";
import type { TokenEndpointHandler } from "next-auth/providers/oauth";
import type { JWT } from "next-auth/jwt";

type SipgateProfile = {
  sub?: string;
  id?: string;
  webuserId?: string;
  email?: string;
  name?: string;
  firstname?: string;
  lastname?: string;
  extension?: string;
  internalNumber?: string;
  avatar?: string;
  image?: string;
  picture?: string;
  [key: string]: unknown;
};

type MutableToken = {
  [key: string]: unknown;
  sipgateAccessToken?: string;
  sipgateRefreshToken?: string;
  sipgateExpiresAt?: number;
  sipgateScope?: string;
  sipgateExtension?: string;
  sipgateWebuserId?: string;
  sipgateUserEmail?: string | null;
  sipgateUserName?: string | null;
};

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[auth.config] Missing ${name}. Check your environment variables.`,
    );
  }
  return value;
};

type TokenRequestContext = Parameters<
  NonNullable<TokenEndpointHandler["request"]>
>[0];
type AccountLike = {
  access_token?: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  scope?: string | null;
};
type ProfileLike = {
  extension?: string | null;
  internalNumber?: string | null;
  webuserId?: string | null;
  id?: string | null;
  sub?: string | null;
  email?: string | null;
};

const sipgateProvider: OAuthConfig<SipgateProfile> = {
  id: "sipgate",
  name: "sipgate",
  type: "oauth",
  clientId: required("SIPGATE_CLIENT_ID"),
  clientSecret: required("SIPGATE_CLIENT_SECRET"),
  authorization: {
    url: required("SIPGATE_OAUTH_AUTHORIZATION_URL"),
    params: {
      scope: process.env.SIPGATE_OAUTH_SCOPE ?? "history:read numbers:read",
      prompt: "consent",
    },
  },
  token: {
    url: required("SIPGATE_OAUTH_TOKEN_URL"),
    async request(context: TokenRequestContext) {
      const { params, provider } = context;
      console.log("[sipgate] token.request invoked", {
        params,
        hasProvider: Boolean(provider),
      });
      const tokenUrl = required("SIPGATE_OAUTH_TOKEN_URL");
      const searchParams = new URLSearchParams();
      Object.entries({
        grant_type: "authorization_code",
        client_id: provider.clientId,
        client_secret: provider.clientSecret ?? "",
        ...params,
      }).forEach(([key, value]) => {
        if (typeof value === "string") {
          searchParams.set(key, value);
        }
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: searchParams,
      });

      const text = await response.text();
      console.log("[sipgate] token.response", {
        status: response.status,
        bodyPreview: text.slice(0, 200),
      });
      try {
        const tokens = JSON.parse(text);
        return { tokens };
      } catch (error) {
        console.error("[sipgate] Token exchange failed", {
          status: response.status,
          body: text,
        });
        throw error;
      }
    },
  },
  userinfo: required("SIPGATE_OAUTH_USERINFO_URL"),
  checks: ["pkce", "state"],
  profile(profile) {
    const fullName =
      profile.name ??
      [profile.firstname, profile.lastname].filter(Boolean).join(" ").trim();

    return {
      id:
        profile.sub ??
        profile.id ??
        profile.webuserId ??
        profile.email ??
        randomUUID(),
      name: fullName || profile.email || "sipgate user",
      email: profile.email ?? null,
      image: (profile.avatar ?? profile.image ?? profile.picture) as
        | string
        | null
        | undefined,
      extension: profile.extension ?? profile.internalNumber ?? null,
      webuserId: profile.webuserId ?? profile.id ?? profile.sub ?? null,
    } as {
      id: string;
      name: string;
      email: string | null;
      image?: string | null;
      extension?: string | null;
      webuserId?: string | null;
    };
  },
};

export const authConfig = {
  debug: process.env.NODE_ENV !== "production",
  trustHost: process.env.AUTH_TRUST_HOST === "true",
  session: { strategy: "jwt" },
  providers: [sipgateProvider],
  callbacks: {
    async jwt({
      token,
      account,
      profile,
    }: {
      token: JWT;
      account?: AccountLike | null;
      profile?: ProfileLike | null;
    }) {
      if (account) {
        token.sipgateAccessToken = account.access_token ?? undefined;
        token.sipgateRefreshToken = account.refresh_token ?? undefined;
        token.sipgateExpiresAt = account.expires_at
          ? account.expires_at * 1000
          : undefined;
        token.sipgateScope = account.scope ?? undefined;
      }

      if (profile) {
        token.sipgateExtension =
          profile.extension ?? profile.internalNumber ?? undefined;
        token.sipgateWebuserId =
          profile.webuserId ?? profile.id ?? profile.sub ?? undefined;
      }

      if (
        token.sipgateAccessToken &&
        (!token.sipgateUserEmail || !token.sipgateUserName)
      ) {
        token = await hydrateSipgateUser(token as MutableToken);
      }

      return token;
    },
    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT & { sub?: string };
    }) {
      session.user = {
        ...session.user,
        id: token.sub ?? session.user?.id ?? "",
        extension: token.sipgateExtension,
        email: token.sipgateUserEmail ?? session.user?.email ?? null,
        name: token.sipgateUserName ?? session.user?.name ?? null,
      };
      session.sipgate = {
        accessToken: token.sipgateAccessToken,
        refreshToken: token.sipgateRefreshToken,
        expiresAt:
          typeof token.sipgateExpiresAt === "number"
            ? token.sipgateExpiresAt
            : undefined,
        scope: token.sipgateScope,
        extension: token.sipgateExtension ?? undefined,
        webuserId: token.sipgateWebuserId ?? undefined,
        email: token.sipgateUserEmail ?? undefined,
      };

      return session;
    },
  },
};

async function hydrateSipgateUser(token: MutableToken) {
  if (!token.sipgateAccessToken) {
    return token;
  }
  try {
    const client = sipgateIO({ token: token.sipgateAccessToken });
    const webuserId =
      token.sipgateWebuserId ?? (await client.getAuthenticatedWebuserId());

    const webUsers = await client.getWebUsers();
    const activeUser = webUsers.find((user) => user.id === webuserId);

    if (activeUser) {
      const fullName = [activeUser.firstname, activeUser.lastname]
        .filter(Boolean)
        .join(" ")
        .trim();

      token.sipgateUserEmail = activeUser.email ?? token.sipgateUserEmail;
      token.sipgateUserName =
        fullName || activeUser.email || token.sipgateUserName;
      token.sipgateWebuserId = webuserId;
    }
  } catch (error) {
    console.error("[sipgate] Failed to hydrate webuser profile", error);
  }

  return token;
}
