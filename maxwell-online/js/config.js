// MAXWELL ONLINE — shared site configuration
// Edit these values to update contact details across every page.

const SITE_CONFIG = {
  businessName: "MAXWELL ONLINE",
  tagline: "Tools, hardware, auto & home — stocked and ready.",

  // Product data source: "csv" or "supabase"
  dataSource: "supabase",

  // Local CSV fallback (used while dataSource is "csv")
  productsCsvUrl: "data/products.csv",

  // Supabase project details — from Project Settings > API in your dashboard
  supabase: {
    url: "https://lzcqnwmdbmpryelyvblt.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6Y3Fud21kYm1wcnllbHl2Ymx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxMjU5MTgsImV4cCI6MjEwMjcwMTkxOH0.KzyIlbyIpJ7HGTRRYzVyqZpfpIbPmELc7tyHE0y-oSQ"
  },

  whatsappNumber: "27 69 942 7178", // replace with real number, no + or spaces
  phone: "+27 69 942 7178",
  email: "Manex1919@gmail.com",
  address: "Cape Town, South Africa",
  facebook: "#",
  instagram: "#",
  currencySymbol: "R",
  categories: [
    { name: "Tools", aisle: "01", icon: "wrench", blurb: "Power & hand tools" },
    { name: "Hardware", aisle: "02", icon: "plug", blurb: "Fasteners & fittings" },
    { name: "Automotive", aisle: "03", icon: "car", blurb: "Parts & accessories" },
    { name: "Home", aisle: "04", icon: "home", blurb: "Around the house" },
    { name: "General", aisle: "05", icon: "box", blurb: "Safety & everyday" },
    { name: "Gym", aisle: "06", icon: "dumbbell", blurb: "Fitness & training gear" }
  ]
};
