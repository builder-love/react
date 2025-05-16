// app/utilities/NumberFormats.tsx


// Helper function to format numbers with commas
const formatNumberWithCommas = (number: number | null | undefined): string => {
    if (number === null || number === undefined) {
      return 'N/A'; // Or '0' or an empty string, depending on preference
    }
    return number.toLocaleString();
  };

export { formatNumberWithCommas };