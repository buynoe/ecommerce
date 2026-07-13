-- Add option-level image fields to ProductImage
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "optionName" TEXT;
ALTER TABLE "ProductImage" ADD COLUMN IF NOT EXISTS "optionValue" TEXT;

-- Index for fast lookup by product + option
CREATE INDEX IF NOT EXISTS "ProductImage_productId_optionName_optionValue_idx"
  ON "ProductImage" ("productId", "optionName", "optionValue");
