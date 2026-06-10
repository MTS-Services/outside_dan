-- Store map pin coordinates for accurate drive-time calculation
ALTER TABLE "Order" ADD COLUMN "deliveryLat" DECIMAL(10,7);
ALTER TABLE "Order" ADD COLUMN "deliveryLon" DECIMAL(10,7);
