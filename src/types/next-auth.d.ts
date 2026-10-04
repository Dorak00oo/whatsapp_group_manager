import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      /** User comunitario (dueño interno de los datos), no la persona que entró. */
      id: string;
      gamertag: string;
      isPanelOwner: boolean;
    };
  }

  interface User {
    gamertag?: string;
    isPanelOwner?: boolean;
    /** `PanelAccount.id`; `null` para el dueño (cuenta por env). */
    accountId?: string | null;
    credentialKey?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    gamertag?: string;
    isPanelOwner?: boolean;
    accountId?: string | null;
    /** Huella de la contraseña usada al entrar (`passwordFingerprint`). */
    credentialKey?: string;
  }
}
