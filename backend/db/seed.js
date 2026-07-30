import { getDb, runSql } from './connection.js';

/**
 * Seeds the database with default categories, items with images, and human-crafted explicit announcement phrases for "Tea Bhatti".
 */
export function seedDatabase() {
  const db = getDb();

  // Clear existing items and categories to ensure fresh seed
  runSql('DELETE FROM items');
  runSql('DELETE FROM categories');

  const insertCategory = (id, name, icon, sortOrder) => {
    runSql('INSERT INTO categories (id, name, icon, sort_order) VALUES (?, ?, ?, ?)',
      [id, name, icon, sortOrder]);
  };

  const insertItem = (id, catId, nameEn, nameHi, nameBho, imageUrl, isFav, sortOrder) => {
    runSql('INSERT INTO items (id, category_id, name_en, name_hi, name_bho, image_url, is_favorite, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, catId, nameEn, nameHi, nameBho, imageUrl, isFav, sortOrder]);
  };

  const insertLanguage = (code, label, voiceModel, isDefault) => {
    runSql('INSERT OR IGNORE INTO languages (code, label, voice_model, is_default) VALUES (?, ?, ?, ?)',
      [code, label, voiceModel, isDefault]);
  };

  // --- Languages ---
  insertLanguage('en', 'English', 'en_US-lessac-medium', 1);
  insertLanguage('hi', 'हिन्दी', 'hi_IN-priyamvada-medium', 0);
  insertLanguage('bho', 'भोजपुरी', 'hi_IN-priyamvada-medium', 0);

  // --- Categories (Tea Bhatti Menu) ---
  insertCategory(1, 'Burger',       '🍔', 1);
  insertCategory(2, 'Sandwich',     '🥪', 2);
  insertCategory(3, 'Pizza',        '🍕', 3);
  insertCategory(4, 'French Fries', '🍟', 4);
  insertCategory(5, 'Pasta',        '🍝', 5);
  insertCategory(6, 'Maggie',       '🍜', 6);
  insertCategory(7, 'Vada Pav',     '🌭', 7);
  insertCategory(8, 'Combos',       '🍽️', 8);

  // --- Menu Items with Explicit Item Names & Human Punctuation Pauses ---

  // 1. BURGERRR (category 1)
  insertItem(1, 1, 'Veggie Aloo Patty',          'वेज आलू पैटी बर्गर',            'ए जी! ... वेजी आलू पैटी बर्गर तैयार बा, जल्दी काउंटर पर आईं!', '/menu_images/Veggie Aloo Patty Burger.webp', 1, 1);
  insertItem(2, 1, 'Veg. Double Aloo Patty',     'वेज डबल आलू पैटी बर्गर',       'डबल आलू पैटी बर्गर तैयार बा, ... भूख के अब छुट्टी मिली!', '/menu_images/Veg. Double Aloo Patty Burger.webp', 0, 2);
  insertItem(3, 1, 'Veggie Cheese Burger',       'वेज चीज़ बर्गर',                'वेजी चीज़ बर्गर तैयार बा, ... चीज़ गरम बा, देर मत करीं!', '/menu_images/Veggie Cheese Burger.webp', 0, 3);
  insertItem(4, 1, 'Veggie Paneer Cheese',       'वेज पनीर चीज़ बर्गर',          'वेजी पनीर चीज़ बर्गर तैयार बा, ... जल्दी ले जाईं!', '/menu_images/Veggie Paneer Cheese Burger.webp', 0, 4);
  insertItem(5, 1, 'Tandoori Paneer Burger',     'तंदूरी पनीर बर्गर',             'तंदूरी पनीर बर्गर तैयार बा, ... खुशबू पूरा कैफे में घूम रहल बा!', '/menu_images/Tandoori Paneer Burger.webp', 1, 5);
  insertItem(6, 1, 'Veg. Double Patty & Cheese', 'वेज डबल पैटी चीज़ बर्गर',      'वेज डबल पैटी चीज़ बर्गर तैयार बा, ... अब इंतजार मत कराईं!', '/menu_images/Veg. Double Patty & Cheese Burger.webp', 0, 6);
  insertItem(7, 1, 'Special King Burger',        'टी भट्टी स्पेशल किंग बर्गर',    'टी भट्टी स्पेशल किंग बर्गर तैयार बा, ... राजा लोग जल्दी आईं!', '/menu_images/Tea Bhatti Sp. King Burger.webp', 1, 7);

  // 2. SANDWICH (category 2)
  insertItem(8,  2, 'Veggie Sandwich',           'वेज सैंडविच',                    'वेजी सैंडविच तैयार बा, ... काउंटर पर स्वागत बा!', '/menu_images/Veggie Sandwich.webp', 1, 1);
  insertItem(9,  2, 'Cheese Corn Sandwich',      'चीज़ कॉर्न सैंडविच',             'चीज़ कॉर्न सैंडविच तैयार बा, ... जल्दी उठाईं!', '/menu_images/Cheese Corn Sandwich.webp', 0, 2);
  insertItem(10, 2, 'Tandoori Paneer Sandwich',  'तंदूरी पनीर सैंडविच',          'तंदूरी पनीर सैंडविच तैयार बा, ... गरम-गरम बा!', '/menu_images/Tandoori Paneer Sandwich.webp', 1, 3);
  insertItem(11, 2, 'Tandoori Paneer 2X Layer',  'तंदूरी पनीर 2X लेयर सैंडविच',   'तंदूरी पनीर 2X लेयर सैंडविच तैयार बा, ... अब बस ले जाए के बा!', '/menu_images/Tandoori Paneer 2X Layer Sandwich.webp', 0, 4);
  insertItem(12, 2, 'Tea Bhatti Special Sandwich','टी भट्टी स्पेशल सैंडविच',      'टी भट्टी स्पेशल सैंडविच तैयार बा, ... स्वाद इंतजार करत बा!', '/menu_images/Tea Bhatti Special Sandwich.webp', 1, 5);

  // 3. PIZZAAAH (category 3)
  insertItem(13, 3, 'Sp. Cheese Bread Pizza',    'स्पेशल चीज़ ब्रेड पिज्जा',       'स्पेशल चीज़ ब्रेड पिज्जा तैयार बा, ... जल्दी आईं!', '/menu_images/Sp. Cheese Bread Pizza.webp', 0, 1);
  insertItem(14, 3, 'Cheese Onion Capsicum',     'चीज़ अनियन कैप्सिकम पिज्जा',     'चीज़ अनियन कैप्सिकम पिज्जा तैयार बा, ... गरम-गरम बा!', '/menu_images/Cheese Onion Capsicum Pizza.webp', 0, 2);
  insertItem(15, 3, 'Cheese Veg Paradise',       'चीज़ वेज पैराडाइज पिज्जा',        'चीज़ वेज पैराडाइज पिज्जा तैयार बा, ... स्वाद के मजा लीं!', '/menu_images/Cheese Veg Paradise Pizza.webp', 1, 3);
  insertItem(16, 3, 'Veggie Cheese Corn',        'वेज चीज़ कॉर्न पिज्जा',           'वेजी चीज़ कॉर्न पिज्जा तैयार बा, ... गरम-गरम बा!', '/menu_images/Veggie Cheese Corn Pizza (2).webp', 0, 4);
  insertItem(17, 3, 'Cheese Peppy Paneer',       'चीज़ पेपी पनीर पिज्जा',          'चीज़ पेपी पनीर पिज्जा तैयार बा, ... जल्दी काउंटर पर आईं!', '/menu_images/Cheese Peppy Paneer Pizza.webp', 1, 5);
  insertItem(18, 3, 'Tandoori Paneer Pizza',     'तंदूरी पनीर पिज्जा',             'तंदूरी पनीर पिज्जा तैयार बा, ... देरी मत करीं!', '/menu_images/Tandoori Paneer Pizza.webp', 0, 6);
  insertItem(19, 3, 'Kadhai Paneer Pizza',      'कढ़ाही पनीर पिज्जा',             'कढ़ाही पनीर पिज्जा तैयार बा, ... अब बस ले जाए के बा!', '/menu_images/Kadhai Paneer Pizza.webp', 0, 7);
  insertItem(20, 3, 'Cheese Burst Add-on',       'चीज़ बर्स्ट पिज्जा',              'चीज़ बर्स्ट पिज्जा तैयार बा, ... चीज़ पिघल रहल बा!', '/menu_images/Sp. Cheese Bread Pizza.webp', 0, 8);

  // 4. FRENCH FRIES (category 4)
  insertItem(21, 4, 'Masala French Fries',       'मसाला फ्रेंच फ्राइज़',            'मसाला फ्रेंच फ्राइज तैयार बा, ... कुरकुरा मजा इंतजार करत बा!', '/menu_images/Masala French Fries.webp', 1, 1);
  insertItem(22, 4, 'Peri Peri French Fries',     'पेरी पेरी फ्रेंच फ्राइज़',         'पेरी पेरी फ्रेंच फ्राइज तैयार बा, ... जल्दी आईं!', '/menu_images/Peri Peri French Fries.webp', 0, 2);
  insertItem(23, 4, 'Cheese French Fries',        'चीज़ फ्रेंच फ्राइज़',             'चीज़ फ्रेंच फ्राइज तैयार बा, ... चीज़ पिघल रहल बा!', '/menu_images/Cheese French Fries.webp', 0, 3);

  // 5. PAAAASTA (category 5)
  insertItem(24, 5, 'Veggie Pasta',              'वेज पास्ता',                     'वेजी पास्ता तैयार बा, ... काउंटर पर आईं!', '/menu_images/Veggie Paasta.webp', 0, 1);
  insertItem(25, 5, 'Red Sauce Pasta',           'रेड सॉस पास्ता',                 'रेड सॉस पास्ता तैयार बा, ... स्वाद बुलावत बा!', '/menu_images/Red Sauce Paasta.webp', 1, 2);
  insertItem(26, 5, 'Cheese Pasta',              'चीज़ पास्ता',                    'चीज़ पास्ता तैयार बा, ... गरम-गरम बा!', '/menu_images/Cheesee Paasta.webp', 0, 3);

  // 6. MAGGIE (category 6)
  insertItem(27, 6, 'Plain Maggie',              'प्लेन मैगी',                     'प्लेन मैगी तैयार बा, ... जल्दी ले जाईं!', '/menu_images/Plain Maggie.webp', 0, 1);
  insertItem(28, 6, 'Veggie Maggie',             'वेज मैगी',                       'वेजी मैगी तैयार बा, ... भूख अब भागी!', '/menu_images/Veggie Maggie.webp', 1, 2);
  insertItem(29, 6, 'Plain Cheese Maggie',       'प्लेन चीज़ मैगी',                'प्लेन चीज़ मैगी तैयार बा, ... मजा दुगुना हो जाई!', '/menu_images/Plain Cheese Maggie.webp', 0, 3);
  insertItem(30, 6, 'Veggie Cheese Maggie',      'वेज चीज़ मैगी',                  'वेजी चीज़ मैगी तैयार बा, ... काउंटर पर आईं!', '/menu_images/veggie Cheese Maggie.webp', 0, 4);
  insertItem(31, 6, 'Tandoori Maggie',           'तंदूरी मैगी',                    'तंदूरी मैगी तैयार बा, ... खुशबू से मन ललचा जाई!', '/menu_images/Tandoori Maggie.webp', 0, 5);

  // 7. VADA PAV (category 7)
  insertItem(32, 7, 'Butter Vadapav',            'बटर वड़ा पाव',                   'बटर वड़ा पाव तैयार बा, ... जल्दी उठाईं!', '/menu_images/Butter Vadapav.webp', 1, 1);
  insertItem(33, 7, 'Cheese Butter Vadapav',     'चीज़ बटर वड़ा पाव',              'चीज़ बटर वड़ा पाव तैयार बा, ... गरम बा!', '/menu_images/Cheese Butter Vadapav.webp', 0, 2);
  insertItem(34, 7, 'Tandoori Vadapav',          'तंदूरी वड़ा पाव',                'तंदूरी वड़ा पाव तैयार बा, ... स्वाद इंतजार करत बा!', '/menu_images/Tandoori Vadapav.webp', 0, 3);

  // 8. COMBOS (category 8)
  insertItem(35, 8, 'Combo 1: Peppy Pizza + Corn Sandwich + 2 Coffees',  'कॉम्बो 1 पिज्जा सैंडविच और कॉफी', 'कॉम्बो 1 पिज्जा सैंडविच और कॉफी तैयार बा, ... जल्दी ले जाईं!', '/menu_images/1 Ch. Peppy Paneer Pizza + 1 Ch. Corn Sandwich + 2 Cold Coffe.webp', 1, 1);
  insertItem(36, 8, 'Combo 2: 2 King Burgers + Cheese Fries + 2 Shakes',  'कॉम्बो 2 बर्गर फ्राइज़ और शेक',   'कॉम्बो 2 किंग बर्गर फ्राइज़ और शेक तैयार बा, ... राजा स्टाइल में लीं!', '/menu_images/2 King Burger + 1 Ch. Fries + 2 Oreo Shake.webp', 0, 2);
  insertItem(37, 8, 'Combo 3: Tandoori & Veg Pizza + 2 Cold Coffees',     'कॉम्बो 3 पिज्जा और कोल्ड कॉफी',   'कॉम्बो 3 तंदूरी वेज पिज्जा और कोल्ड कॉफी तैयार बा!', '/menu_images/1 Tandoori Pizza + 1 Veg Paradise Pizza + 2 Cold Coffe.webp', 0, 3);

  // --- Settings ---
  runSql('INSERT OR IGNORE INTO settings (id, theme, default_language, volume, fade_ms, repeat_cooldown_ms) VALUES (1, ?, ?, ?, ?, ?)',
    ['light', 'en', 0.9, 150, 800]);

  console.log('✅ Database seeded with expressive human speech pauses (37 items)');
}

// Allow running directly: node backend/db/seed.js
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('seed.js') ||
  process.argv[1].includes('seed')
);

if (isMainModule) {
  const { initDb, closeDb } = await import('./connection.js');
  await initDb();
  seedDatabase();
  closeDb();
}
