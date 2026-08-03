/*
  Warnings:

  - You are about to drop the column `dueDate` on the `tasks` table. All the data in the column will be lost.
  - Added the required column `due_date` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tasks" DROP COLUMN "dueDate",
ADD COLUMN     "due_date" TIMESTAMP(3) NOT NULL;
