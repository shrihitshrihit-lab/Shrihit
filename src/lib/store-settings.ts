export interface StoreSettings {
  id: number;
  store_name: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  whatsapp_number: string;
  free_shipping_threshold: number;
  shipping_cost: number;
  razorpay_enabled: boolean;
  instagram_url: string;
  facebook_url: string;
  twitter_url: string;
  youtube_url: string;
}

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  id: 1,
  store_name: "Shrihit",
  tagline: "Sacred Craftsmanship for Divine Moments",
  email: "contact@shrihit.in",
  phone: "+91 98765 43210",
  address: "Moradabad, Uttar Pradesh, India",
  whatsapp_number: "+919876543210",
  free_shipping_threshold: 600,
  shipping_cost: 80,
  razorpay_enabled: true,
  instagram_url: "",
  facebook_url: "",
  twitter_url: "",
  youtube_url: "",
};

export const normalizeStoreSettings = (settings: Partial<StoreSettings> | null | undefined): StoreSettings => ({
  ...DEFAULT_STORE_SETTINGS,
  ...settings,
});
