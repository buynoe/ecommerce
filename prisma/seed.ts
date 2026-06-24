import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const slugify = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const PRODUCTS = [
  // Clothing
  { title: "Classic Cotton Kurta", vendor: "FabIndia", type: "Clothing", price: 899, compare: 1299, stock: 45, tags: ["kurta","cotton","ethnic"], desc: "Handcrafted premium cotton kurta for daily wear. Available in multiple colors." },
  { title: "Banarasi Silk Saree", vendor: "Nalli", type: "Sarees", price: 4999, compare: 7500, stock: 12, tags: ["saree","silk","bridal"], desc: "Authentic Banarasi silk saree with golden zari border." },
  { title: "Men's Pathani Suit", vendor: "Manyavar", type: "Clothing", price: 2499, compare: 3500, stock: 28, tags: ["pathani","ethnic","men"], desc: "Traditional Pathani suit with intricate embroidery work." },
  { title: "Anarkali Frock Suit", vendor: "W for Woman", type: "Clothing", price: 1899, compare: 2999, stock: 33, tags: ["anarkali","women","festive"], desc: "Elegant Anarkali suit perfect for festive occasions." },
  { title: "Linen Blazer", vendor: "Allen Solly", type: "Formal Wear", price: 3499, compare: 5000, stock: 20, tags: ["blazer","formal","linen"], desc: "Lightweight linen blazer for professional settings." },
  { title: "Denim Jacket", vendor: "Wrangler", type: "Casual Wear", price: 2199, compare: 3200, stock: 50, tags: ["denim","jacket","casual"], desc: "Classic denim jacket with vintage wash finish." },
  { title: "Printed Palazzo Pants", vendor: "Global Desi", type: "Bottoms", price: 799, compare: 1200, stock: 60, tags: ["palazzo","women","printed"], desc: "Flowy printed palazzo pants in breathable fabric." },
  { title: "Chikankari Kurti", vendor: "Lucknowi Chikan", type: "Clothing", price: 1299, compare: 1999, stock: 40, tags: ["chikankari","kurti","handmade"], desc: "Hand-embroidered Lucknow chikankari kurti." },
  { title: "Nehru Jacket", vendor: "Manyavar", type: "Clothing", price: 1799, compare: 2500, stock: 25, tags: ["nehru","jacket","ethnic"], desc: "Stylish Nehru collar jacket for festive and formal occasions." },
  { title: "Raw Silk Dupatta", vendor: "Fab Alley", type: "Accessories", price: 699, compare: 999, stock: 80, tags: ["dupatta","silk","ethnic"], desc: "Raw silk dupatta with tassel edges." },

  // Footwear
  { title: "Leather Kolhapuri Chappals", vendor: "Liberty", type: "Footwear", price: 1299, compare: 1800, stock: 35, tags: ["kolhapuri","leather","handmade"], desc: "Handcrafted Kolhapuri chappals in genuine leather." },
  { title: "Juttis for Women", vendor: "Needledust", type: "Footwear", price: 899, compare: 1400, stock: 55, tags: ["jutti","women","ethnic"], desc: "Embroidered Punjabi juttis for traditional wear." },
  { title: "Mojari Shoes for Men", vendor: "Fizzy Goblet", type: "Footwear", price: 1499, compare: 2200, stock: 30, tags: ["mojari","men","rajasthani"], desc: "Handcrafted Rajasthani leather mojari with mirror work." },
  { title: "Running Sneakers", vendor: "HRX", type: "Sports", price: 2499, compare: 3500, stock: 42, tags: ["sneakers","sports","running"], desc: "Lightweight running sneakers with cushion sole." },
  { title: "Office Loafers", vendor: "Clarks", type: "Footwear", price: 3999, compare: 5500, stock: 18, tags: ["loafers","office","leather"], desc: "Premium leather loafers for office and formal wear." },

  // Accessories
  { title: "Silver Oxidized Earrings", vendor: "Voylla", type: "Jewellery", price: 349, compare: 599, stock: 90, tags: ["earrings","silver","oxidized"], desc: "Handmade oxidized silver drop earrings." },
  { title: "Meenakari Bangles Set", vendor: "Amrapali", type: "Jewellery", price: 799, compare: 1200, stock: 65, tags: ["bangles","meenakari","ethnic"], desc: "Set of 4 Rajasthani meenakari bangles." },
  { title: "Kundan Necklace Set", vendor: "Tanishq", type: "Jewellery", price: 2999, compare: 4500, stock: 15, tags: ["necklace","kundan","bridal"], desc: "Kundan bridal necklace set with matching earrings." },
  { title: "Leather Watch Strap", vendor: "Casio", type: "Accessories", price: 599, compare: 899, stock: 70, tags: ["watch","leather","strap"], desc: "Genuine leather watch strap in brown." },
  { title: "Embroidered Potli Bag", vendor: "Libas", type: "Bags", price: 699, compare: 999, stock: 48, tags: ["potli","bag","embroidered","ethnic"], desc: "Silk embroidered potli bag for weddings and parties." },

  // Home & Living
  { title: "Handloom Cotton Bedsheet", vendor: "Fabindia", type: "Home Decor", price: 1299, compare: 1899, stock: 38, tags: ["bedsheet","cotton","handloom"], desc: "Pure handloom cotton double bedsheet with 2 pillow covers." },
  { title: "Block Print Cushion Covers", vendor: "Good Earth", type: "Home Decor", price: 499, compare: 799, stock: 70, tags: ["cushion","blockprint","handmade"], desc: "Set of 5 hand block-printed cushion covers." },
  { title: "Brass Diyas Set", vendor: "Ekibeki", type: "Home Decor", price: 299, compare: 499, stock: 120, tags: ["diya","brass","festive","diwali"], desc: "Set of 12 brass diyas for Diwali and puja." },
  { title: "Macrame Wall Hanging", vendor: "Home Centre", type: "Home Decor", price: 899, compare: 1399, stock: 25, tags: ["macrame","wall","decor","boho"], desc: "Handmade macrame wall hanging in natural cotton." },
  { title: "Terracotta Flower Pots Set", vendor: "Urban Ladder", type: "Garden", price: 799, compare: 1199, stock: 30, tags: ["terracotta","pots","garden"], desc: "Set of 3 hand-painted terracotta flower pots." },

  // Beauty & Personal Care
  { title: "Kumkumadi Tailam", vendor: "Kama Ayurveda", type: "Skincare", price: 1299, compare: 1799, stock: 55, tags: ["kumkumadi","ayurveda","skincare"], desc: "Luxury Kumkumadi face oil for brightening and anti-aging." },
  { title: "Rose Water Toner", vendor: "Forest Essentials", type: "Skincare", price: 699, compare: 999, stock: 80, tags: ["rosewater","toner","natural"], desc: "Pure rose water facial toner with glycerine." },
  { title: "Neem & Tulsi Face Wash", vendor: "Himalaya", type: "Skincare", price: 299, compare: 399, stock: 150, tags: ["facewash","neem","tulsi","ayurveda"], desc: "Neem and tulsi purifying face wash for oily skin." },
  { title: "Herbal Hair Oil", vendor: "Bajaj Almond Drops", type: "Haircare", price: 249, compare: 350, stock: 100, tags: ["hairoil","herbal","almond"], desc: "Herbal hair oil with 24 natural ingredients." },
  { title: "Sandalwood Soap Bar", vendor: "Mysore Sandal", type: "Bath & Body", price: 199, compare: 299, stock: 200, tags: ["soap","sandalwood","mysore"], desc: "Pure sandalwood soap enriched with sandalwood oil." },

  // Food & Grocery
  { title: "Organic Turmeric Powder", vendor: "24 Mantra", type: "Spices", price: 199, compare: 299, stock: 100, tags: ["turmeric","organic","spice"], desc: "USDA certified organic turmeric powder from Karnataka." },
  { title: "Cold Pressed Coconut Oil", vendor: "Coco Mama", type: "Oils", price: 499, compare: 699, stock: 75, tags: ["coconut","oil","organic"], desc: "100% cold pressed virgin coconut oil, unrefined." },
  { title: "Masala Chai Blend", vendor: "Chai Point", type: "Beverages", price: 349, compare: 499, stock: 90, tags: ["chai","masala","tea"], desc: "Premium masala chai blend with cardamom, ginger and cinnamon." },
  { title: "Dry Fruit Box Premium", vendor: "Happilo", type: "Dry Fruits", price: 999, compare: 1499, stock: 40, tags: ["dryfruits","premium","cashew","almond"], desc: "Premium assorted dry fruit box with cashews, almonds, raisins." },
  { title: "Homemade Mango Pickle", vendor: "Mother's Recipe", type: "Condiments", price: 299, compare: 399, stock: 80, tags: ["pickle","mango","homestyle"], desc: "Traditional Andhra style mango pickle in sesame oil." },

  // Electronics
  { title: "Wireless Earbuds", vendor: "boAt", type: "Audio", price: 1499, compare: 2499, stock: 60, tags: ["earbuds","wireless","bluetooth"], desc: "True wireless earbuds with 30H playtime and ANC." },
  { title: "USB-C Charging Cable", vendor: "Anker", type: "Accessories", price: 399, compare: 599, stock: 120, tags: ["usbc","cable","fast-charge"], desc: "Braided USB-C cable with 60W fast charging support." },
  { title: "Power Bank 10000mAh", vendor: "MI", type: "Power", price: 999, compare: 1499, stock: 55, tags: ["powerbank","mi","10000mah"], desc: "10000mAh slim power bank with dual USB output." },
  { title: "Phone Stand Adjustable", vendor: "UGREEN", type: "Accessories", price: 599, compare: 899, stock: 85, tags: ["phonestand","desk","adjustable"], desc: "Aluminum adjustable phone and tablet stand for desk." },
  { title: "Laptop Sleeve 15 inch", vendor: "Inateck", type: "Bags", price: 799, compare: 1199, stock: 45, tags: ["laptop","sleeve","15inch","neoprene"], desc: "Neoprene laptop sleeve with accessory pocket." },

  // Kids
  { title: "Wooden Building Blocks", vendor: "Funskool", type: "Toys", price: 699, compare: 999, stock: 60, tags: ["blocks","wooden","kids","educational"], desc: "50-piece wooden building blocks with color and shape variety." },
  { title: "Cotton Romper Set Baby", vendor: "Carter's", type: "Baby Clothing", price: 499, compare: 799, stock: 70, tags: ["romper","baby","cotton"], desc: "Soft cotton romper set for babies 0-12 months." },
  { title: "Non-Toxic Crayons 48 Pack", vendor: "Camlin", type: "Stationery", price: 299, compare: 449, stock: 150, tags: ["crayons","kids","art","camlin"], desc: "48 assorted non-toxic wax crayons for children." },
  { title: "Puzzle 100 Pieces India Map", vendor: "Frank", type: "Educational Toys", price: 399, compare: 599, stock: 50, tags: ["puzzle","india","map","educational"], desc: "Educational India map puzzle for children 5+ years." },
  { title: "Kids Yoga Mat", vendor: "Kosha Yoga", type: "Sports", price: 799, compare: 1199, stock: 35, tags: ["yoga","kids","mat","exercise"], desc: "Non-slip kids yoga mat with fun animal prints." },

  // Sports & Fitness
  { title: "Yoga Mat Premium", vendor: "Decathlon", type: "Sports", price: 1299, compare: 1999, stock: 40, tags: ["yoga","mat","premium","non-slip"], desc: "6mm thick non-slip premium yoga mat." },
  { title: "Resistance Bands Set", vendor: "Boldfit", type: "Fitness", price: 599, compare: 899, stock: 80, tags: ["resistance","bands","exercise","fitness"], desc: "Set of 5 resistance bands with different tension levels." },
  { title: "Whey Protein 1kg", vendor: "MuscleBlaze", type: "Nutrition", price: 1999, compare: 2799, stock: 30, tags: ["protein","whey","gym","supplement"], desc: "MuscleBlaze Whey Active 1kg - Chocolate flavour." },
  { title: "Cricket Tennis Ball Pack", vendor: "SG", type: "Sports", price: 299, compare: 449, stock: 100, tags: ["cricket","ball","tennis","sg"], desc: "Pack of 6 SG cricket tennis balls." },
  { title: "Badminton Racquet Set", vendor: "Yonex", type: "Sports", price: 1499, compare: 2200, stock: 25, tags: ["badminton","racquet","yonex","sports"], desc: "Pair of Yonex beginner badminton racquets with shuttlecocks." },
];

