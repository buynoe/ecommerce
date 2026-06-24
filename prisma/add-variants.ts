import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const VARIANT_TEMPLATES = [
  {
    titleMatch: "Classic Cotton Kurta",
    options: [
      { name: "Size", values: ["S", "M", "L", "XL", "XXL"] },
      { name: "Color", values: ["White", "Blue", "Sage Green"] },
    ],
    basePrices: { S: 899, M: 899, L: 899, XL: 949, XXL: 999 },
    baseStock: 12,
    compare: 1299,
  },
  {
    titleMatch: "Men's Pathani Suit",
    options: [
      { name: "Size", values: ["S", "M", "L", "XL"] },
      { name: "Color", values: ["Cream", "Dark Blue", "Black"] },
    ],
    basePrices: { S: 2499, M: 2499, L: 2499, XL: 2699 },
    baseStock: 8,
    compare: 3500,
  },
  {
    titleMatch: "Anarkali Frock Suit",
    options: [
      { name: "Size", values: ["XS", "S", "M", "L", "XL"] },
      { name: "Color", values: ["Magenta", "Teal", "Gold"] },
    ],
    basePrices: { XS: 1799, S: 1799, M: 1799, L: 1899, XL: 1999 },
    baseStock: 10,
    compare: 2999,
  },
  {
    titleMatch: "Running Sneakers",
    options: [
      { name: "Size", values: ["6", "7", "8", "9", "10", "11"] },
      { name: "Color", values: ["Black/White", "Navy/Orange", "Grey/Green"] },
    ],
    basePrices: { "6": 2499, "7": 2499, "8": 2499, "9": 2499, "10": 2499, "11": 2599 },
    baseStock: 8,
    compare: 3500,
  },
  {
    titleMatch: "Denim Jacket",
    options: [
      { name: "Size", values: ["S", "M", "L", "XL"] },
      { name: "Wash", values: ["Light Wash", "Dark Wash", "Distressed"] },
    ],
    basePrices: { S: 2199, M: 2199, L: 2199, XL: 2299 },
    baseStock: 10,
    compare: 3200,
  },
  {
    titleMatch: "Yoga Mat Premium",
    options: [
      { name: "Color", values: ["Purple", "Black", "Teal", "Rose Pink"] },
      { name: "Thickness", values: ["4mm", "6mm", "8mm"] },
    ],
    basePrices: { "4mm": 1099, "6mm": 1299, "8mm": 1499 },
    baseStock: 15,
    compare: 1999,
  },
  {
    titleMatch: "Whey Protein 1kg",
    options: [
      { name: "Flavour", values: ["Chocolate", "Vanilla", "Strawberry", "Unflavoured"] },
    ],
    basePrices: { Chocolate: 1999, Vanilla: 1999, Strawberry: 1999, Unflavoured: 1899 },
    baseStock: 12,
    compare: 2799,
  },
  {
    titleMatch: "Wireless Earbuds",
    options: [
      { name: "Color", values: ["Black", "White", "Navy Blue"] },
    ],
    basePrices: { Black: 1499, White: 1499, "Navy Blue": 1499 },
    baseStock: 20,
    compare: 2499,
  },
  {
    titleMatch: "Leather Kolhapuri Chappals",
    options: [
      { name: "Size", values: ["6", "7", "8", "9", "10"] },
      { name: "Color", values: ["Tan", "Dark Brown", "Black"] },
    ],
    basePrices: { "6": 1299, "7": 1299, "8": 1299, "9": 1299, "10": 1399 },
    baseStock: 8,
    compare: 1800,
  },
  {
    titleMatch: "Resistance Bands Set",
    options: [
      { name: "Pack", values: ["3-Band Starter", "5-Band Complete", "7-Band Pro"] },
    ],
    basePrices: { "3-Band Starter": 399, "5-Band Complete": 599, "7-Band Pro": 899 },
    baseStock: 20,
    compare: 1299,
  },
];

function cartesian(arrays: string[][]): string[][] {
  if (!arrays.length) return [[]];
  const [first, ...rest] = arrays;
  const restCombos = cartesian(rest);
  return first.flatMap(v => restCombos.map(combo => [v, ...combo]));
}

async function main() {
  console.log("🎨 Adding variants to demo products…\n");

  const store = await prisma.store.findFirst({ where: { slug: "priyas-fashion-bazaar" } });
  if (!store) { console.error("Store not found"); return; }

  for (const tmpl of VARIANT_TEMPLATES) {
    const product = await prisma.product.findFirst({
      where: { storeId: store.id, title: { contains: tmpl.titleMatch.substring(0, 15) } },
      include: { variants: true },
    });
    if (!product) { console.log(`⚠️  Not found: ${tmpl.titleMatch}`); continue; }

    // Skip if already has multiple variants (already processed)
    if (product.variants.length > 1) {
      console.log(`⏭️  Skipping (already has ${product.variants.length} variants): ${product.title}`);
      continue;
    }

    // Build combos
    const optionArrays = tmpl.options.map(o => o.values);
    const combos = cartesian(optionArrays);

    const existingVariant = product.variants[0]; // The "Default" variant
    let position = 0;

    for (const [ci, combo] of combos.entries()) {
      const title = combo.join(" / ");
      const optionsObj: Record<string, string> = {};
      tmpl.options.forEach((opt, idx) => { optionsObj[opt.name] = combo[idx]; });

      // Price: use first or last option value to pick price
      const firstVal = combo[0];
      const lastVal = combo[combo.length - 1];
      const bp = tmpl.basePrices as unknown as Record<string, number>;
      const price = bp[firstVal] ?? bp[lastVal] ?? Object.values(bp)[0];

      const stock = Math.max(2, tmpl.baseStock - Math.floor(Math.random() * 5));
      const sku = `${product.id.slice(-4).toUpperCase()}-${combo.map(c => c.substring(0,2).toUpperCase()).join("")}`;

      if (ci === 0 && existingVariant) {
        // Update the first (existing) variant instead of deleting it
        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: { title, sku, price, compareAtPrice: tmpl.compare, costPrice: Math.round(price * 0.5), options: JSON.stringify(optionsObj), position },
        });
        await prisma.inventoryItem.updateMany({
          where: { variantId: existingVariant.id },
          data: { available: stock },
        });
      } else {
        // Create new variants for the rest of the combos
        await prisma.productVariant.create({
          data: {
            productId: product.id, title, sku, price,
            compareAtPrice: tmpl.compare, costPrice: Math.round(price * 0.5),
            options: JSON.stringify(optionsObj), position,
            inventoryItem: { create: { available: stock, lowStockAlert: 3 } },
          },
        });
      }
      position++;
    }

    console.log(`✅ ${product.title} — ${combos.length} variants (${tmpl.options.map(o => o.name).join(" × ")})`);
  }

  console.log("\n🎉 Done! Variants added to demo products.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
