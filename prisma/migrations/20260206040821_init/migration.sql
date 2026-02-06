-- CreateTable
CREATE TABLE "webhook_events" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "event_id" TEXT,
    "event_type" TEXT,
    "payload" TEXT NOT NULL,
    "headers" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "replay_attempts" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "target_url" TEXT NOT NULL,
    "status_code" INTEGER,
    "response_body" TEXT,
    "replayed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,

    CONSTRAINT "replay_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_received_at_idx" ON "webhook_events"("received_at");

-- CreateIndex
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events"("provider");

-- CreateIndex
CREATE INDEX "webhook_events_event_type_idx" ON "webhook_events"("event_type");

-- CreateIndex
CREATE INDEX "replay_attempts_event_id_idx" ON "replay_attempts"("event_id");

-- CreateIndex
CREATE INDEX "replay_attempts_replayed_at_idx" ON "replay_attempts"("replayed_at");

-- AddForeignKey
ALTER TABLE "replay_attempts" ADD CONSTRAINT "replay_attempts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "webhook_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
