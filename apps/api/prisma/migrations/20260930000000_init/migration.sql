CREATE TYPE "Role" AS ENUM ('ADMIN', 'TECHNICIAN');

CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'SERVICER_COMING', 'RESOLVED');

CREATE TYPE "TicketPriority" AS ENUM ('NORMAL', 'HIGH');

CREATE TYPE "TicketType" AS ENUM ('MACHINE', 'SOFTWARE', 'FACILITY', 'OTHER');

CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'WEBHOOK');

CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED');

CREATE TYPE "AttemptOutcome" AS ENUM ('SUCCESS', 'FAILURE');

CREATE TYPE "NotificationAudience" AS ENUM ('SERVICER', 'STAFF', 'REPORTER', 'SYSTEM');

CREATE TYPE "ThemePref" AS ENUM ('DARK', 'LIGHT');

CREATE TYPE "ListView" AS ENUM ('CARDS', 'TABLE');

CREATE TYPE "CalendarColor" AS ENUM ('BLUE', 'GREEN', 'ORANGE', 'RED', 'VIOLET', 'GRAY');

CREATE TYPE "DepartmentColor" AS ENUM ('BLUE', 'SKY', 'TEAL', 'GREEN', 'LIME', 'AMBER', 'ORANGE', 'PINK', 'VIOLET', 'GRAY');

CREATE TYPE "RecurrenceUnit" AS ENUM ('WEEK', 'MONTH', 'YEAR');

CREATE TYPE "ExternalCodeKind" AS ENUM ('MACHINE', 'DEPARTMENT', 'CATEGORY', 'WORKER');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "theme" "ThemePref" NOT NULL DEFAULT 'DARK',
    "viewTickets" "ListView" NOT NULL DEFAULT 'TABLE',
    "viewMachines" "ListView" NOT NULL DEFAULT 'CARDS',
    "viewServicers" "ListView" NOT NULL DEFAULT 'TABLE',
    "viewUsers" "ListView" NOT NULL DEFAULT 'TABLE',
    "notifyEmail" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_images" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" "DepartmentColor" NOT NULL DEFAULT 'GRAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machine_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "machine_types_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machines" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNo" TEXT,
    "departmentId" TEXT,
    "typeId" TEXT,
    "attachedToId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "machine_images" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machine_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" "TicketType" NOT NULL DEFAULT 'OTHER',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "assigneeId" TEXT,
    "departmentId" TEXT,
    "machineId" TEXT,
    "faultDate" TIMESTAMP(3),
    "reporterName" TEXT,
    "reporterId" TEXT,
    "assignedServicerId" TEXT,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "externalSource" TEXT,
    "externalId" TEXT,
    "description" TEXT,
    "categoryId" TEXT,
    "externalRefs" JSONB,
    "machineDown" BOOLEAN NOT NULL DEFAULT false,
    "workOrderNo" TEXT,
    "servicerEta" TIMESTAMP(3),
    "serviceCostCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_events" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "from" "TicketStatus",
    "to" "TicketStatus" NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "servicers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "specialty" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_articles" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "TicketType" NOT NULL DEFAULT 'OTHER',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "departmentId" TEXT,
    "machineId" TEXT,
    "ticketId" TEXT,
    "createdById" TEXT,
    "categoryId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_articles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fault_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fault_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "knowledge_feedback" (
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_feedback_pkey" PRIMARY KEY ("articleId","userId")
);

