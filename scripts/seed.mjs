/**
 * Seed script — loads ecommerce_mock_data.csv into Supabase
 * Run from repo root: node scripts/seed.mjs
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://ocytfuaypvbrryccqfca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jeXRmdWF5cHZicnJ5Y2NxZmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDk3MDAsImV4cCI6MjA4ODM4NTcwMH0.u4bKZZek5QBFAMSNhKQUExCmMaH8xSn6vrxwKw4b9Y8';
const BATCH_SIZE = 500;
const CSV_PATH = resolve(__dirname, '../ecommerce_mock_data.csv');

function parseRow(headers, values) {
  const row = {};
  headers.forEach((h, i) => { row[h] = values[i]; });

  return {
    transaction_id:   row['Transaction_ID'],
    customer_id:      row['Customer_ID'],
    order_date:       row['Order_Date'] || null,
    delivery_date:    row['Delivery_Date'] || null,
    customer_name:    row['Customer_Name'],
    email:            row['Email'],
    shipping_address: row['Shipping_Address'],
    product_category: row['Product_Category'],
    sku:              row['SKU'],
    quantity:         parseInt(row['Quantity'], 10),
    unit_price:       parseFloat(row['Unit_Price']),
    total_amount:     parseFloat(row['Total_Amount']),
    payment_method:   row['Payment_Method'],
    discount_applied: row['Discount_Applied'].toLowerCase() === 'true',
    order_status:     row['Order_Status'],
  };
}

async function insertBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Insert failed (${res.status}): ${err}`);
  }
}

async function seed() {
  console.log('Reading CSV...');

  const rl = createInterface({ input: createReadStream(CSV_PATH), crlfDelay: Infinity });

  let headers = null;
  let batch = [];
  let total = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;

    // Simple CSV parse — handles quoted fields with commas
    const values = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; }
      else if (c === ',' && !inQuotes) { values.push(cur); cur = ''; }
      else { cur += c; }
    }
    values.push(cur);

    if (!headers) {
      headers = values;
      continue;
    }

    batch.push(parseRow(headers, values));

    if (batch.length >= BATCH_SIZE) {
      await insertBatch(batch);
      total += batch.length;
      console.log(`  Inserted ${total} rows...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await insertBatch(batch);
    total += batch.length;
  }

  console.log(`Done — ${total} rows inserted.`);
}

seed().catch((err) => { console.error(err); process.exit(1); });
