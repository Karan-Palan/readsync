-- CreateTable
CREATE TABLE "reading_goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetBooks" INTEGER NOT NULL DEFAULT 12,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_goal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reading_goal_userId_key" ON "reading_goal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reading_goal_userId_year_key" ON "reading_goal"("userId", "year");

-- AddForeignKey
ALTER TABLE "reading_goal" ADD CONSTRAINT "reading_goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
