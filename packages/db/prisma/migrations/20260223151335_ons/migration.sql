-- CreateTable
CREATE TABLE "reading_session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "minutesRead" INTEGER NOT NULL DEFAULT 0,
    "pagesRead" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reading_session_userId_idx" ON "reading_session"("userId");

-- CreateIndex
CREATE INDEX "reading_session_userId_date_idx" ON "reading_session"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "reading_session_userId_bookId_date_key" ON "reading_session"("userId", "bookId", "date");

-- AddForeignKey
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
