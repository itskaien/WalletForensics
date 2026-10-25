-- CreateTable
CREATE TABLE "WalletScan" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "newestSignature" TEXT,
    "algorithmVersion" TEXT NOT NULL,
    "parserVersion" TEXT NOT NULL,
    "stats" JSONB NOT NULL,
    "grades" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "reportText" TEXT,

    CONSTRAINT "WalletScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WalletScan_address_createdAt_idx" ON "WalletScan"("address", "createdAt");
