// app/utilities/NumberFormats.tsx


// Helper function to format numbers with commas
const formatNumberWithCommas = (number: number | null | undefined): string => {
    if (number === null || number === undefined) {
      return 'N/A'; // Or '0' or an empty string, depending on preference
    }
    return number.toLocaleString();
  };

export { formatNumberWithCommas };


export const formatPercentage = (value: number | null | undefined, addPlusSign: boolean = false) => {
  if (value === null || value === undefined) return 'N/A';
  const percentage = (value * 100).toFixed(2);
  return addPlusSign && value > 0 ? `+${percentage}%` : `${percentage}%`;
};

export const formatYAxisTickValue = (value: unknown, isMobileView: boolean): string => {
  if (typeof value !== 'number' || !isFinite(value)) {
    return String(value ?? ''); // Fallback for non-numeric or non-finite values
  }

  if (isMobileView) {
    if (Math.abs(value) >= 1_000_000_000) { // Billions
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (Math.abs(value) >= 1_000_000) { // Millions
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 10_000) { // e.g., 50k, 120k (no decimal for larger k)
      return `${Math.round(value / 1000)}k`;
    }
    if (Math.abs(value) >= 1_000) { // e.g., 1.2k, 2.0k -> 2k
      return `${(value / 1000).toFixed(1)}k`.replace(/\.0k$/, 'k');
    }
    // For smaller numbers on mobile, round to avoid long decimals if any
    return String(Math.round(value)); 
  } else {
    // Desktop: use commas for readability
    return formatNumberWithCommas(value);
  }
};