const COLLECTIONS = [
  { title: "Summer Collection", type: "MANUAL", productIndexes: [0, 1, 6, 7, 9] },
  { title: "Ethnic Wear", type: "MANUAL", productIndexes: [0, 1, 2, 3, 7, 8, 11, 12, 16, 17, 18] },
  { title: "Accessories & Jewellery", type: "MANUAL", productIndexes: [9, 15, 16, 17, 18, 19, 36, 37, 38, 39] },
  { title: "Home & Living", type: "MANUAL", productIndexes: [20, 21, 22, 23, 24] },
  { title: "Beauty & Wellness", type: "MANUAL", productIndexes: [25, 26, 27, 28, 29] },
  { title: "Organic & Natural Food", type: "MANUAL", productIndexes: [30, 31, 32, 33, 34] },
  { title: "Electronics & Gadgets", type: "MANUAL", productIndexes: [35, 36, 37, 38, 39] },
  { title: "Kids World", type: "MANUAL", productIndexes: [40, 41, 42, 43, 44] },
  { title: "Sports & Fitness", type: "MANUAL", productIndexes: [45, 46, 47, 48, 49] },
  { title: "New Arrivals", type: "AUTOMATED", rules: [{ field: "product_type", operator: "equals", value: "Footwear" }] },
];

