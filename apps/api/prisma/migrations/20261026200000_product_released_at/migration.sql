-- Дата выхода вещи: от неё считается «новинка» (14 дней) и сортировка «новое».
-- Отдельно от createdAt: каталог завели одним днём, а вещи выходили раньше.
ALTER TABLE "Product" ADD COLUMN "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Реально новые на момент миграции — только VK-019 и VK-020, остальное считаем старым дропом
UPDATE "Product" SET "releasedAt" = "createdAt" - INTERVAL '60 days' WHERE "code" NOT IN ('VK-019', 'VK-020');
UPDATE "Product" SET "releasedAt" = "createdAt" WHERE "code" IN ('VK-019', 'VK-020');

CREATE INDEX "Product_releasedAt_idx" ON "Product"("releasedAt");
