#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# cleanup-orders.sh
# Backs up the live database, then deletes all orders, customers, and their
# related data. Merchants, products, and store config are NOT touched.
#
# Usage:
#   DATABASE_URL="postgresql://..." bash scripts/cleanup-orders.sh
#
# Or if DATABASE_URL is already in your environment / .env file:
#   bash scripts/cleanup-orders.sh
# ---------------------------------------------------------------------------

set -euo pipefail

# ── 1. Load .env if DATABASE_URL not already set ───────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  ENV_FILE="$(dirname "$0")/../.env"
  if [[ -f "$ENV_FILE" ]]; then
    export $(grep -E '^DATABASE_URL=' "$ENV_FILE" | xargs)
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "❌  DATABASE_URL is not set. Export it or put it in .env"
  exit 1
fi

# ── 2. Backup ──────────────────────────────────────────────────────────────
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="backup_before_cleanup_${TIMESTAMP}.sql"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Buynoe — Order & Customer Cleanup Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📦  Taking database backup → ${BACKUP_FILE}"

pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [[ $? -ne 0 ]]; then
  echo "❌  Backup failed. Aborting — nothing was deleted."
  exit 1
fi

BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "✅  Backup complete (${BACKUP_SIZE})"
echo ""

# ── 3. Confirm ─────────────────────────────────────────────────────────────
echo "⚠️   This will permanently delete:"
echo "     • All Orders, OrderItems, Payments, Shipments"
echo "     • All Returns & ReturnItems"
echo "     • All Customers, Addresses, Carts, Wishlists"
echo "     • All Reviews & CouponUses"
echo "     • All Merchant Notifications"
echo ""
echo "     Merchants, Products, and Store config will NOT be touched."
echo ""
read -p "Type YES to continue: " CONFIRM

if [[ "$CONFIRM" != "YES" ]]; then
  echo "Aborted. Backup kept at: ${BACKUP_FILE}"
  exit 0
fi

# ── 4. Run cleanup in a single transaction ─────────────────────────────────
echo ""
echo "🗑   Running cleanup..."

psql "$DATABASE_URL" <<'SQL'
BEGIN;

-- Order child tables
DELETE FROM "ReturnItem";
DELETE FROM "Return";
DELETE FROM "Payment";
DELETE FROM "Shipment";
DELETE FROM "OrderTimeline";
DELETE FROM "OrderItem";

-- Cross-references
DELETE FROM "CouponUse";

-- Unlink inventory logs from orders (keep the log rows)
UPDATE "InventoryLog" SET "orderId" = NULL WHERE "orderId" IS NOT NULL;

-- Orders
DELETE FROM "Order";

-- Customer content
DELETE FROM "Review";
DELETE FROM "WishlistItem";
DELETE FROM "CartItem";
DELETE FROM "Cart";

-- Customers (CustomerAddress cascades automatically)
DELETE FROM "Customer";

-- Dashboard notifications
DELETE FROM "MerchantNotification";

COMMIT;
SQL

echo ""
echo "✅  Cleanup complete."
echo ""
echo "Backup saved at: ${BACKUP_FILE}"
echo "Keep this file until you have verified everything looks correct."
echo ""
