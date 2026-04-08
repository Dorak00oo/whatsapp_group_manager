export type StrikeDTO = {
  id: string;
  reason: string;
  createdAt: string;
};

export type DirectoryMemberDTO = {
  id: string;
  gamertag: string;
  phone: string;
  phoneCountry: string | null;
  active: boolean;
  isAdmin: boolean;
  banExempt: boolean;
  leftAt: string | null;
  banned: boolean;
  bannedReason: string | null;
  notes: string | null;
  createdAt: string;
  strikes: StrikeDTO[];
};
