import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { clearAuthToken, getAuthToken, storeAuthToken } from "./auth-token";

const authServerUrl = (
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ?? "https://dinehub-backend-42eq.onrender.com"
).replace(/\/+$/, "");

export const authClient = createAuthClient({
  baseURL: `${authServerUrl}/api/auth`,
  fetchOptions: {
    credentials: "include",
    auth: {
      type: "Bearer",
      token: getAuthToken,
    },
    onSuccess(context) {
      const token = context.response.headers.get("set-auth-token");
      if (token) {
        storeAuthToken(token);
      }
    },
  },
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

export const { signIn, signUp, useSession } = authClient;

export async function signOut() {
  try {
    return await authClient.signOut();
  } finally {
    clearAuthToken();
  }
}
