// Helper function to extract numeric values from strings
export function extractNumber(value: string): number {
  const match = value.match(/[\d.]+/); // Extracts numbers including decimals
  return match ? parseFloat(match[0]) : 0;
}
