/* Seed database with admin user + sample menu */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@restaurant.local' },
    update: {},
    create: {
      email: 'admin@restaurant.local',
      password: adminPassword,
      name: 'Restaurant Admin',
      role: 'ADMIN',
    },
  });

  // Subadmin user
  const subadminPassword = await bcrypt.hash('sub123', 10);
  await prisma.user.upsert({
    where: { email: 'subadmin@restaurant.local' },
    update: {},
    create: {
      email: 'subadmin@restaurant.local',
      password: subadminPassword,
      name: 'Restaurant Subadmin',
      role: 'SUBADMIN',
    },
  });

  // Default tags incl. best-seller (used by Eat-Sleep-Repeat slider)
  const defaultTags = [
    { name: 'Bestseller',   slug: 'best-seller', icon: '🔥', color: '#ff5a14' },
    { name: 'Vegetarisch',  slug: 'vegetarian',  icon: '🌱', color: '#10b981' },
    { name: 'Scharf',       slug: 'spicy',       icon: '🌶️', color: '#ef4444' },
    { name: 'Neu',          slug: 'new',         icon: '✨', color: '#3b82f6' },
  ];
  for (const t of defaultTags) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: t, create: t });
  }

  // Categories
  const categories = [
    { name: 'Burgers',   slug: 'burgers',   sortOrder: 1, imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800' },
    { name: 'Pizza',     slug: 'pizza',     sortOrder: 2, imageUrl: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800' },
    { name: 'Pasta',     slug: 'pasta',     sortOrder: 3, imageUrl: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800' },
    { name: 'Sides',     slug: 'sides',     sortOrder: 4, imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800' },
    { name: 'Salads',    slug: 'salads',    sortOrder: 5, imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800' },
    { name: 'Wraps',     slug: 'wraps',     sortOrder: 6, imageUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800' },
    { name: 'Chicken',   slug: 'chicken',   sortOrder: 7, imageUrl: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=800' },
    { name: 'Drinks',    slug: 'drinks',    sortOrder: 8, imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800' },
    { name: 'Desserts',  slug: 'desserts',  sortOrder: 9, imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800' },
    { name: 'Breakfast', slug: 'breakfast', sortOrder: 10, imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800' },
  ];

  const cats = {};
  for (const c of categories) {
    cats[c.slug] = await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }

  // â”€â”€ 100 Menu items â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const items = [
    // BURGERS (15)
    { cat: 'burgers', name: 'Rumble Classic',        price: 12.50, desc: 'Hand-smashed beef patty, cheddar, lettuce, tomato, house sauce',             img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600' },
    { cat: 'burgers', name: 'Bacon Bomb',             price: 14.90, desc: 'Double beef, crispy bacon, smoked cheese, BBQ',                              img: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600' },
    { cat: 'burgers', name: 'Veggie Crunch',          price: 11.50, desc: 'Crispy plant patty, avocado, vegan mayo, rocket',                            img: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?w=600', veg: true },
    { cat: 'burgers', name: 'Spicy Inferno',          price: 13.90, desc: 'Beef patty, habanero salsa, jalapeÃ±os, pepper jack cheese',                  img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600', spicy: true },
    { cat: 'burgers', name: 'Truffle Royale',         price: 16.90, desc: 'Wagyu blend, truffle mayo, caramelised onions, gruyÃ¨re',                     img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600' },
    { cat: 'burgers', name: 'Mushroom Melt',          price: 13.50, desc: 'Beef, sautÃ©ed mushrooms, Swiss cheese, garlic butter',                       img: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=600' },
    { cat: 'burgers', name: 'Smoky BBQ Stack',        price: 15.90, desc: 'Triple patty, pulled pork, coleslaw, pickled jalapeÃ±os',                     img: 'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?w=600' },
    { cat: 'burgers', name: 'Avocado Dream',          price: 13.90, desc: 'Beef, guacamole, tomato salsa, sour cream, cheddar',                         img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=600', veg: false },
    { cat: 'burgers', name: 'Hawaiian Sunset',        price: 13.50, desc: 'Beef, grilled pineapple, ham, teriyaki glaze, mozzarella',                   img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600' },
    { cat: 'burgers', name: 'Blue Cheese Bliss',      price: 14.50, desc: 'Beef, blue cheese, caramelised walnuts, rocket, truffle oil',                img: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=600' },
    { cat: 'burgers', name: 'Crispy Chicken Burger',  price: 12.90, desc: 'Panko chicken fillet, honey mustard, pickled cucumber, iceberg',             img: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600' },
    { cat: 'burgers', name: 'Korean Gochujang',       price: 14.90, desc: 'Beef, gochujang mayo, kimchi, sesame slaw, crispy shallots',                 img: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600', spicy: true },
    { cat: 'burgers', name: 'The Vegan Beast',        price: 13.50, desc: 'Beyond Meat patty, vegan cheese, roasted peppers, chipotle mayo',            img: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=600', veg: true },
    { cat: 'burgers', name: 'Lamb & Mint',            price: 15.50, desc: 'Lamb patty, mint yoghurt, cucumber, red onion, feta',                        img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600' },
    { cat: 'burgers', name: 'Double Trouble',         price: 17.90, desc: 'Two smashed patties, American cheese, house pickles, mustard',               img: 'https://images.unsplash.com/photo-1572802419224-296b0aeee0d9?w=600' },

    // PIZZA (15)
    { cat: 'pizza', name: 'Margherita',               price: 10.50, desc: 'San Marzano tomato, fior di latte, fresh basil, olive oil',                  img: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600', veg: true },
    { cat: 'pizza', name: 'Diavola',                  price: 12.90, desc: 'Spicy Calabrian salami, mozzarella, chili flakes',                           img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600', spicy: true },
    { cat: 'pizza', name: 'Quattro Formaggi',         price: 13.90, desc: 'Mozzarella, gorgonzola, parmigiano, scamorza, honey drizzle',                img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600', veg: true },
    { cat: 'pizza', name: 'Prosciutto & Rucola',      price: 14.90, desc: 'DOP prosciutto crudo, wild rocket, shaved parmigiano, lemon oil',            img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600' },
    { cat: 'pizza', name: 'Pepperoni Classic',        price: 12.50, desc: 'Tomato, double mozzarella, crispy pepperoni cups',                           img: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600', spicy: true },
    { cat: 'pizza', name: 'Truffle Bianca',           price: 15.90, desc: 'Cream base, truffle oil, wild mushrooms, taleggio, chives',                  img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600', veg: true },
    { cat: 'pizza', name: 'BBQ Pulled Pork',          price: 14.50, desc: '12-hour pulled pork, BBQ sauce, red onion, pickled jalapeÃ±os',               img: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600', spicy: true },
    { cat: 'pizza', name: 'Veggie Supreme',           price: 12.90, desc: 'Roasted peppers, courgette, aubergine, olives, capers, mozzarella',          img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600', veg: true },
    { cat: 'pizza', name: 'Nduja Furiosa',            price: 14.90, desc: 'Spicy spreadable sausage, stracciatella, honey, fresh basil',                img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600', spicy: true },
    { cat: 'pizza', name: 'Chicken Pesto',            price: 13.50, desc: 'Grilled chicken, basil pesto, sun-dried tomatoes, mozzarella',               img: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600' },
    { cat: 'pizza', name: 'Seafood Delight',          price: 16.90, desc: 'Prawns, calamari, mussels, garlic oil, cherry tomatoes',                     img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600' },
    { cat: 'pizza', name: 'Buffalo Chicken',          price: 13.90, desc: 'Buffalo chicken, blue cheese drizzle, celery, mozzarella',                   img: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600', spicy: true },
    { cat: 'pizza', name: 'Capricciosa',              price: 13.50, desc: 'Ham, mushrooms, artichokes, olives, mozzarella',                             img: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=600' },
    { cat: 'pizza', name: 'Siciliana',                price: 13.90, desc: 'Anchovy, capers, olives, tomato, oregano, extra-virgin olive oil',           img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600' },
    { cat: 'pizza', name: 'Calzone Classico',         price: 14.50, desc: 'Folded dough stuffed with ham, ricotta, mozzarella, tomato',                 img: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600' },

    // PASTA (10)
    { cat: 'pasta', name: 'Spaghetti Carbonara',      price: 13.50, desc: 'Guanciale, egg yolk, pecorino romano, black pepper',                         img: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600' },
    { cat: 'pasta', name: 'Penne Arrabbiata',         price: 11.50, desc: 'Spicy tomato, garlic, fresh chili, parmigiano',                              img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600', spicy: true, veg: true },
    { cat: 'pasta', name: 'Fettuccine Alfredo',       price: 12.90, desc: 'Cream, parmigiano, butter, black pepper',                                    img: 'https://images.unsplash.com/photo-1551183053-bf91798d9ea0?w=600', veg: true },
    { cat: 'pasta', name: 'Tagliatelle Bolognese',    price: 14.50, desc: 'Slow-cooked beef & pork ragÃ¹, parmigiano, egg pasta',                        img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600' },
    { cat: 'pasta', name: 'Rigatoni Amatriciana',     price: 13.50, desc: 'Guanciale, San Marzano tomato, pecorino, chili',                             img: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600', spicy: true },
    { cat: 'pasta', name: 'Lasagne al Forno',         price: 15.90, desc: 'Beef bolognese, bÃ©chamel, parmigiano, egg pasta sheets',                     img: 'https://images.unsplash.com/photo-1551183053-bf91798d9ea0?w=600' },
    { cat: 'pasta', name: 'Gnocchi Gorgonzola',       price: 13.90, desc: 'Homemade potato gnocchi, gorgonzola cream, walnuts, sage',                   img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600', veg: true },
    { cat: 'pasta', name: 'Cacio e Pepe',             price: 12.50, desc: 'Tonnarelli, aged pecorino, black pepper â€” only three ingredients',            img: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600', veg: true },
    { cat: 'pasta', name: 'Pappardelle Funghi',       price: 14.50, desc: 'Wide pasta, wild mushrooms, truffle oil, thyme, parmigiano',                 img: 'https://images.unsplash.com/photo-1551183053-bf91798d9ea0?w=600', veg: true },
    { cat: 'pasta', name: 'Seafood Linguine',         price: 17.90, desc: 'Prawns, calamari, mussels, cherry tomatoes, white wine, parsley',            img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600' },

    // CHICKEN (8)
    { cat: 'chicken', name: 'Crispy Fried Chicken',   price: 12.90, desc: 'Buttermilk-brined, double-breaded, served with house slaw',                  img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=600' },
    { cat: 'chicken', name: 'Grilled Chicken Plate',  price: 13.50, desc: 'Herb-marinated breast, roasted vegetables, lemon yoghurt',                   img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600' },
    { cat: 'chicken', name: 'Buffalo Wings (6 pcs)',  price: 11.90, desc: 'Crispy wings tossed in buffalo sauce, blue cheese dip',                      img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600', spicy: true },
    { cat: 'chicken', name: 'Buffalo Wings (12 pcs)', price: 19.90, desc: 'Double portion crispy wings in buffalo sauce, blue cheese dip',              img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600', spicy: true },
    { cat: 'chicken', name: 'Chicken Tenders',        price: 10.90, desc: '5 golden tenders, honey mustard, BBQ sauce',                                 img: 'https://images.unsplash.com/photo-1562802378-063ec186a863?w=600' },
    { cat: 'chicken', name: 'Chicken Shawarma Box',   price: 14.50, desc: 'Spiced chicken, garlic sauce, pickles, tomato, Lebanese flatbread',          img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=600', spicy: true },
    { cat: 'chicken', name: 'Honey Sriracha Wings',   price: 12.90, desc: '8 wings, sticky honey sriracha glaze, sesame, spring onion',                 img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600', spicy: true },
    { cat: 'chicken', name: 'Peri Peri Chicken',      price: 13.90, desc: 'Portuguese-style peri peri marinade, grilled quarter chicken, fries',        img: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c7?w=600', spicy: true },

    // WRAPS (8)
    { cat: 'wraps', name: 'Classic Club Wrap',         price: 10.90, desc: 'Grilled chicken, bacon, lettuce, tomato, Caesar dressing',                  img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600' },
    { cat: 'wraps', name: 'Falafel Wrap',              price:  9.90, desc: 'Crispy falafel, hummus, tabbouleh, pickled turnip, tahini',                 img: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600', veg: true },
    { cat: 'wraps', name: 'Spicy Beef Wrap',           price: 11.50, desc: 'Chili beef, jalapeÃ±os, guacamole, sour cream, cheddar',                     img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600', spicy: true },
    { cat: 'wraps', name: 'Tuna Melt Wrap',            price: 10.50, desc: 'Tuna, melted cheese, red onion, cucumber, lemon mayo',                      img: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600' },
    { cat: 'wraps', name: 'BBQ Pulled Pork Wrap',      price: 11.90, desc: 'Slow-cooked pulled pork, pickled slaw, BBQ sauce',                          img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600' },
    { cat: 'wraps', name: 'Greek Halloumi Wrap',       price: 10.50, desc: 'Grilled halloumi, roasted peppers, olives, tzatziki',                       img: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600', veg: true },
    { cat: 'wraps', name: 'Teriyaki Salmon Wrap',      price: 12.90, desc: 'Teriyaki salmon, avocado, cucumber, pickled ginger, sesame',                img: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=600' },
    { cat: 'wraps', name: 'Chipotle Veggie Wrap',      price:  9.90, desc: 'Black beans, roasted corn, chipotle sauce, cheddar, guacamole',             img: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=600', veg: true, spicy: true },

    // SALADS (8)
    { cat: 'salads', name: 'Caesar Salad',             price:  9.90, desc: 'Cos lettuce, shaved parmigiano, croutons, house Caesar dressing',           img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600', veg: true },
    { cat: 'salads', name: 'Greek Salad',              price:  9.50, desc: 'Tomato, cucumber, olives, red onion, feta, oregano',                        img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600', veg: true },
    { cat: 'salads', name: 'Chicken Caesar',           price: 12.50, desc: 'Grilled chicken, romaine, parmigiano, croutons, Caesar dressing',           img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600' },
    { cat: 'salads', name: 'Nicoise Salad',            price: 13.90, desc: 'Seared tuna, green beans, eggs, olives, tomato, Dijon vinaigrette',         img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600' },
    { cat: 'salads', name: 'Quinoa Power Bowl',        price: 12.90, desc: 'Quinoa, roasted veg, avocado, edamame, tahini dressing',                    img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600', veg: true },
    { cat: 'salads', name: 'Warm Halloumi Salad',      price: 13.50, desc: 'Grilled halloumi, roasted beetroot, spinach, walnuts, honey dressing',      img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600', veg: true },
    { cat: 'salads', name: 'Thai Beef Salad',          price: 14.50, desc: 'Sliced ribeye, glass noodles, herbs, fish sauce lime dressing',             img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600', spicy: true },
    { cat: 'salads', name: 'Caprese Salad',            price: 10.90, desc: 'Buffalo mozzarella, heritage tomatoes, basil, extra-virgin olive oil',      img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600', veg: true },

    // SIDES (12)
    { cat: 'sides', name: 'Loaded Fries',              price:  6.50, desc: 'Cheese sauce, crispy bacon, jalapeÃ±os, sour cream',                         img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600' },
    { cat: 'sides', name: 'Classic Fries',             price:  3.90, desc: 'Crispy salted fries, ketchup & mayo',                                       img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600', veg: true },
    { cat: 'sides', name: 'Sweet Potato Fries',        price:  4.90, desc: 'Crispy sweet potato fries, chipotle dip',                                   img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600', veg: true },
    { cat: 'sides', name: 'Onion Rings',               price:  4.90, desc: 'Beer-battered onion rings, ranch dip',                                      img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600', veg: true },
    { cat: 'sides', name: 'Mac & Cheese',              price:  5.90, desc: 'Creamy four-cheese mac, breadcrumb crust',                                  img: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600', veg: true },
    { cat: 'sides', name: 'Garlic Bread',              price:  3.50, desc: 'Toasted ciabatta, garlic butter, parsley',                                  img: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600', veg: true },
    { cat: 'sides', name: 'Coleslaw',                  price:  2.90, desc: 'House creamy coleslaw, apple cider vinegar',                                img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600', veg: true },
    { cat: 'sides', name: 'Mozzarella Sticks',         price:  5.90, desc: 'Golden fried mozzarella, marinara dipping sauce',                           img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=600', veg: true },
    { cat: 'sides', name: 'Nachos Grande',             price:  7.90, desc: 'Tortilla chips, cheese, salsa, guacamole, jalapeÃ±os, sour cream',           img: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600', veg: true, spicy: true },
    { cat: 'sides', name: 'Spicy Wedges',              price:  4.50, desc: 'Seasoned potato wedges, sriracha aioli',                                    img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600', spicy: true, veg: true },
    { cat: 'sides', name: 'Bruschetta (3 pcs)',        price:  5.50, desc: 'Toasted bread, fresh tomato, basil, garlic, olive oil',                     img: 'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=600', veg: true },
    { cat: 'sides', name: 'Fried Calamari',            price:  8.90, desc: 'Crispy calamari rings, lemon, tartar sauce',                                img: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=600' },

    // DRINKS (12)
    { cat: 'drinks', name: 'Coca-Cola 0.33L',          price:  3.00, desc: 'Ice cold', img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600' },
    { cat: 'drinks', name: 'Coca-Cola Zero 0.33L',     price:  3.00, desc: 'Sugar-free', img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=600' },
    { cat: 'drinks', name: 'Sparkling Water 0.5L',     price:  2.50, desc: 'Chilled sparkling mineral water', img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600', veg: true },
    { cat: 'drinks', name: 'Still Water 0.5L',         price:  2.00, desc: 'Chilled mineral water', img: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=600', veg: true },
    { cat: 'drinks', name: 'Fresh Orange Juice',       price:  4.50, desc: 'Freshly squeezed, 0.3L', img: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600', veg: true },
    { cat: 'drinks', name: 'Craft IPA 0.33L',          price:  5.50, desc: 'Local craft IPA â€” hoppy & refreshing', img: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600' },
    { cat: 'drinks', name: 'Craft Lager 0.33L',        price:  4.90, desc: 'Local craft lager â€” crisp & light', img: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600' },
    { cat: 'drinks', name: 'House Red Wine 0.2L',      price:  6.90, desc: 'Italian Montepulciano d\'Abruzzo', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600' },
    { cat: 'drinks', name: 'House White Wine 0.2L',    price:  6.90, desc: 'Pinot Grigio, light & crisp', img: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600' },
    { cat: 'drinks', name: 'Classic Lemonade',         price:  4.50, desc: 'House-made, lemon, mint, sparkling water', img: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=600', veg: true },
    { cat: 'drinks', name: 'Espresso',                 price:  2.50, desc: 'Double shot, Italian roast', img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600', veg: true },
    { cat: 'drinks', name: 'Cappuccino',               price:  3.90, desc: 'Double espresso, steamed milk foam', img: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=600', veg: true },

    // DESSERTS (10)
    { cat: 'desserts', name: 'Brownie Sundae',          price:  6.90, desc: 'Warm dark chocolate brownie, vanilla gelato, chocolate sauce, whipped cream', img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600', veg: true },
    { cat: 'desserts', name: 'Tiramisu',                price:  6.50, desc: 'Classic Italian tiramisu, savoiardi, mascarpone, espresso',                  img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', veg: true },
    { cat: 'desserts', name: 'Panna Cotta',             price:  5.90, desc: 'Vanilla panna cotta, fresh strawberry coulis',                               img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600', veg: true },
    { cat: 'desserts', name: 'Cheesecake Slice',        price:  6.50, desc: 'New York-style baked cheesecake, mixed berry compote',                       img: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600', veg: true },
    { cat: 'desserts', name: 'Gelato (3 scoops)',       price:  5.50, desc: 'Choice of three scoops: chocolate, vanilla, pistachio, stracciatella',       img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600', veg: true },
    { cat: 'desserts', name: 'Churros with Dip',        price:  6.90, desc: 'Cinnamon-dusted churros, dark chocolate dipping sauce',                      img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', veg: true },
    { cat: 'desserts', name: 'Chocolate Lava Cake',     price:  7.50, desc: 'Warm molten chocolate cake, vanilla gelato',                                  img: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600', veg: true },
    { cat: 'desserts', name: 'Apple Strudel',           price:  6.90, desc: 'Austrian classic, cinnamon apple filling, vanilla sauce, powdered sugar',     img: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600', veg: true },
    { cat: 'desserts', name: 'CrÃ¨me BrÃ»lÃ©e',            price:  6.90, desc: 'Classic vanilla custard, caramelised sugar crust',                           img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600', veg: true },
    { cat: 'desserts', name: 'Affogato',                price:  5.50, desc: 'Vanilla gelato drowned in a double espresso shot',                           img: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600', veg: true },

    // BREAKFAST (12)
    { cat: 'breakfast', name: 'Full English Breakfast', price: 13.90, desc: 'Eggs, bacon, sausage, baked beans, grilled tomato, toast',                  img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600' },
    { cat: 'breakfast', name: 'Eggs Benedict',          price: 12.50, desc: 'Toasted English muffin, poached eggs, ham, hollandaise',                    img: 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?w=600' },
    { cat: 'breakfast', name: 'Avocado Toast',          price: 11.90, desc: 'Sourdough, smashed avocado, poached eggs, chili flakes, dukkah',            img: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c820?w=600', veg: true },
    { cat: 'breakfast', name: 'Acai Bowl',              price: 10.90, desc: 'Blended acai, banana, granola, coconut flakes, fresh berries, honey',       img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600', veg: true },
    { cat: 'breakfast', name: 'Pancake Stack',          price: 10.50, desc: 'Fluffy American pancakes, maple syrup, butter, fresh berries',              img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600', veg: true },
    { cat: 'breakfast', name: 'Smoked Salmon Bagel',   price: 13.50, desc: 'Toasted bagel, cream cheese, smoked salmon, capers, red onion, dill',       img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600' },
    { cat: 'breakfast', name: 'Granola Bowl',           price:  8.90, desc: 'House granola, Greek yoghurt, honey, fresh seasonal fruit',                 img: 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?w=600', veg: true },
    { cat: 'breakfast', name: 'French Toast',           price: 10.90, desc: 'Brioche, cinnamon custard, maple syrup, bacon, fresh cream',                img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600', veg: true },
    { cat: 'breakfast', name: 'Breakfast Burrito',      price: 11.50, desc: 'Scrambled eggs, chorizo, cheese, peppers, salsa, flour tortilla',           img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600', spicy: true },
    { cat: 'breakfast', name: 'Shakshuka',              price: 12.50, desc: 'Eggs poached in spiced tomato and pepper sauce, sourdough',                 img: 'https://images.unsplash.com/photo-1543352634-99a5d50ae78e?w=600', veg: true, spicy: true },
    { cat: 'breakfast', name: 'Croissant & Jam',        price:  5.50, desc: 'Butter croissant, house preserves, whipped butter',                         img: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600', veg: true },
    { cat: 'breakfast', name: 'Omelette du Jour',       price: 11.90, desc: 'Three-egg omelette, choice of fillings: cheese / mushroom / ham / veg',    img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=600', veg: true },
  ];

  console.log(`Upserting ${items.length} menu items...`);

  for (const i of items) {
    const existing = await prisma.menuItem.findFirst({ where: { name: i.name } });
    const data = {
      name: i.name,
      description: i.desc,
      price: i.price,
      imageUrl: i.img,
      isVegetarian: !!i.veg,
      isSpicy: !!i.spicy,
      categoryId: cats[i.cat].id,
    };
    if (existing) {
      await prisma.menuItem.update({ where: { id: existing.id }, data });
    } else {
      await prisma.menuItem.create({ data });
    }
  }

  console.log(`✅ Seed complete — ${items.length} items, ${categories.length} categories.`);
  console.log('Admin login:    admin@restaurant.local / admin123');
  console.log('Subadmin login: subadmin@restaurant.local / sub123');

  // Mark first item per category as best-seller for the homepage slider
  const bestTag = await prisma.tag.findUnique({ where: { slug: 'best-seller' } });
  if (bestTag) {
    for (const slug of Object.keys(cats)) {
      const first = await prisma.menuItem.findFirst({
        where: { categoryId: cats[slug].id },
        orderBy: { createdAt: 'asc' },
      });
      if (first) {
        await prisma.menuItemTag.upsert({
          where: { menuItemId_tagId: { menuItemId: first.id, tagId: bestTag.id } },
          update: {},
          create: { menuItemId: first.id, tagId: bestTag.id },
        });
      }
    }
    console.log('✅ Best-seller tags assigned (1 per category).');
  }

  // Site settings — opening hours
  const openingHours = [
    { day: 'Montag',     times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
    { day: 'Dienstag',   times: ['12:00 – 14:30', '17:00 – 22:00'], closed: false },
    { day: 'Mittwoch',   times: [], closed: true },
    { day: 'Donnerstag', times: ['12:00 – 14:30', '12:00 – 22:00'], closed: false },
    { day: 'Freitag',    times: ['08:00 – 22:00'], closed: false },
    { day: 'Samstag',    times: ['08:00 – 22:00'], closed: false },
    { day: 'Sonntag',    times: ['12:00 – 22:00'], closed: false },
  ];
  await prisma.siteSetting.upsert({
    where:  { key: 'opening_hours' },
    update: { value: JSON.stringify(openingHours) },
    create: { key: 'opening_hours', value: JSON.stringify(openingHours) },
  });
  console.log('✅ Site settings seeded.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
