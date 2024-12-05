-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('Authorized', 'Pending', 'Declined', 'Completed', 'Cancelled', 'AwaitingAuthentication');

-- CreateEnum
CREATE TYPE "card_status" AS ENUM ('Unapproved', 'Approved', 'Banned');

-- CreateEnum
CREATE TYPE "hook_type" AS ENUM ('check', 'pay', 'fail', 'recurrent', 'cancel', 'confirm', 'refund');

-- CreateEnum
CREATE TYPE "cashbox_mode" AS ENUM ('prod', 'stage', 'dev');

-- CreateEnum
CREATE TYPE "processing" AS ENUM ('uzcard', 'humo', 'visa', 'mastercard', 'mir', 'unionpay');

-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('hold', 'recurrent', 'threeds', 'credit', 'p2p');

-- CreateTable
CREATE TABLE IF NOT EXISTS "bin" (
    "id" SERIAL NOT NULL,
    "bin" INTEGER NOT NULL,
    "bank_id" INTEGER,
    "currency" VARCHAR,
    "hide_cvv_input" BOOLEAN NOT NULL,
    "processing" "processing",
    "cobadge_processing" "processing",
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "bank_name" VARCHAR,

    CONSTRAINT "bin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "card" (
    "id" SERIAL NOT NULL,
    "processing_card_token" VARCHAR,
    "organization_id" INTEGER NOT NULL,
    "pan" VARCHAR,
    "expiry" VARCHAR,
    "phone" VARCHAR,
    "fullname" VARCHAR,
    "processing" "processing",
    "tk" VARCHAR,
    "cryptogram" VARCHAR NOT NULL,
    "pan_ref" VARCHAR,
    "status" "card_status",
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "bank_name" VARCHAR,

    CONSTRAINT "card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "cashbox" (
    "id" SERIAL NOT NULL,
    "logo" VARCHAR,
    "name" VARCHAR,
    "mode" "cashbox_mode",
    "public_id" VARCHAR,
    "password_api" VARCHAR,
    "is_active" BOOLEAN,
    "support_url" VARCHAR,
    "support_number" VARCHAR,
    "notifications_email" VARCHAR,
    "notifications_number" VARCHAR,
    "company_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cashbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "company" (
    "id" SERIAL NOT NULL,
    "account_id" VARCHAR,
    "trade_name" VARCHAR NOT NULL,
    "legal_name" VARCHAR NOT NULL,
    "business_area" VARCHAR NOT NULL,
    "tax_id_number" VARCHAR NOT NULL,
    "bank_account" VARCHAR NOT NULL,
    "director_fullname" VARCHAR NOT NULL,
    "address" VARCHAR NOT NULL,
    "organization_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "epos" (
    "id" SERIAL NOT NULL,
    "processing" "processing",
    "merchant_id" VARCHAR NOT NULL,
    "terminal_id" VARCHAR NOT NULL,
    "cashbox_id" INTEGER,
    "bank_id" INTEGER,
    "is_recurrent" BOOLEAN,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "epos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "organization" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR NOT NULL,
    "address" VARCHAR,
    "phone" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "session" (
    "id" SERIAL NOT NULL,
    "sid" VARCHAR NOT NULL,
    "cashbox_id" INTEGER,
    "expires" TIMESTAMP(6) NOT NULL,
    "data" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ip" (
    "id" SERIAL NOT NULL,
    "country" VARCHAR,
    "countryCode" VARCHAR,
    "region" VARCHAR,
    "regionName" VARCHAR,
    "city" VARCHAR,
    "zip" VARCHAR,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "timezone" VARCHAR,
    "isp" VARCHAR,
    "org" VARCHAR,
    "as" VARCHAR,
    "ip_address" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notification" (
    "id" SERIAL NOT NULL,
    "phone" VARCHAR,
    "message" VARCHAR,
    "success" BOOLEAN,
    "fail_reason" VARCHAR,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "otp" (
    "id" SERIAL NOT NULL,
    "card_id" INTEGER,
    "hashed_otp" VARCHAR,
    "ban_count" INTEGER DEFAULT 0,
    "fail_attempts" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "hook" (
    "id" SERIAL NOT NULL,
    "cashbox_id" INTEGER,
    "type" "hook_type" NOT NULL,
    "url" VARCHAR NOT NULL,
    "is_active" BOOLEAN,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "transaction" (
    "id" SERIAL NOT NULL,
    "cashbox_id" INTEGER,
    "type" "transaction_type" NOT NULL,
    "receiever_pan" VARCHAR,
    "receiver_fullname" VARCHAR,
    "status_code" INTEGER,
    "reason_code" INTEGER,
    "processing_ref_num" VARCHAR,
    "last_amount" DECIMAL,
    "refunded_date" TIMESTAMP(6),
    "card_id" INTEGER,
    "currency" VARCHAR NOT NULL DEFAULT '860',
    "amount" DECIMAL NOT NULL,
    "invoice_id" VARCHAR NOT NULL,
    "description" VARCHAR,
    "status" "payment_status" NOT NULL,
    "hold_id" VARCHAR,
    "hold_amount" DECIMAL DEFAULT 0,
    "fail_reason" VARCHAR,
    "account_id" VARCHAR,
    "is_test" BOOLEAN DEFAULT false,
    "ip_id" INTEGER,
    "json_data" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bank" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR,
    "image_url" VARCHAR,
    "country_code" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "order" (
    "id" SERIAL NOT NULL,
    "unique_id" VARCHAR(255) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" VARCHAR(3) DEFAULT '860',
    "description" TEXT NOT NULL,
    "email" VARCHAR(255),
    "require_confirmation" BOOLEAN DEFAULT false,
    "send_email" BOOLEAN DEFAULT false,
    "invoice_id" VARCHAR(255),
    "account_id" VARCHAR(255),
    "offer_uri" TEXT,
    "phone" VARCHAR(255),
    "send_sms" BOOLEAN DEFAULT false,
    "send_viber" BOOLEAN DEFAULT false,
    "culture_name" VARCHAR(10) DEFAULT 'ru-RU',
    "subscription_behavior" VARCHAR(50),
    "success_redirect_url" TEXT,
    "fail_redirect_url" TEXT,
    "json_data" JSONB,
    "url" TEXT,
    "created_date_iso" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "status_code" INTEGER,
    "status" VARCHAR(50),
    "internal_id" INTEGER NOT NULL,
    "payment_date" TIMESTAMPTZ(6),
    "payment_date_iso" VARCHAR(255),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "admin" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "hashed_password" TEXT NOT NULL,
    "deactivated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "adminsOnCompanies" (
    "admin_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,

    CONSTRAINT "adminsOnCompanies_pkey" PRIMARY KEY ("admin_id","company_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bin_bin_key" ON "bin"("bin");

-- CreateIndex
CREATE INDEX "bin_bin_idx" ON "bin"("bin");

-- CreateIndex
CREATE INDEX "bin_processing_idx" ON "bin"("processing");

-- CreateIndex
CREATE INDEX "card_processing_idx" ON "card"("processing");

-- CreateIndex
CREATE INDEX "card_tk_idx" ON "card"("tk");

-- CreateIndex
CREATE INDEX "card_status_idx" ON "card"("status");

-- CreateIndex
CREATE INDEX "card_pan_ref_idx" ON "card"("pan_ref");

-- CreateIndex
CREATE INDEX "card_organization_id_idx" ON "card"("organization_id");

-- CreateIndex
CREATE INDEX "cashbox_company_id_idx" ON "cashbox"("company_id");

-- CreateIndex
CREATE INDEX "cashbox_is_active_idx" ON "cashbox"("is_active");

-- CreateIndex
CREATE INDEX "epos_cashbox_id_idx" ON "epos"("cashbox_id");

-- CreateIndex
CREATE INDEX "epos_processing_idx" ON "epos"("processing");

-- CreateIndex
CREATE UNIQUE INDEX "otp_card_id_key" ON "otp"("card_id");

-- CreateIndex
CREATE INDEX "hook_cashbox_id_idx" ON "hook"("cashbox_id");

-- CreateIndex
CREATE INDEX "hook_is_active_idx" ON "hook"("is_active");

-- CreateIndex
CREATE INDEX "hook_type_idx" ON "hook"("type");

-- CreateIndex
CREATE INDEX "transaction_cashbox_id_idx" ON "transaction"("cashbox_id");

-- CreateIndex
CREATE INDEX "transaction_is_test_idx" ON "transaction"("is_test");

-- CreateIndex
CREATE INDEX "transaction_status_idx" ON "transaction"("status");

-- CreateIndex
CREATE INDEX "transaction_type_idx" ON "transaction"("type");

-- AddForeignKey
ALTER TABLE "bin" ADD CONSTRAINT "bin_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "card" ADD CONSTRAINT "card_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cashbox" ADD CONSTRAINT "cashbox_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "company" ADD CONSTRAINT "company_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "epos" ADD CONSTRAINT "epos_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "bank"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "epos" ADD CONSTRAINT "epos_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashbox"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashbox"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "otp" ADD CONSTRAINT "otp_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "hook" ADD CONSTRAINT "hook_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashbox"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_cashbox_id_fkey" FOREIGN KEY ("cashbox_id") REFERENCES "cashbox"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_ip_id_fkey" FOREIGN KEY ("ip_id") REFERENCES "ip"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "adminsOnCompanies" ADD CONSTRAINT "adminsOnCompanies_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adminsOnCompanies" ADD CONSTRAINT "adminsOnCompanies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
