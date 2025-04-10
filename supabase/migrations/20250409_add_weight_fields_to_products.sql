-- Add unit_weight and kg_weight columns to products table
ALTER TABLE products 
ADD COLUMN unit_weight NUMERIC DEFAULT NULL,
ADD COLUMN kg_weight NUMERIC DEFAULT NULL;

-- Add comment to explain the purpose of these fields
COMMENT ON COLUMN products.unit_weight IS 'Weight of a single unit of the product';
COMMENT ON COLUMN products.kg_weight IS 'Weight per kilogram of the product';
