/**
 * International number and currency formatting utilities for TrackProfit.
 * Ensures consistent display of numbers and currencies across the application,
 * supporting both Arabic (with Eastern Arabic numerals) and English languages.
 */

/**
 * Returns the appropriate locale for number and currency formatting.
 * For Arabic, 'ar-SA' is used to ensure Eastern Arabic numerals are displayed,
 * which aligns with the desired visual style for financial figures.
 *
 * @param {string} language - The current language code ('ar' or 'en').
 * @returns {string} The locale string (e.g., 'ar-SA', 'en-US').
 */
const getLocale = (language) => {
  return language === 'ar' ? 'ar-SA' : 'en-US';
};

/**
 * Formats a number according to the given language using consistent locale settings.
 *
 * @param {number | string} amount - The number to format.
 * @param {string} language - The current language ('ar' or 'en').
 * @returns {string} The formatted number as a string, or "0" if the input is invalid.
 */
export const formatNumber = (amount, language) => {
  const num = Number(amount);
  if (amount === undefined || amount === null || isNaN(num)) {
    return new Intl.NumberFormat(getLocale(language)).format(0);
  }
  const locale = getLocale(language);
  return new Intl.NumberFormat(locale).format(num);
};

/**
 * Formats a monetary value into a localized currency string.
 *
 * @param {number | string} amount - The currency value.
 * @param {string} language - The current language ('ar' or 'en').
 * @param {string} currency - The ISO 4217 currency code (e.g., 'DZD', 'USD').
 * @param {boolean} [isCost=false] - If true, the amount is treated as a cost and will be prefixed with a minus sign.
 * @returns {string} The formatted currency string, or "-" if the input is invalid.
 */
export const formatCurrency = (amount, language, currency = 'DZD', isCost = false) => {
  const value = Number(amount);
  if (amount === undefined || amount === null || isNaN(value)) {
    return "-";
  }

  const absoluteValue = Math.abs(value);
  // The sign is manually prepended to ensure consistency across all locales.
  // A negative sign is applied if it's a cost or if the original value was negative.
  const sign = isCost || value < 0 ? '−' : ''; // Using minus sign U+2212 for better typography
  const locale = getLocale(language);

  try {
    const formattedValue = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      currencyDisplay: 'symbol', // Use currency symbol where available
    }).format(absoluteValue);

    return `${sign}${formattedValue}`;
  } catch (e) {
    // Fallback for rare cases where the currency code might not be supported.
    console.warn(`Could not format currency '${currency}'. Using fallback formatting.`, e);
    return `${sign}${absoluteValue.toFixed(2)} ${currency}`;
  }
};
