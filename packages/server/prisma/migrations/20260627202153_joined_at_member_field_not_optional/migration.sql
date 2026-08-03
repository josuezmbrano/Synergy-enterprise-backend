/*
  Warnings:

  - Made the column `joined_at` on table `members` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "members" ALTER COLUMN "joined_at" SET NOT NULL;
