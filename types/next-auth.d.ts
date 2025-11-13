declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      extension?: string | null;
    };
    sipgate?: {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: number;
      scope?: string;
      extension?: string;
      webuserId?: string;
      email?: string | null;
    };
  }

  interface User {
    extension?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    sipgateAccessToken?: string;
    sipgateRefreshToken?: string;
    sipgateExpiresAt?: number;
    sipgateScope?: string;
    sipgateExtension?: string | null;
    sipgateWebuserId?: string | null;
    sipgateUserEmail?: string | null;
    sipgateUserName?: string | null;
  }
}
