import dotenv from 'dotenv';
import { connectMongoDB } from './mongoConnection.js';
import { Category, Item, Settings } from './mongoSchemas.js';

dotenv.config();

export async function seedMongoDatabase() {
  const connected = await connectMongoDB();
  if (!connected) {
    console.warn('⚠️ Could not connect to MongoDB Atlas for seeding.');
    return false;
  }

  try {
    console.log('🌱 Seeding MongoDB Atlas database...');

    // Clear existing data
    await Category.deleteMany({});
    await Item.deleteMany({});

    // 1. Categories
    const categories = [
      { id: 1, name: 'Burger', icon: '🍔', sort_order: 1 },
      { id: 2, name: 'Sandwich', icon: '🥪', sort_order: 2 },
      { id: 3, name: 'Pizza', icon: '🍕', sort_order: 3 },
      { id: 4, name: 'French Fries', icon: '🍟', sort_order: 4 },
      { id: 5, name: 'Pasta', icon: '🍝', sort_order: 5 },
      { id: 6, name: 'Maggie', icon: '🍜', sort_order: 6 },
      { id: 7, name: 'Vada Pav', icon: '🌭', sort_order: 7 },
      { id: 8, name: 'Combos', icon: '🍽️', sort_order: 8 },
    ];
    await Category.insertMany(categories);

    // 2. Items (37 items)
    const items = [
      // Burger (cat 1)
      { id: 1, category_id: 1, name_en: 'Veggie Aloo Patty', name_hi: 'वेज आलू पैटी बर्गर', name_bho: 'ए जी! ... वेजी आलू पैटी बर्गर तैयार बा, जल्दी काउंटर पर आईं!', price: 69, image_url: '/menu_images/Veggie Aloo Patty Burger.png', is_popular: true, sort_order: 1 },
      { id: 2, category_id: 1, name_en: 'Veg. Double Aloo Patty', name_hi: 'वेज डबल आलू पैटी बर्गर', name_bho: 'डबल आलू पैटी बर्गर तैयार बा, ... भूख के अब छुट्टी मिली!', price: 89, image_url: '/menu_images/Veg. Double Aloo Patty Burger.png', is_popular: false, sort_order: 2 },
      { id: 3, category_id: 1, name_en: 'Veggie Cheese Burger', name_hi: 'वेज चीज़ बर्गर', name_bho: 'वेजी चीज़ बर्गर तैयार बा, ... चीज़ गरम बा, देर मत करीं!', price: 99, image_url: '/menu_images/Veggie Cheese Burger.png', is_popular: false, sort_order: 3 },
      { id: 4, category_id: 1, name_en: 'Veggie Paneer Cheese', name_hi: 'वेज पनीर चीज़ बर्गर', name_bho: 'वेजी पनीर चीज़ बर्गर तैयार बा, ... जल्दी ले जाईं!', price: 119, image_url: '/menu_images/Veggie Paneer Cheese Burger.png', is_popular: false, sort_order: 4 },
      { id: 5, category_id: 1, name_en: 'Tandoori Paneer Burger', name_hi: 'तंदूरी पनीर बर्गर', name_bho: 'तंदूरी पनीर बर्गर तैयार बा, ... खुशबू पूरा कैफे में घूम रहल बा!', price: 129, image_url: '/menu_images/Tandoori Paneer Burger.png', is_popular: true, sort_order: 5 },
      { id: 6, category_id: 1, name_en: 'Veg. Double Patty & Cheese', name_hi: 'वेज डबल पैटी चीज़ बर्गर', name_bho: 'वेज डबल पैटी चीज़ बर्गर तैयार बा, ... अब इंतजार मत कराईं!', price: 139, image_url: '/menu_images/Veg. Double Patty & Cheese Burger.png', is_popular: false, sort_order: 6 },
      { id: 7, category_id: 1, name_en: 'Special King Burger', name_hi: 'टी भट्टी स्पेशल किंग बर्गर', name_bho: 'टी भट्टी स्पेशल किंग बर्गर तैयार बा, ... राजा लोग जल्दी आईं!', price: 149, image_url: '/menu_images/Tea Bhatti Sp. King Burger.png', is_popular: true, sort_order: 7 },

      // Sandwich (cat 2)
      { id: 8, category_id: 2, name_en: 'Veggie Sandwich', name_hi: 'वेज सैंडविच', name_bho: 'वेजी सैंडविच तैयार बा, ... काउंटर पर स्वागत बा!', price: 59, image_url: '/menu_images/Veggie Sandwich.png', is_popular: true, sort_order: 1 },
      { id: 9, category_id: 2, name_en: 'Cheese Corn Sandwich', name_hi: 'चीज़ कॉर्न सैंडविच', name_bho: 'चीज़ कॉर्न सैंडविच तैयार बा, ... जल्दी उठाईं!', price: 79, image_url: '/menu_images/Cheese Corn Sandwich.png', is_popular: false, sort_order: 2 },
      { id: 10, category_id: 2, name_en: 'Tandoori Paneer Sandwich', name_hi: 'तंदूरी पनीर सैंडविच', name_bho: 'तंदूरी पनीर सैंडविच तैयार बा, ... गरम-गरम बा!', price: 99, image_url: '/menu_images/Tandoori Paneer Sandwich.png', is_popular: true, sort_order: 3 },
      { id: 11, category_id: 2, name_en: 'Tandoori Paneer 2X Layer', name_hi: 'तंदूरी पनीर 2X लेयर सैंडविच', name_bho: 'तंदूरी पनीर 2X लेयर सैंडविच तैयार बा, ... अब बस ले जाए के बा!', price: 119, image_url: '/menu_images/Tandoori Paneer 2X Layer Sandwich.png', is_popular: false, sort_order: 4 },
      { id: 12, category_id: 2, name_en: 'Tea Bhatti Special Sandwich', name_hi: 'टी भट्टी स्पेशल सैंडविच', name_bho: 'टी भट्टी स्पेशल सैंडविच तैयार बा, ... स्वाद इंतजार करत बा!', price: 129, image_url: '/menu_images/Tea Bhatti Special Sandwich.png', is_popular: true, sort_order: 5 },

      // Pizza (cat 3)
      { id: 13, category_id: 3, name_en: 'Sp. Cheese Bread Pizza', name_hi: 'स्पेशल चीज़ ब्रेड पिज्जा', name_bho: 'स्पेशल चीज़ ब्रेड पिज्जा तैयार बा, ... जल्दी आईं!', price: 89, image_url: '/menu_images/Sp. Cheese Bread Pizza.png', is_popular: false, sort_order: 1 },
      { id: 14, category_id: 3, name_en: 'Cheese Onion Capsicum', name_hi: 'चीज़ अनियन कैप्सिकम पिज्जा', name_bho: 'चीज़ अनियन कैप्सिकम पिज्जा तैयार बा, ... गरम-गरम बा!', price: 129, image_url: '/menu_images/Cheese Onion Capsicum Pizza.png', is_popular: false, sort_order: 2 },
      { id: 15, category_id: 3, name_en: 'Cheese Veg Paradise', name_hi: 'चीज़ वेज पैराडाइज पिज्जा', name_bho: 'चीज़ वेज पैराडाइज पिज्जा तैयार बा, ... स्वाद के मजा लीं!', price: 149, image_url: '/menu_images/Cheese Veg Paradise Pizza.png', is_popular: true, sort_order: 3 },
      { id: 16, category_id: 3, name_en: 'Veggie Cheese Corn', name_hi: 'वेज चीज़ कॉर्न पिज्जा', name_bho: 'वेजी चीज़ कॉर्न पिज्जा तैयार बा, ... गरम-गरम बा!', price: 139, image_url: '/menu_images/Veggie Cheese Corn Pizza (2).png', is_popular: false, sort_order: 4 },
      { id: 17, category_id: 3, name_en: 'Cheese Peppy Paneer', name_hi: 'चीज़ पेपी पनीर पिज्जा', name_bho: 'चीज़ पेपी पनीर पिज्जा तैयार बा, ... जल्दी काउंटर पर आईं!', price: 169, image_url: '/menu_images/Cheese Peppy Paneer Pizza.png', is_popular: true, sort_order: 5 },
      { id: 18, category_id: 3, name_en: 'Tandoori Paneer Pizza', name_hi: 'तंदूरी पनीर पिज्जा', name_bho: 'तंदूरी पनीर पिज्जा तैयार बा, ... देरी मत करीं!', price: 179, image_url: '/menu_images/Tandoori Paneer Pizza.png', is_popular: false, sort_order: 6 },
      { id: 19, category_id: 3, name_en: 'Kadhai Paneer Pizza', name_hi: 'कढ़ाही पनीर पिज्जा', name_bho: 'कढ़ाही पनीर पिज्जा तैयार बा, ... अब बस ले जाए के बा!', price: 189, image_url: '/menu_images/Kadhai Paneer Pizza.png', is_popular: false, sort_order: 7 },
      { id: 20, category_id: 3, name_en: 'Cheese Burst Add-on', name_hi: 'चीज़ बर्स्ट पिज्जा', name_bho: 'चीज़ बर्स्ट पिज्जा तैयार बा, ... चीज़ पिघल रहल बा!', price: 199, image_url: '/menu_images/Sp. Cheese Bread Pizza.png', is_popular: false, sort_order: 8 },

      // French Fries (cat 4)
      { id: 21, category_id: 4, name_en: 'Masala French Fries', name_hi: 'मसाला फ्रेंच फ्राइज़', name_bho: 'मसाला फ्रेंच फ्राइज तैयार बा, ... कुरकुरा मजा इंतजार करत बा!', price: 69, image_url: '/menu_images/Masala French Fries.png', is_popular: true, sort_order: 1 },
      { id: 22, category_id: 4, name_en: 'Peri Peri French Fries', name_hi: 'पेरी पेरी फ्रेंच फ्राइज़', name_bho: 'पेरी पेरी फ्रेंच फ्राइज तैयार बा, ... जल्दी आईं!', price: 79, image_url: '/menu_images/Peri Peri French Fries.png', is_popular: false, sort_order: 2 },
      { id: 23, category_id: 4, name_en: 'Cheese French Fries', name_hi: 'चीज़ फ्रेंच फ्राइज़', name_bho: 'चीज़ फ्रेंच फ्राइज तैयार बा, ... चीज़ पिघल रहल बा!', price: 89, image_url: '/menu_images/Cheese French Fries.png', is_popular: false, sort_order: 3 },

      // Pasta (cat 5)
      { id: 24, category_id: 5, name_en: 'Veggie Pasta', name_hi: 'वेज पास्ता', name_bho: 'वेजी पास्ता तैयार बा, ... काउंटर पर आईं!', price: 79, image_url: '/menu_images/Veggie Paasta.png', is_popular: false, sort_order: 1 },
      { id: 25, category_id: 5, name_en: 'Red Sauce Pasta', name_hi: 'रेड सॉस पास्ता', name_bho: 'रेड सॉस पास्ता तैयार बा, ... स्वाद बुलावत बा!', price: 99, image_url: '/menu_images/Red Sauce Paasta.png', is_popular: true, sort_order: 2 },
      { id: 26, category_id: 5, name_en: 'Cheese Pasta', name_hi: 'चीज़ पास्ता', name_bho: 'चीज़ पास्ता तैयार बा, ... गरम-गरम बा!', price: 109, image_url: '/menu_images/Cheesee Paasta.png', is_popular: false, sort_order: 3 },

      // Maggie (cat 6)
      { id: 27, category_id: 6, name_en: 'Plain Maggie', name_hi: 'प्लेन मैगी', name_bho: 'प्लेन मैगी तैयार बा, ... जल्दी ले जाईं!', price: 39, image_url: '/menu_images/Plain Maggie.png', is_popular: false, sort_order: 1 },
      { id: 28, category_id: 6, name_en: 'Veggie Maggie', name_hi: 'वेज मैगी', name_bho: 'वेजी मैगी तैयार बा, ... भूख अब भागी!', price: 59, image_url: '/menu_images/Veggie Maggie.png', is_popular: true, sort_order: 2 },
      { id: 29, category_id: 6, name_en: 'Plain Cheese Maggie', name_hi: 'प्लेन चीज़ मैगी', name_bho: 'प्लेन चीज़ मैगी तैयार बा, ... मजा दुगुना हो जाई!', price: 69, image_url: '/menu_images/Plain Cheese Maggie.png', is_popular: false, sort_order: 3 },
      { id: 30, category_id: 6, name_en: 'Veggie Cheese Maggie', name_hi: 'वेज चीज़ मैगी', name_bho: 'वेजी चीज़ मैगी तैयार बा, ... काउंटर पर आईं!', price: 79, image_url: '/menu_images/veggie Cheese Maggie.png', is_popular: false, sort_order: 4 },
      { id: 31, category_id: 6, name_en: 'Tandoori Maggie', name_hi: 'तंदूरी मैगी', name_bho: 'तंदूरी मैगी तैयार बा, ... खुशबू से मन ललचा जाई!', price: 89, image_url: '/menu_images/Tandoori Maggie.png', is_popular: false, sort_order: 5 },

      // Vada Pav (cat 7)
      { id: 32, category_id: 7, name_en: 'Butter Vadapav', name_hi: 'बटर वड़ा पाव', name_bho: 'बटर वड़ा पाव तैयार बा, ... जल्दी उठाईं!', price: 39, image_url: '/menu_images/Butter Vadapav.png', is_popular: true, sort_order: 1 },
      { id: 33, category_id: 7, name_en: 'Cheese Butter Vadapav', name_hi: 'चीज़ बटर वड़ा पाव', name_bho: 'चीज़ बटर वड़ा पाव तैयार बा, ... गरम बा!', price: 49, image_url: '/menu_images/Cheese Butter Vadapav.png', is_popular: false, sort_order: 2 },
      { id: 34, category_id: 7, name_en: 'Tandoori Vadapav', name_hi: 'तंदूरी वड़ा पाव', name_bho: 'तंदूरी वड़ा पाव तैयार बा, ... स्वाद इंतजार करत बा!', price: 59, image_url: '/menu_images/Tandoori Vadapav.png', is_popular: false, sort_order: 3 },

      // Combos (cat 8)
      { id: 35, category_id: 8, name_en: 'Combo 1: Peppy Pizza + Corn Sandwich + 2 Coffees', name_hi: 'कॉम्बो 1 पिज्जा सैंडविच और कॉफी', name_bho: 'कॉम्बो 1 पिज्जा सैंडविच और कॉफी तैयार बा, ... जल्दी ले जाईं!', price: 299, image_url: '/menu_images/1 Ch. Peppy Paneer Pizza + 1 Ch. Corn Sandwich + 2 Cold Coffe.png', is_popular: true, sort_order: 1 },
      { id: 36, category_id: 8, name_en: 'Combo 2: 2 King Burgers + Cheese Fries + 2 Shakes', name_hi: 'कॉम्बो 2 बर्गर फ्राइज़ और शेक', name_bho: 'कॉम्बो 2 किंग बर्गर फ्राइज़ और शेक तैयार बा, ... राजा स्टाइल में लीं!', price: 399, image_url: '/menu_images/2 King Burger + 1 Ch. Fries + 2 Oreo Shake.png', is_popular: false, sort_order: 2 },
      { id: 37, category_id: 8, name_en: 'Combo 3: Tandoori & Veg Pizza + 2 Cold Coffees', name_hi: 'कॉम्बो 3 पिज्जा और कोल्ड कॉफी', name_bho: 'कॉम्बो 3 तंदूरी वेज पिज्जा और कोल्ड कॉफी तैयार बा!', price: 349, image_url: '/menu_images/1 Tandoori Pizza + 1 Veg Paradise Pizza + 2 Cold Coffe.png', is_popular: false, sort_order: 3 },
    ];
    await Item.insertMany(items);

    // 3. Settings
    const existingSettings = await Settings.findOne({ id: 1 });
    if (!existingSettings) {
      await Settings.create({ id: 1, default_language: 'en', volume: 0.9, theme: 'light' });
    }

    console.log('✅ MongoDB Atlas seeded successfully with 8 Categories and 37 Menu Items!');
    return true;
  } catch (err) {
    console.error('❌ Error seeding MongoDB Atlas:', err);
    return false;
  }
}

// Allow direct CLI execution
if (process.argv[1]?.includes('seedMongo.js')) {
  seedMongoDatabase().then(() => process.exit(0));
}
