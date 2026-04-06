-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "cutLine" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Golfer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "odds" INTEGER NOT NULL,
    "strokeScore" INTEGER,
    "competitionId" TEXT NOT NULL,

    CONSTRAINT "Golfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pick" (
    "id" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "competitionId" TEXT NOT NULL,

    CONSTRAINT "Pick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PickGolfer" (
    "pickId" TEXT NOT NULL,
    "golferId" TEXT NOT NULL,

    CONSTRAINT "PickGolfer_pkey" PRIMARY KEY ("pickId","golferId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Golfer" ADD CONSTRAINT "Golfer_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickGolfer" ADD CONSTRAINT "PickGolfer_pickId_fkey" FOREIGN KEY ("pickId") REFERENCES "Pick"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PickGolfer" ADD CONSTRAINT "PickGolfer_golferId_fkey" FOREIGN KEY ("golferId") REFERENCES "Golfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
