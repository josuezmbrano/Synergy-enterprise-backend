/*
  Warnings:

  - The values [INVITED_PENDING] on the enum `MemberStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MemberStatus_new" AS ENUM ('ACTIVE', 'INACTIVE', 'ON_LEAVE');
ALTER TABLE "members" ALTER COLUMN "status" TYPE "MemberStatus_new" USING ("status"::text::"MemberStatus_new");
ALTER TYPE "MemberStatus" RENAME TO "MemberStatus_old";
ALTER TYPE "MemberStatus_new" RENAME TO "MemberStatus";
DROP TYPE "public"."MemberStatus_old";
COMMIT;
