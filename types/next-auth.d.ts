declare module "next-auth" {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      extension?: string | undefined;
    };
    sipgate?: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      scope?: string;
      extension?: string;
      webuserId?: string;
      email?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sipgateAccessToken?: string;
    sipgateRefreshToken?: string;
    sipgateExpiresAt?: number;
    sipgateScope?: string;
    sipgateExtension?: string;
    sipgateWebuserId?: string;
    sipgateUserEmail?: string | null;
    sipgateUserName?: string | null;
  }
}
