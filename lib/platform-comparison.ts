export interface PlatformConfig {
  id: string;
  name: string;
  color: string;
  logo: string; // emoji placeholder
  monthlyFee: string;
  commissionRate: string;
  staffFee: string;
  exportInstructions: ExportStep[];
  exportDifficulty: "easy" | "medium" | "hard";
  clientsExportNote: string;
}

export interface ExportStep {
  step: number;
  instruction: string;
  detail?: string;
}

export interface ComparisonRow {
  feature: string;
  competitor: string;
  vomni: string;
  vomniWins: boolean;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  fresha: {
    id: "fresha",
    name: "Fresha",
    color: "#6B3FA0",
    logo: "🟣",
    monthlyFee: "Free (but takes commission)",
    commissionRate: "20-30% on new clients",
    staffFee: "Free",
    exportDifficulty: "easy",
    clientsExportNote: "Self-service CSV export from Clients section",
    exportInstructions: [
      { step: 1, instruction: "Log into partners.fresha.com", detail: "Use your owner account" },
      { step: 2, instruction: "Click 'Clients' in the left sidebar menu" },
      { step: 3, instruction: "Click 'Options' button (top right corner)" },
      { step: 4, instruction: "Select 'Export as CSV'" },
      { step: 5, instruction: "Save the file, then upload it here below" },
    ],
  },
  booksy: {
    id: "booksy",
    name: "Booksy",
    color: "#1A237E",
    logo: "🔵",
    monthlyFee: "£29.99/month",
    commissionRate: "None, but high monthly fee",
    staffFee: "£20 per additional staff member",
    exportDifficulty: "hard",
    clientsExportNote: "Must request via support — not self-service",
    exportInstructions: [
      { step: 1, instruction: "Open the Booksy Biz app on your phone" },
      { step: 2, instruction: "Tap the '?' help icon (bottom right)" },
      { step: 3, instruction: "Start a Live Chat with support" },
      { step: 4, instruction: "Send this message: 'Please send me my full client list as a CSV file'", detail: "They typically respond within 1-2 hours" },
      { step: 5, instruction: "Download the CSV they send you, then upload it here below" },
    ],
  },
  square: {
    id: "square",
    name: "Square",
    color: "#006AFF",
    logo: "⬛",
    monthlyFee: "Free–£29/month",
    commissionRate: "None",
    staffFee: "Included",
    exportDifficulty: "easy",
    clientsExportNote: "Export from Customer Directory",
    exportInstructions: [
      { step: 1, instruction: "Log into squareup.com/dashboard" },
      { step: 2, instruction: "Click 'Customers' in the left menu" },
      { step: 3, instruction: "Click 'Import / Export' → 'Export Customers'" },
      { step: 4, instruction: "Download the CSV file, then upload it here below" },
    ],
  },
  vagaro: {
    id: "vagaro",
    name: "Vagaro",
    color: "#E91E63",
    logo: "🔴",
    monthlyFee: "$25–$85/month",
    commissionRate: "None",
    staffFee: "$10 per additional staff",
    exportDifficulty: "easy",
    clientsExportNote: "Export from Client section",
    exportInstructions: [
      { step: 1, instruction: "Log into vagaro.com" },
      { step: 2, instruction: "Click 'Clients' in the top navigation" },
      { step: 3, instruction: "Click the 'Export' button (top right)" },
      { step: 4, instruction: "Choose 'All Clients' and download the CSV" },
      { step: 5, instruction: "Upload the file here below" },
    ],
  },
  treatwell: {
    id: "treatwell",
    name: "Treatwell",
    color: "#00B67A",
    logo: "🟢",
    monthlyFee: "Free (takes commission)",
    commissionRate: "20-30% on marketplace bookings",
    staffFee: "Free",
    exportDifficulty: "medium",
    clientsExportNote: "Export from Connect dashboard",
    exportInstructions: [
      { step: 1, instruction: "Log into connect.treatwell.com" },
      { step: 2, instruction: "Go to 'Clients' section" },
      { step: 3, instruction: "Click 'Export' and choose date range 'All time'" },
      { step: 4, instruction: "Download the CSV and upload it here below" },
    ],
  },
  calmark: {
    id: "calmark",
    name: "Calmark",
    color: "#FF6B35",
    logo: "🟠",
    monthlyFee: "£15–£30/month",
    commissionRate: "None",
    staffFee: "Included",
    exportDifficulty: "medium",
    clientsExportNote: "Export from Reports section",
    exportInstructions: [
      { step: 1, instruction: "Log into your Calmark dashboard" },
      { step: 2, instruction: "Go to 'Reports' → 'Clients'" },
      { step: 3, instruction: "Click 'Export to CSV'" },
      { step: 4, instruction: "Upload the file here below" },
    ],
  },
  styleseat: {
    id: "styleseat",
    name: "StyleSeat",
    color: "#2D3047",
    logo: "⚫",
    monthlyFee: "$35/month",
    commissionRate: "None",
    staffFee: "N/A (solo-focused)",
    exportDifficulty: "medium",
    clientsExportNote: "Export from Client management",
    exportInstructions: [
      { step: 1, instruction: "Log into styleseat.com" },
      { step: 2, instruction: "Go to 'Clients' section" },
      { step: 3, instruction: "Click 'Export Clients' button" },
      { step: 4, instruction: "Upload the downloaded CSV here below" },
    ],
  },
  mindbody: {
    id: "mindbody",
    name: "Mindbody",
    color: "#FF6900",
    logo: "🟠",
    monthlyFee: "$129–$349/month",
    commissionRate: "None",
    staffFee: "Included",
    exportDifficulty: "medium",
    clientsExportNote: "Export from Client Contacts report",
    exportInstructions: [
      { step: 1, instruction: "Log into Mindbody Business app" },
      { step: 2, instruction: "Go to Reports → Clients → 'Client Contact Info'" },
      { step: 3, instruction: "Click 'Export' and download CSV" },
      { step: 4, instruction: "Upload the file here below" },
    ],
  },
  other: {
    id: "other",
    name: "Another platform",
    color: "#6B7280",
    logo: "📋",
    monthlyFee: "Varies",
    commissionRate: "Varies",
    staffFee: "Varies",
    exportDifficulty: "medium",
    clientsExportNote: "Export client list as CSV from your platform",
    exportInstructions: [
      { step: 1, instruction: "Find the 'Clients' or 'Customers' section in your platform" },
      { step: 2, instruction: "Look for an 'Export' or 'Download' option" },
      { step: 3, instruction: "Download the file as CSV or Excel format" },
      { step: 4, instruction: "Upload it here — we'll automatically detect the columns" },
    ],
  },
};

export function getComparisonRows(platform: PlatformConfig): ComparisonRow[] {
  return [
    { feature: "Monthly fee", competitor: platform.monthlyFee, vomni: "£35 flat — unlimited everything", vomniWins: true },
    { feature: "Commission on bookings", competitor: platform.commissionRate, vomni: "Zero. Ever.", vomniWins: true },
    { feature: "Automatic Google reviews", competitor: "Extra charge or not available", vomni: "Included free", vomniWins: true },
    { feature: "AI review recovery", competitor: "No", vomni: "Yes — catches negative reviews privately", vomniWins: true },
    { feature: "You own your customer data", competitor: "Limited — export restrictions apply", vomni: "Yes, always. Export anytime.", vomniWins: true },
    { feature: "Customer support", competitor: "Email only", vomni: "WhatsApp + email", vomniWins: true },
    { feature: "Cancel anytime", competitor: "Yes", vomni: "Yes", vomniWins: false },
  ];
}
