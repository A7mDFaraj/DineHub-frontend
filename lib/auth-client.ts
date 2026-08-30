import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: `${process.env.NEXT_PUBLIC_BETTER_AUTH_URL}/api/auth`,
  plugins: [
    inferAdditionalFields({
      user: {
        role: {
          type: "string",
          input: false,
        },
        branchId: {
          type: "string",
          required: false,
          input: false,
        },
      },
    }),
  ],
});

export const { signIn, signUp, useSession, signOut } = authClient;
