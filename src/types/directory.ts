export type StrikeDTO = {
  id: string;
  kind: "pending" | "definitive";
  reason: string;
  createdAt: string;
};

export type DirectoryMemberDTO = {
  id: string;
  gamertag: string;
  /** Segunda cuenta de Minecraft. Vacía si no tiene. */
  mcAccount2: string | null;
  /** Tercera cuenta de Minecraft. Vacía si no tiene. */
  mcAccount3: string | null;
  /** Nombre real u hoja «nombres»; el identificador principal sigue siendo gamertag. */
  displayName: string | null;
  /** Edad opcional (1–99). */
  age: number | null;
  phone: string | null;
  phoneCountry: string | null;
  /** Usuario público @usuario, distinto del nombre de perfil. */
  whatsappUsername: string | null;
  active: boolean;
  /** Mundos Bedrock donde está activo (sin blacklist). */
  activeOn: Array<"vanilla" | "mods">;
  permanentlyActive: boolean;
  /**
   * Fin de la protección de nuevo. Mientras esté en el futuro, la ficha
   * muestra activo permanente temporal. No es el flag manual.
   */
  permanentlyActiveUntil: string | null;
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
