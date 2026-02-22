-- AlterEnum
ALTER TYPE "AIAction" ADD VALUE 'DISCUSS';

-- AlterTable
ALTER TABLE "highlight" ADD COLUMN     "color" TEXT NOT NULL DEFAULT 'yellow',
ADD COLUMN     "note" TEXT;

-- AlterTable
ALTER TABLE "reading_progress" ADD COLUMN     "highestPosition" JSONB;

-- CreateTable
CREATE TABLE "book_summary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_summary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_summary_bookId_key" ON "book_summary"("bookId");

-- CreateIndex
CREATE INDEX "book_summary_userId_idx" ON "book_summary"("userId");

-- AddForeignKey
ALTER TABLE "book_summary" ADD CONSTRAINT "book_summary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_summary" ADD CONSTRAINT "book_summary_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
