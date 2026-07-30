import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, default: '🍽️' },
  sort_order: { type: Number, default: 0 }
}, { timestamps: true });

const itemSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  category_id: { type: Number, required: true, ref: 'Category' },
  name_en: { type: String, required: true },
  name_hi: { type: String, default: '' },
  name_bho: { type: String, default: '' },
  price: { type: Number, required: true },
  image_url: { type: String, required: true },
  is_popular: { type: Boolean, default: false },
  is_available: { type: Boolean, default: true },
  sort_order: { type: Number, default: 0 }
}, { timestamps: true });

const historySchema = new mongoose.Schema({
  item_id: { type: Number, default: null },
  language_code: { type: String, required: true },
  text_spoken: { type: String, required: true },
  status: { type: String, default: 'queued' },
  priority: { type: String, default: 'normal' },
  triggered_at: { type: Date, default: Date.now },
  played_at: { type: Date, default: null },
  error_message: { type: String, default: null }
}, { timestamps: true });

const settingsSchema = new mongoose.Schema({
  id: { type: Number, default: 1, unique: true },
  default_language: { type: String, default: 'en' },
  volume: { type: Number, default: 0.9 },
  theme: { type: String, default: 'light' }
}, { timestamps: true });

export const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
export const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
export const History = mongoose.models.History || mongoose.model('History', historySchema);
export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
