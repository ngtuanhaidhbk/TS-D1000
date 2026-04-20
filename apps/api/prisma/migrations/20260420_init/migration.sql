CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "AuthSessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "OperationMode" AS ENUM ('MANUAL', 'AUTOMATIC');
CREATE TYPE "LayoutFileType" AS ENUM ('PDF', 'JPG', 'JPEG');
CREATE TYPE "DeviceType" AS ENUM ('CHAIRMAN', 'DELEGATE');
CREATE TYPE "UnitRuntimeState" AS ENUM ('IDLE', 'REQUEST', 'SPEAKING', 'OFFLINE');
CREATE TYPE "CameraProtocol" AS ENUM ('ONVIF', 'VISCA');
CREATE TYPE "CameraStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'OFFLINE');
CREATE TYPE "SpeakingRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "RuntimeEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY,
  "username" VARCHAR(100) NOT NULL,
  "password_hash" VARCHAR(255) NOT NULL,
  "role" "UserRole" NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "created_by" UUID NULL,
  "updated_by" UUID NULL
);

CREATE UNIQUE INDEX "users_username_unique" ON "users" (LOWER("username"));
CREATE INDEX "users_status_idx" ON "users" ("status");

CREATE TABLE "auth_sessions" (
  "id" UUID PRIMARY KEY,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_jti" VARCHAR(100) NOT NULL,
  "status" "AuthSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "issued_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP NOT NULL,
  "revoked_at" TIMESTAMP NULL,
  "revoked_reason" VARCHAR(100) NULL,
  "last_seen_at" TIMESTAMP NULL,
  "client_type" VARCHAR(50) NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX "auth_sessions_token_jti_unique" ON "auth_sessions" ("token_jti");
CREATE INDEX "auth_sessions_user_status_idx" ON "auth_sessions" ("user_id", "status");
CREATE INDEX "auth_sessions_status_expires_idx" ON "auth_sessions" ("status", "expires_at");

CREATE TABLE "rooms" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(150) NOT NULL UNIQUE,
  "operation_mode" "OperationMode" NOT NULL DEFAULT 'MANUAL',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "layouts" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL UNIQUE REFERENCES "rooms"("id") ON DELETE CASCADE,
  "file_name" VARCHAR(255) NOT NULL,
  "file_path" VARCHAR(500) NOT NULL,
  "file_type" "LayoutFileType" NOT NULL,
  "width" INTEGER NULL,
  "height" INTEGER NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "layout_annotations" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "text" VARCHAR(500) NOT NULL,
  "pos_x" DECIMAL(10,4) NOT NULL,
  "pos_y" DECIMAL(10,4) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "layout_annotations_room_idx" ON "layout_annotations" ("room_id");

CREATE TABLE "layout_devices" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "ref_type" VARCHAR(20) NOT NULL,
  "ref_id" UUID NOT NULL,
  "pos_x" DECIMAL(10,4) NOT NULL,
  "pos_y" DECIMAL(10,4) NOT NULL,
  "icon_label" VARCHAR(100) NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "layout_devices_room_ref_unique" ON "layout_devices" ("room_id", "ref_type", "ref_id");

CREATE TABLE "tsd_connection_configs" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL UNIQUE REFERENCES "rooms"("id") ON DELETE CASCADE,
  "base_url" VARCHAR(255) NOT NULL,
  "username" VARCHAR(100) NULL,
  "password_encrypted" TEXT NULL,
  "sse_endpoint" VARCHAR(255) NOT NULL DEFAULT '/api/event',
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_test_at" TIMESTAMP NULL,
  "last_test_result" VARCHAR(20) NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "tsd_units" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "external_unit_id" VARCHAR(100) NOT NULL,
  "unit_name" VARCHAR(150) NULL,
  "device_type" "DeviceType" NOT NULL,
  "runtime_state" "UnitRuntimeState" NOT NULL DEFAULT 'IDLE',
  "is_connected" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_event_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "tsd_units_room_external_unique" ON "tsd_units" ("room_id", "external_unit_id");
CREATE INDEX "tsd_units_room_state_idx" ON "tsd_units" ("room_id", "runtime_state");

CREATE TABLE "cameras" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "name" VARCHAR(150) NOT NULL,
  "protocol" "CameraProtocol" NOT NULL,
  "ip_address" VARCHAR(100) NOT NULL,
  "port" INTEGER NULL,
  "username" VARCHAR(100) NULL,
  "password_encrypted" TEXT NULL,
  "rtsp_url" VARCHAR(500) NULL,
  "status" "CameraStatus" NOT NULL DEFAULT 'ACTIVE',
  "capability_ptz" BOOLEAN NOT NULL DEFAULT FALSE,
  "capability_preset" BOOLEAN NOT NULL DEFAULT FALSE,
  "capability_stream" BOOLEAN NOT NULL DEFAULT FALSE,
  "vendor" VARCHAR(100) NULL,
  "model" VARCHAR(100) NULL,
  "last_test_at" TIMESTAMP NULL,
  "last_test_result" VARCHAR(20) NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "cameras_room_ip_port_unique" ON "cameras" ("room_id", "ip_address", "port");

CREATE TABLE "camera_presets" (
  "id" UUID PRIMARY KEY,
  "camera_id" UUID NOT NULL REFERENCES "cameras"("id") ON DELETE CASCADE,
  "preset_code" VARCHAR(50) NOT NULL,
  "preset_name" VARCHAR(150) NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "camera_presets_camera_code_unique" ON "camera_presets" ("camera_id", "preset_code");

CREATE TABLE "mic_camera_mappings" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "unit_id" UUID NOT NULL REFERENCES "tsd_units"("id") ON DELETE CASCADE,
  "camera_id" UUID NOT NULL REFERENCES "cameras"("id") ON DELETE CASCADE,
  "preset_id" UUID NOT NULL REFERENCES "camera_presets"("id") ON DELETE CASCADE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "mic_camera_mappings_room_active_idx" ON "mic_camera_mappings" ("room_id", "is_active");
CREATE INDEX "mic_camera_mappings_unit_idx" ON "mic_camera_mappings" ("unit_id");

CREATE TABLE "runtime_events" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "event_type" VARCHAR(100) NOT NULL,
  "unit_id" UUID NULL REFERENCES "tsd_units"("id") ON DELETE SET NULL,
  "payload_json" JSONB NOT NULL,
  "received_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "processed_at" TIMESTAMP NULL,
  "processing_status" "RuntimeEventStatus" NOT NULL DEFAULT 'RECEIVED',
  "error_message" VARCHAR(500) NULL
);
CREATE INDEX "runtime_events_room_received_idx" ON "runtime_events" ("room_id", "received_at" DESC);
CREATE INDEX "runtime_events_type_received_idx" ON "runtime_events" ("event_type", "received_at" DESC);

CREATE TABLE "speaking_requests" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NOT NULL REFERENCES "rooms"("id") ON DELETE CASCADE,
  "unit_id" UUID NOT NULL REFERENCES "tsd_units"("id") ON DELETE CASCADE,
  "status" "SpeakingRequestStatus" NOT NULL,
  "requested_at" TIMESTAMP NOT NULL,
  "approved_at" TIMESTAMP NULL,
  "rejected_at" TIMESTAMP NULL,
  "resolved_by" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "source_event_id" UUID NULL REFERENCES "runtime_events"("id") ON DELETE SET NULL,
  "note" VARCHAR(255) NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "speaking_requests_room_status_requested_idx" ON "speaking_requests" ("room_id", "status", "requested_at" DESC);
CREATE INDEX "speaking_requests_unit_status_idx" ON "speaking_requests" ("unit_id", "status");

CREATE TABLE "camera_runtime_states" (
  "id" UUID PRIMARY KEY,
  "camera_id" UUID NOT NULL UNIQUE REFERENCES "cameras"("id") ON DELETE CASCADE,
  "current_preset_id" UUID NULL REFERENCES "camera_presets"("id") ON DELETE SET NULL,
  "current_unit_id" UUID NULL REFERENCES "tsd_units"("id") ON DELETE SET NULL,
  "last_switch_at" TIMESTAMP NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE "system_logs" (
  "id" UUID PRIMARY KEY,
  "room_id" UUID NULL REFERENCES "rooms"("id") ON DELETE SET NULL,
  "module" VARCHAR(100) NOT NULL,
  "level" "LogLevel" NOT NULL,
  "message" VARCHAR(1000) NOT NULL,
  "context_json" JSONB NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "system_logs_level_created_idx" ON "system_logs" ("level", "created_at" DESC);
CREATE INDEX "system_logs_module_created_idx" ON "system_logs" ("module", "created_at" DESC);

CREATE TABLE "audit_logs" (
  "id" UUID PRIMARY KEY,
  "actor_user_id" UUID NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "action" VARCHAR(50) NOT NULL,
  "target_type" VARCHAR(50) NOT NULL,
  "target_id" VARCHAR(100) NULL,
  "result" VARCHAR(20) NOT NULL,
  "detail_json" JSONB NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "audit_logs_actor_created_idx" ON "audit_logs" ("actor_user_id", "created_at" DESC);
CREATE INDEX "audit_logs_action_created_idx" ON "audit_logs" ("action", "created_at" DESC);
