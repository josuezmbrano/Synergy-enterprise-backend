-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "processed_events" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "event_name" TEXT NOT NULL,
    "consumer" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'COMPLETED',
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "processed_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "processed_events_event_id_consumer_key" ON "processed_events"("event_id", "consumer");