CREATE TABLE "calendar_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" "CalendarColor" NOT NULL DEFAULT 'BLUE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "categoryId" TEXT,
    "machineId" TEXT,
    "servicerId" TEXT,
    "assigneeId" TEXT,
    "date" DATE NOT NULL,
    "startMinute" INTEGER,
    "endMinute" INTEGER,
    "recurrenceUnit" "RecurrenceUnit",
    "recurrenceInterval" INTEGER NOT NULL DEFAULT 1,
    "recurrenceUntil" DATE,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "calendar_completions" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "completedById" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_completions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "audience" "NotificationAudience" NOT NULL DEFAULT 'SERVICER',
    "key" TEXT NOT NULL DEFAULT 'servicer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "delivery_attempts" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "outcome" "AttemptOutcome" NOT NULL,
    "error" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "hashedKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_codes" (
    "id" TEXT NOT NULL,
    "kind" "ExternalCodeKind" NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "machineId" TEXT,
    "departmentId" TEXT,
    "categoryId" TEXT,
    "userId" TEXT,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_comments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "users_departmentId_idx" ON "users"("departmentId");

CREATE UNIQUE INDEX "user_images_userId_key" ON "user_images"("userId");

CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

CREATE UNIQUE INDEX "machine_types_name_key" ON "machine_types"("name");

CREATE INDEX "machines_departmentId_idx" ON "machines"("departmentId");

CREATE INDEX "machines_typeId_idx" ON "machines"("typeId");

CREATE INDEX "machines_attachedToId_idx" ON "machines"("attachedToId");

CREATE UNIQUE INDEX "machine_images_machineId_key" ON "machine_images"("machineId");

CREATE UNIQUE INDEX "tickets_number_key" ON "tickets"("number");

CREATE INDEX "tickets_status_idx" ON "tickets"("status");

CREATE INDEX "tickets_priority_idx" ON "tickets"("priority");

CREATE INDEX "tickets_assigneeId_idx" ON "tickets"("assigneeId");

CREATE INDEX "tickets_departmentId_idx" ON "tickets"("departmentId");

CREATE INDEX "tickets_machineId_idx" ON "tickets"("machineId");

CREATE INDEX "tickets_assignedServicerId_idx" ON "tickets"("assignedServicerId");

CREATE INDEX "tickets_reporterId_idx" ON "tickets"("reporterId");

CREATE INDEX "tickets_categoryId_idx" ON "tickets"("categoryId");

CREATE INDEX "tickets_servicerEta_idx" ON "tickets"("servicerEta");

CREATE UNIQUE INDEX "tickets_externalSource_externalId_key" ON "tickets"("externalSource", "externalId");

CREATE INDEX "ticket_events_ticketId_createdAt_idx" ON "ticket_events"("ticketId", "createdAt");

CREATE INDEX "ticket_attachments_ticketId_idx" ON "ticket_attachments"("ticketId");

CREATE INDEX "knowledge_articles_published_idx" ON "knowledge_articles"("published");

CREATE INDEX "knowledge_articles_type_idx" ON "knowledge_articles"("type");

CREATE INDEX "knowledge_articles_departmentId_idx" ON "knowledge_articles"("departmentId");

CREATE INDEX "knowledge_articles_machineId_idx" ON "knowledge_articles"("machineId");

CREATE INDEX "knowledge_articles_ticketId_idx" ON "knowledge_articles"("ticketId");

CREATE INDEX "knowledge_articles_createdById_idx" ON "knowledge_articles"("createdById");

CREATE INDEX "knowledge_articles_categoryId_idx" ON "knowledge_articles"("categoryId");

CREATE UNIQUE INDEX "fault_categories_name_key" ON "fault_categories"("name");

CREATE INDEX "knowledge_feedback_userId_idx" ON "knowledge_feedback"("userId");

CREATE UNIQUE INDEX "calendar_categories_name_key" ON "calendar_categories"("name");

CREATE INDEX "calendar_tasks_date_idx" ON "calendar_tasks"("date");

CREATE INDEX "calendar_tasks_categoryId_idx" ON "calendar_tasks"("categoryId");

CREATE INDEX "calendar_tasks_machineId_idx" ON "calendar_tasks"("machineId");

CREATE INDEX "calendar_tasks_servicerId_idx" ON "calendar_tasks"("servicerId");

CREATE INDEX "calendar_tasks_assigneeId_idx" ON "calendar_tasks"("assigneeId");

CREATE INDEX "calendar_tasks_createdById_idx" ON "calendar_tasks"("createdById");

CREATE INDEX "calendar_completions_completedById_idx" ON "calendar_completions"("completedById");

CREATE UNIQUE INDEX "calendar_completions_taskId_occurrenceDate_key" ON "calendar_completions"("taskId", "occurrenceDate");

CREATE INDEX "notifications_status_idx" ON "notifications"("status");

CREATE UNIQUE INDEX "notifications_ticketId_channel_key_key" ON "notifications"("ticketId", "channel", "key");

CREATE INDEX "delivery_attempts_notificationId_idx" ON "delivery_attempts"("notificationId");

CREATE UNIQUE INDEX "delivery_attempts_notificationId_attemptNumber_key" ON "delivery_attempts"("notificationId", "attemptNumber");

CREATE UNIQUE INDEX "api_keys_hashedKey_key" ON "api_keys"("hashedKey");

CREATE INDEX "external_codes_machineId_idx" ON "external_codes"("machineId");

CREATE INDEX "external_codes_departmentId_idx" ON "external_codes"("departmentId");

CREATE INDEX "external_codes_categoryId_idx" ON "external_codes"("categoryId");

CREATE INDEX "external_codes_userId_idx" ON "external_codes"("userId");

CREATE UNIQUE INDEX "external_codes_kind_code_key" ON "external_codes"("kind", "code");

CREATE INDEX "ticket_comments_ticketId_createdAt_idx" ON "ticket_comments"("ticketId", "createdAt");

CREATE INDEX "ticket_comments_authorId_idx" ON "ticket_comments"("authorId");

ALTER TABLE "users" ADD CONSTRAINT "users_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "user_images" ADD CONSTRAINT "user_images_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "machines" ADD CONSTRAINT "machines_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "machines" ADD CONSTRAINT "machines_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "machine_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "machines" ADD CONSTRAINT "machines_attachedToId_fkey" FOREIGN KEY ("attachedToId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "machine_images" ADD CONSTRAINT "machine_images_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedServicerId_fkey" FOREIGN KEY ("assignedServicerId") REFERENCES "servicers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tickets" ADD CONSTRAINT "tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fault_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fault_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "knowledge_feedback" ADD CONSTRAINT "knowledge_feedback_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "knowledge_feedback" ADD CONSTRAINT "knowledge_feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_tasks" ADD CONSTRAINT "calendar_tasks_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "calendar_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "calendar_tasks" ADD CONSTRAINT "calendar_tasks_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "calendar_tasks" ADD CONSTRAINT "calendar_tasks_servicerId_fkey" FOREIGN KEY ("servicerId") REFERENCES "servicers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "calendar_tasks" ADD CONSTRAINT "calendar_tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "calendar_tasks" ADD CONSTRAINT "calendar_tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "calendar_completions" ADD CONSTRAINT "calendar_completions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "calendar_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "calendar_completions" ADD CONSTRAINT "calendar_completions_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "delivery_attempts" ADD CONSTRAINT "delivery_attempts_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "external_codes" ADD CONSTRAINT "external_codes_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_codes" ADD CONSTRAINT "external_codes_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_codes" ADD CONSTRAINT "external_codes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "fault_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "external_codes" ADD CONSTRAINT "external_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "calendar_categories" ("id", "name", "color", "updatedAt") VALUES
  (gen_random_uuid()::text, 'Servis',      'BLUE',   CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Vzdrževanje', 'GREEN',  CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Pregled',     'VIOLET', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Naročilo',    'ORANGE', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'Drugo',       'GRAY',   CURRENT_TIMESTAMP);

INSERT INTO "fault_categories" ("id", "name", "icon", "description", "sortOrder", "updatedAt") VALUES
  ('fc_glave',       'Tiskalne glave in črnilo',    'droplet',     'Zamašene šobe, izpadli kanali, dovod in kroženje črnila, čiščenje glav.', 10, CURRENT_TIMESTAMP),
  ('fc_kakovost',    'Kakovost tiska in barve',     'palette',     'Pasovi, zamik barv, motni ali neenakomerni odtisi, barvni profili.',      20, CURRENT_TIMESTAMP),
  ('fc_rezanje',     'Rezanje in orodja',           'scissors',    'Noži, rezila, globina reza, rezalne podloge in orodja.',                    30, CURRENT_TIMESTAMP),
  ('fc_zrak',        'Podtlak, zrak in pnevmatika', 'fan',         'Podtlak na mizi, kompresor, tlak v liniji, ventili in cevi.',               40, CURRENT_TIMESTAMP),
  ('fc_mehanika',    'Mehanika in pogon',           'gears',       'Jermeni, ležaji, vodila, motorji in pogoni, poravnava osi.',                50, CURRENT_TIMESTAMP),
  ('fc_elektrika',   'Elektrika in senzorji',       'flash',       'Napajanje, varovalke, senzorji, stikala in krmilne plošče.',                60, CURRENT_TIMESTAMP),
  ('fc_toplota',     'Toplota, sušenje in UV',      'thermometer', 'Sušilniki, grelci, UV sijalke, pregrevanje in hlajenje.',                   70, CURRENT_TIMESTAMP),
  ('fc_material',    'Material in podajanje',       'scroll',      'Podajanje, navijanje, zagozdenje, napetost in poravnava materiala.',        80, CURRENT_TIMESTAMP),
  ('fc_programska',  'Programska oprema in RIP',    'software',    'RIP postaje, gonilniki, licence, delovni tokovi in datoteke.',              90, CURRENT_TIMESTAMP),
  ('fc_omrezje',     'Omrežje in računalniki',      'router',      'Povezave, omrežje, računalniki in tiskalniški strežniki.',                 100, CURRENT_TIMESTAMP),
  ('fc_objekt',      'Objekt in varnost',           'building',    'Razsvetljava, ogrevanje, prezračevanje, vrata in varnost pri delu.',       110, CURRENT_TIMESTAMP),
  ('fc_vzdrzevanje', 'Redno vzdrževanje',           'tools',       'Redni servisi, menjave filtrov in obrabnih delov, čiščenje.',              120, CURRENT_TIMESTAMP);
