-- Teléfono opcional; usuario público de WhatsApp como identidad alternativa
ALTER TABLE "directory_members" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "directory_members" ADD COLUMN "whatsapp_username" TEXT;
