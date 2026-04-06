-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "cutLine" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Golfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "odds" INTEGER NOT NULL,
    "strokeScore" INTEGER,
    "competitionId" TEXT NOT NULL,
    CONSTRAINT "Golfer_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participantName" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competitionId" TEXT NOT NULL,
    CONSTRAINT "Pick_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PickGolfer" (
    "pickId" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,

    PRIMARY KEY ("pickId", "golferId"),
    CONSTRAINT "PickGolfer_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "Pick" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PickGolfer_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "Golfer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