async function main() {
  console.log("🌱 Seeding database…");

  const hashedPassword = await bcrypt.hash("demo1234", 12);

  // Create merchant
  const merchant = await prisma.merchant.upsert({
    where: { email: "demo@shopease.in" },
    update: {},
    create: {
      name: "Priya Sharma",
      email: "demo@shopease.in",
      password: hashedPassword,
      plan: "PRO",
    },
  });

  // Create store
  let store = await prisma.store.findUnique({ where: { merchantId: merchant.id } });
  if (!store) {
    store = await prisma.store.create({
      data: {
        merchantId: merchant.id,
        name: "Priya's Fashion Bazaar",
        slug: "priyas-fashion-bazaar",
        description: "Premium Indian fashion, lifestyle & wellness products curated for modern India",
        currency: "INR",
        email: "demo@shopease.in",
        phone: "+91 98765 43210",
        primaryColor: "#16a34a",
      },
    });
  }

  // Shipping methods (only if none exist)
  const existingShipping = await prisma.shippingMethod.count({ where: { storeId: store.id } });
  if (existingShipping === 0) {
    await prisma.shippingMethod.createMany({
      data: [
        { storeId: store.id, name: "Standard Delivery", type: "STANDARD", price: 60, minDays: 5, maxDays: 7 },
        { storeId: store.id, name: "Express Delivery", type: "EXPRESS", price: 150, minDays: 2, maxDays: 3 },
        { storeId: store.id, name: "Same Day Delivery", type: "SAME_DAY", price: 299, minDays: 0, maxDays: 1 },
        { storeId: store.id, name: "Cash on Delivery", type: "COD", price: 40, minDays: 5, maxDays: 7 },
      ],
    });
  }

  // Tax profiles
  for (const rate of [0, 5, 12, 18, 28]) {
    await prisma.taxProfile.upsert({
      where: { id: `tax-${store.id}-${rate}` },
      update: {},
      create: { id: `tax-${store.id}-${rate}`, storeId: store.id, name: `GST ${rate}%`, rate, type: "GST" },
    });
  }

  // Payment gateways (only if none exist)
  const existingGw = await prisma.paymentGateway.count({ where: { storeId: store.id } });
  if (existingGw === 0) {
    await prisma.paymentGateway.createMany({
      data: [
        { storeId: store.id, provider: "RAZORPAY", name: "Razorpay", config: "{}", isActive: false },
        { storeId: store.id, provider: "CASHFREE", name: "Cashfree Payments", config: "{}", isActive: false },
        { storeId: store.id, provider: "COD", name: "Cash on Delivery", config: "{}", isActive: true, supportsCOD: true },
      ],
    });
  }

  // Create products
  const UNSPLASH_IMAGES: Record<string, string> = {
    Clothing:     "https://images.unsplash.com/photo-1594938298603-c8148c4b4e00?w=400",
    Sarees:       "https://images.unsplash.com/photo-1610189024282-b871b7a75c09?w=400",
    Footwear:     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400",
    Jewellery:    "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400",
    "Home Decor": "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
    Skincare:     "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400",
    Spices:       "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400",
    Audio:        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400",
    Toys:         "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    Sports:       "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400",
    Bags:         "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400",
    Haircare:     "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400",
    Fitness:      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
    Nutrition:    "https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=400",
    default:      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400",
  };

  const productRecords = [];
  for (const [i, p] of PRODUCTS.entries()) {
    const handle = `${slugify(p.title)}-${i + 1}`;
    const imgUrl = UNSPLASH_IMAGES[p.type] || UNSPLASH_IMAGES.default;

    const product = await prisma.product.upsert({
      where: { storeId_handle: { storeId: store.id, handle } },
      update: {},
      create: {
        storeId: store.id,
        title: p.title,
        handle,
        description: p.desc,
        vendor: p.vendor,
        productType: p.type,
        tags: JSON.stringify(p.tags),
        status: "ACTIVE",
        images: { create: [{ url: imgUrl, alt: p.title, position: 0, isFeatured: true }] },
        variants: {
          create: [
            {
              title: "Default",
              sku: `SKU-${(i + 1).toString().padStart(4, "0")}`,
              price: p.price,
              compareAtPrice: p.compare,
              costPrice: Math.round(p.price * 0.5),
              inventoryItem: { create: { available: p.stock, lowStockAlert: 5 } },
            },
          ],
        },
      },
    });
    productRecords.push(product);
  }

  console.log(`✅ Created ${productRecords.length} products`);

  // Collections
  for (const [ci, col] of COLLECTIONS.entries()) {
    const handle = slugify(col.title);
    const collection = await prisma.collection.upsert({
      where: { storeId_handle: { storeId: store.id, handle } },
      update: {},
      create: {
        storeId: store.id,
        title: col.title,
        handle,
        type: col.type as "MANUAL" | "AUTOMATED",
        rules: JSON.stringify((col as { rules?: unknown[] }).rules || []),
        status: "ACTIVE",
      },
    });

    if (col.type === "MANUAL" && (col as { productIndexes?: number[] }).productIndexes) {
      for (const [pos, pi] of ((col as { productIndexes: number[] }).productIndexes).entries()) {
        if (productRecords[pi]) {
          await prisma.collectionProduct.upsert({
            where: { collectionId_productId: { collectionId: collection.id, productId: productRecords[pi].id } },
            update: {},
            create: { collectionId: collection.id, productId: productRecords[pi].id, position: pos },
          });
        }
      }
    }
    console.log(`✅ Collection: ${col.title}`);
  }

  // Coupons
  await prisma.coupon.upsert({
    where: { storeId_code: { storeId: store.id, code: "WELCOME20" } },
    update: {},
    create: { storeId: store.id, code: "WELCOME20", type: "PERCENTAGE", value: 20, maxUsesPerCustomer: 1 },
  });
  await prisma.coupon.upsert({
    where: { storeId_code: { storeId: store.id, code: "FLAT100" } },
    update: {},
    create: { storeId: store.id, code: "FLAT100", type: "FLAT", value: 100, minAmount: 999 },
  });
  await prisma.coupon.upsert({
    where: { storeId_code: { storeId: store.id, code: "FREESHIP" } },
    update: {},
    create: { storeId: store.id, code: "FREESHIP", type: "FREE_SHIPPING", value: 0 },
  });

  // Customers
  const customerData = [
    { firstName: "Ananya", lastName: "Patel", email: "ananya@example.com", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    { firstName: "Rohit", lastName: "Kumar", email: "rohit@example.com", city: "Delhi", state: "Delhi", pincode: "110001" },
    { firstName: "Meera", lastName: "Nair", email: "meera@example.com", city: "Bangalore", state: "Karnataka", pincode: "560001" },
    { firstName: "Vikram", lastName: "Singh", email: "vikram@example.com", city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
    { firstName: "Sunita", lastName: "Sharma", email: "sunita@example.com", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
  ];

  const customers = [];
  for (const c of customerData) {
    const customer = await prisma.customer.upsert({
      where: { storeId_email: { storeId: store.id, email: c.email } },
      update: {},
      create: {
        storeId: store.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: `+91 ${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
        addresses: {
          create: [{
            firstName: c.firstName, lastName: c.lastName,
            address1: `${Math.floor(Math.random() * 999) + 1}, Main Street`,
            city: c.city, state: c.state, pincode: c.pincode, country: "India", isDefault: true,
          }],
        },
      },
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // Shipping methods for orders
  const shippingMethod = await prisma.shippingMethod.findFirst({ where: { storeId: store.id } });

  // Orders
  const orderStatuses = ["DELIVERED", "SHIPPED", "CONFIRMED", "PENDING_PAYMENT", "DELIVERED", "DELIVERED"];
  for (const [oi, customer] of customers.entries()) {
    const product = productRecords[oi * 7 % productRecords.length];
    const variant = await prisma.productVariant.findFirst({ where: { productId: product.id } });
    if (!variant) continue;

    const price = variant.price;
    const qty = Math.floor(Math.random() * 3) + 1;
    const subtotal = price * qty;
    const shippingCost = 60;
    const taxAmount = subtotal * 0.18;
    const total = subtotal + shippingCost + taxAmount;

    const orderNumber = `SE-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const addr = await prisma.customerAddress.findFirst({ where: { customerId: customer.id } });

    const order = await prisma.order.create({
      data: {
        storeId: store.id,
        orderNumber,
        customerId: customer.id,
        email: customer.email,
        phone: customer.phone,
        status: orderStatuses[oi % orderStatuses.length],
        subtotal, shippingCost, taxAmount, total,
        shippingAddress: JSON.stringify(addr || { firstName: customer.firstName, lastName: customer.lastName, address1: "123 Street", city: "Mumbai", state: "Maharashtra", pincode: "400001", country: "India" }),
        billingAddress: JSON.stringify(addr || {}),
        shippingMethodId: shippingMethod?.id,
        items: {
          create: [{
            productId: product.id,
            variantId: variant.id,
            title: product.title,
            variantTitle: variant.title,
            sku: variant.sku,
            price,
            quantity: qty,
            taxAmount: price * qty * 0.18,
            total: price * qty,
          }],
        },
        timeline: {
          create: [
            { status: "PENDING_PAYMENT", message: "Order placed" },
            ...(orderStatuses[oi % orderStatuses.length] !== "PENDING_PAYMENT" ? [{ status: "PAID", message: "Payment confirmed" }] : []),
            ...(["SHIPPED", "DELIVERED"].includes(orderStatuses[oi % orderStatuses.length]) ? [{ status: "SHIPPED", message: "Order shipped via Shiprocket" }] : []),
            ...( orderStatuses[oi % orderStatuses.length] === "DELIVERED" ? [{ status: "DELIVERED", message: "Order delivered successfully" }] : []),
          ],
        },
      },
    });
    console.log(`✅ Order ${orderNumber} created`);
  }

  console.log("\n🎉 Seed complete!");
  console.log("📧 Demo login: demo@shopease.in / demo1234");
  console.log(`🏪 Store URL: http://localhost:3001/store/priyas-fashion-bazaar`);
  console.log("🎟️  Coupons: WELCOME20, FLAT100, FREESHIP");
}

main().catch(console.error).finally(() => prisma.$disconnect());
