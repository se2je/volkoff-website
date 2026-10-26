-- Достижения и лимит «раз в сутки» на смену аватарки и ника
ALTER TABLE "User" ADD COLUMN "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "avatarRerolledAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "nicknameRerolledAt" TIMESTAMP(3);
