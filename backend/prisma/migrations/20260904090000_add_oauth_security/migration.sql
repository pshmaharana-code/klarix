-- Server-side, single-use OAuth state bound to a user and brand.
CREATE TABLE "oauth_states" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_states_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oauth_states_brand_id_user_id_idx" ON "oauth_states"("brand_id", "user_id");

ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_brand_id_fkey"
  FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "oauth_states" ADD CONSTRAINT "oauth_states_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- OAuth authorization codes are exchanged before durable job creation. Only the
-- resulting access token is held briefly, encrypted, for the worker.
CREATE TABLE "oauth_credentials" (
    "id" TEXT NOT NULL,
    "encrypted_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "oauth_credentials_expires_at_idx" ON "oauth_credentials"("expires_at");
