import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'dairy' },
      update: {},
      create: { name: 'Dairy', slug: 'dairy' },
    }),
    prisma.category.upsert({
      where: { slug: 'fruits' },
      update: {},
      create: { name: 'Fruits', slug: 'fruits' },
    }),
    prisma.category.upsert({
      where: { slug: 'bakery' },
      update: {},
      create: { name: 'Bakery', slug: 'bakery' },
    }),
    prisma.category.upsert({
      where: { slug: 'vegetables' },
      update: {},
      create: { name: 'Vegetables', slug: 'vegetables' },
    }),
    prisma.category.upsert({
      where: { slug: 'beverages' },
      update: {},
      create: { name: 'Beverages', slug: 'beverages' },
    }),
  ]);

  const products = [
    { name: 'Whole Milk', slug: 'whole-milk', description: '1 gallon', price: 3.99, stock: 50, categoryId: categories[0].id },
    { name: 'Cheddar Cheese', slug: 'cheddar-cheese', description: '8 oz block', price: 4.49, stock: 30, categoryId: categories[0].id },
    { name: 'Greek Yogurt', slug: 'greek-yogurt', description: '32 oz', price: 5.99, stock: 40, categoryId: categories[0].id },
    { name: 'Butter', slug: 'butter', description: '1 lb', price: 4.29, stock: 25, categoryId: categories[0].id },
    { name: 'Eggs', slug: 'eggs', description: 'Dozen', price: 3.49, stock: 60, categoryId: categories[0].id },
    { name: 'Apples', slug: 'apples', description: '1 lb', price: 2.99, stock: 80, categoryId: categories[1].id },
    { name: 'Bananas', slug: 'bananas', description: '1 lb', price: 0.69, stock: 100, categoryId: categories[1].id },
    { name: 'Oranges', slug: 'oranges', description: '1 lb', price: 3.49, stock: 70, categoryId: categories[1].id },
    { name: 'Strawberries', slug: 'strawberries', description: '1 lb', price: 4.99, stock: 45, categoryId: categories[1].id },
    { name: 'Blueberries', slug: 'blueberries', description: '6 oz', price: 3.99, stock: 35, categoryId: categories[1].id },
    { name: 'Sourdough Bread', slug: 'sourdough-bread', description: '1 loaf', price: 5.49, stock: 20, categoryId: categories[2].id },
    { name: 'Croissant', slug: 'croissant', description: 'Pack of 4', price: 4.99, stock: 30, categoryId: categories[2].id },
    { name: 'Bagels', slug: 'bagels', description: 'Pack of 6', price: 3.99, stock: 25, categoryId: categories[2].id },
    { name: 'Muffins', slug: 'muffins', description: 'Pack of 4', price: 5.29, stock: 22, categoryId: categories[2].id },
    { name: 'Whole Wheat Bread', slug: 'whole-wheat-bread', description: '1 loaf', price: 3.99, stock: 40, categoryId: categories[2].id },
    { name: 'Carrots', slug: 'carrots', description: '1 lb', price: 1.49, stock: 90, categoryId: categories[3].id },
    { name: 'Broccoli', slug: 'broccoli', description: '1 lb', price: 2.29, stock: 55, categoryId: categories[3].id },
    { name: 'Spinach', slug: 'spinach', description: '10 oz', price: 2.99, stock: 45, categoryId: categories[3].id },
    { name: 'Tomatoes', slug: 'tomatoes', description: '1 lb', price: 2.49, stock: 60, categoryId: categories[3].id },
    { name: 'Potatoes', slug: 'potatoes', description: '5 lb bag', price: 3.99, stock: 70, categoryId: categories[3].id },
    { name: 'Orange Juice', slug: 'orange-juice', description: '64 oz', price: 4.49, stock: 35, categoryId: categories[4].id },
    { name: 'Sparkling Water', slug: 'sparkling-water', description: '12 pack', price: 4.99, stock: 50, categoryId: categories[4].id },
    { name: 'Green Tea', slug: 'green-tea', description: '20 bags', price: 3.29, stock: 40, categoryId: categories[4].id },
    { name: 'Coffee', slug: 'coffee', description: '12 oz', price: 8.99, stock: 28, categoryId: categories[4].id },
    { name: 'Apple Juice', slug: 'apple-juice', description: '64 oz', price: 3.99, stock: 42, categoryId: categories[4].id },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: { stock: p.stock, price: p.price },
      create: p,
    });
  }

  const hash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: { username: 'demo', password: hash },
  });

  console.log('Seed completed: categories, products, and demo user (demo / password123)');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
