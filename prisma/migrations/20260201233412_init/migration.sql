-- CreateTable
CREATE TABLE "webhook_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "event_id" TEXT,
    "event_type" TEXT,
    "payload" TEXT NOT NULL,
    "headers" TEXT NOT NULL,
    "received_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_details" TEXT
);

-- CreateTable
CREATE TABLE "replay_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_id" INTEGER NOT NULL,
    "target_url" TEXT NOT NULL,
    "status_code" INTEGER,
    "response_body" TEXT,
    "replayed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    CONSTRAINT "replay_attempts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "webhook_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
