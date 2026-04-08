"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhoneForDirectory } from "@/lib/phone-normalize";
export async function createDirectoryMember(
  _prev: { error?: string } | null,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado" };

  const gamertag = String(formData.get("gamertag") ?? "").trim();
  const phoneIso = String(formData.get("phoneCountry") ?? "")
    .trim()
    .toUpperCase();
  const phoneNational = String(formData.get("phoneNational") ?? "");
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const markedLeft = formData.get("markedLeft") === "on";
  const active = !markedLeft && formData.get("active") === "on";
  const isAdmin = formData.get("isAdmin") === "on";
  const banExempt = formData.get("banExempt") === "on";

  if (!gamertag) return { error: "El gamertag es obligatorio" };
  const normalized = normalizePhoneForDirectory(phoneIso, phoneNational);
  if (!normalized.ok) {
    return { error: normalized.error };
  }
  const { phone, phoneCountry } = normalized;

  await prisma.directoryMember.create({
    data: {
      gamertag,
      phone,
      phoneCountry,
      active: markedLeft ? false : active,
      leftAt: markedLeft ? new Date() : null,
      isAdmin,
      banExempt,
      notes: notesRaw || null,
      userId: session.user.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/agregar");
  redirect("/dashboard");
}

export async function deleteDirectoryMember(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado" };

  const result = await prisma.directoryMember.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) return { error: "No encontrado" };

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateDirectoryMemberNotes(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const id = String(formData.get("memberId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  if (!id) return;

  await prisma.directoryMember.updateMany({
    where: { id, userId: session.user.id },
    data: { notes: notes || null },
  });

  revalidatePath("/dashboard");
}

export async function setDirectoryMemberActive(id: string, active: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "No autorizado" };

  const result = await prisma.directoryMember.updateMany({
    where: { id, userId: session.user.id },
    data: { active },
  });

  if (result.count === 0) return { error: "No encontrado" };

  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function addDirectoryStrike(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const memberId = String(formData.get("memberId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!memberId || !reason) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id: memberId, userId: session.user.id },
  });
  if (!member) return;

  await prisma.directoryStrike.create({
    data: { memberId, reason },
  });

  revalidatePath("/dashboard");
}

export async function setDirectoryMemberBan(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return;

  const memberId = String(formData.get("memberId") ?? "").trim();
  const action = String(formData.get("banAction") ?? "").trim();
  if (!memberId || !action) return;

  if (action === "unban") {
    await prisma.directoryMember.updateMany({
      where: { id: memberId, userId: session.user.id },
      data: { banned: false, bannedReason: null },
    });
  } else if (action === "ban") {
    const bannedReason = String(formData.get("bannedReason") ?? "").trim();
    if (!bannedReason) return;
    await prisma.directoryMember.updateMany({
      where: {
        id: memberId,
        userId: session.user.id,
        banExempt: false,
      },
      data: { banned: true, bannedReason },
    });
  }

  revalidatePath("/dashboard");
}

export async function toggleDirectoryMemberIsAdmin(id: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId: session.user.id },
    select: { isAdmin: true },
  });
  if (!member) return;

  await prisma.directoryMember.updateMany({
    where: { id, userId: session.user.id },
    data: { isAdmin: !member.isAdmin },
  });

  revalidatePath("/dashboard");
}

export async function toggleDirectoryMemberBanExempt(id: string) {
  const session = await auth();
  if (!session?.user?.id) return;

  const member = await prisma.directoryMember.findFirst({
    where: { id, userId: session.user.id },
    select: { banExempt: true },
  });
  if (!member) return;

  const next = !member.banExempt;
  await prisma.directoryMember.updateMany({
    where: { id, userId: session.user.id },
    data: {
      banExempt: next,
      ...(next ? { banned: false, bannedReason: null } : {}),
    },
  });

  revalidatePath("/dashboard");
}

export async function setDirectoryMemberLeft(id: string, left: boolean) {
  const session = await auth();
  if (!session?.user?.id) return;

  await prisma.directoryMember.updateMany({
    where: { id, userId: session.user.id },
    data: left
      ? { leftAt: new Date(), active: false }
      : { leftAt: null },
  });

  revalidatePath("/dashboard");
}
