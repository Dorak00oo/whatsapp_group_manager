export type StrikeDTO = {
  id: string;
  kind: "pending" | "definitive";
  reason: string;
  createdAt: string;
};

export type DirectoryMemberDTO = {
  id: string;
  gamertag: string;
  /** Nombre real u hoja «nombres»; el identificador principal sigue siendo gamertag. */
  displayName: string | null;
  phone: string | null;
  phoneCountry: string | null;
  /** Usuario público @usuario, distinto del nombre de perfil. */
  whatsappUsername: string | null;
  active: boolean;
  /** Mundos Bedrock donde está activo (sin blacklist). */
  activeOn: Array<"vanilla" | "mods">;
  permanentlyActive: boolean;
  absentWithCause: boolean;
  absentReason: string | null;
  isAdmin: boolean;
  banExempt: boolean;
  leftAt: string | null;
  banned: boolean;
  bannedReason: string | null;
  notes: string | null;
  createdAt: string;
  strikes: StrikeDTO[];
};
