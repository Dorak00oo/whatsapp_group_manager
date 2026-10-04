import assert from "node:assert/strict";
import { test } from "node:test";
import {
  directoryCsvTemplate,
  memberToDirectoryCsvRecord,
  parseDirectoryCsv,
  planCsvImport,
  serializeDirectoryCsv,
  type DirectoryCsvRecord,
} from "../src/lib/spreadsheet-members.ts";

const sample: DirectoryCsvRecord = {
  gamertag: "Steve",
  displayName: "Ana, la nota",
  phone: "+52 55 1234 5678",
  phoneCountry: "MX",
  whatsappUsername: "ana_player",
  age: 18,
  situation: "ausente",
  active: true,
  absentReason: "viaje, norte",
  isAdmin: true,
  banExempt: false,
  permanentlyActive: false,
  banned: true,
  bannedReason: "dupe",
  notes: "dice \"hola\"\ny se va",
};

test("exportar e importar el mismo CSV no crea a nadie", () => {
  const other: DirectoryCsvRecord = {
    ...sample,
    gamertag: "Alex",
    displayName: null,
    phone: null,
    phoneCountry: null,
    whatsappUsername: "alex_mc",
    age: null,
    situation: "activo",
    active: true,
    absentReason: null,
    isAdmin: false,
    banned: false,
    bannedReason: null,
    notes: null,
    permanentlyActive: true,
  };
  const csv = serializeDirectoryCsv([sample, other]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /^﻿gamertag,nombre,telefono,/);

  const parsed = parseDirectoryCsv(csv);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0]?.notes, sample.notes);
  assert.equal(parsed[0]?.displayName, sample.displayName);
  assert.equal(parsed[0]?.absent, true);
  assert.equal(parsed[0]?.active, true);
  assert.equal(parsed[1]?.permanentlyActive, true);
  assert.equal(parsed[1]?.whatsappUsername, "alex_mc");

  const plan = planCsvImport(parsed, [
    {
      gamertag: sample.gamertag,
      phone: sample.phone,
      whatsappUsername: sample.whatsappUsername,
    },
    {
      gamertag: other.gamertag,
      phone: other.phone,
      whatsappUsername: other.whatsappUsername,
    },
  ]);
  assert.equal(plan.create.length, 0);
  assert.equal(plan.errors.length, 0);
  assert.equal(plan.skipped.length, 2);
});

test("la plantilla solo trae la cabecera", () => {
  const parsed = parseDirectoryCsv(directoryCsvTemplate());
  assert.equal(parsed.length, 0);
});

test("acepta punto y coma, comillas y BOM", () => {
  const csv =
    "\uFEFFgamertag;nombre;telefono;notas\r\n" +
    'Nuevo;Ana;"5512345678";"hola; mundo\nlinea"\r\n';
  const parsed = parseDirectoryCsv(csv);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0]?.gamertag, "Nuevo");
  assert.equal(parsed[0]?.telefono, "5512345678");
  assert.equal(parsed[0]?.pais, "");
  assert.match(parsed[0]?.notes ?? "", /hola; mundo/);
});

test("cabeceras flexibles de la hoja vieja", () => {
  const csv = "Nombres,Gamertags,Teléfono,Protegido\nAna,Steve,+525512345678,si\n";
  const parsed = parseDirectoryCsv(csv);
  assert.equal(parsed[0]?.displayName, "Ana");
  assert.equal(parsed[0]?.gamertag, "Steve");
  assert.equal(parsed[0]?.banExempt, true);
});

test("salta por teléfono aunque el gamertag sea nuevo", () => {
  const csv = serializeDirectoryCsv([sample]);
  const parsed = parseDirectoryCsv(csv);
  const plan = planCsvImport(parsed, [
    {
      gamertag: "OtroNick",
      phone: sample.phone,
      whatsappUsername: null,
    },
  ]);
  assert.equal(plan.create.length, 0);
  assert.equal(plan.skipped[0]?.reason, "Mismo teléfono");
});

test("un alta que no está se prepara para crear", () => {
  const csv = "gamertag,telefono,usuario_whatsapp\nNuevo,+57 300 111 2233,\n";
  const plan = planCsvImport(parseDirectoryCsv(csv), []);
  assert.equal(plan.errors.length, 0);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.create[0]?.gamertag, "Nuevo");
  assert.equal(plan.create[0]?.active, true);
});

test("la segunda fila repetida en el archivo se salta", () => {
  const csv =
    "gamertag,telefono\nUno,+57 300 111 2233\nDos,+57 300 111 2233\n";
  const plan = planCsvImport(parseDirectoryCsv(csv), []);
  assert.equal(plan.create.length, 1);
  assert.equal(plan.skipped.length, 1);
  assert.equal(plan.skipped[0]?.gamertag, "Dos");
});

test("memberToDirectoryCsvRecord prioriza se salió sobre permanente", () => {
  const record = memberToDirectoryCsvRecord({
    gamertag: "A",
    displayName: null,
    phone: null,
    phoneCountry: null,
    whatsappUsername: null,
    age: null,
    active: false,
    permanentlyActive: true,
    absentWithCause: false,
    absentReason: null,
    leftAt: new Date(),
    isAdmin: false,
    banExempt: false,
    banned: false,
    bannedReason: null,
    notes: null,
  });
  assert.equal(record.situation, "se_salio");
  assert.equal(record.permanentlyActive, true);
});
