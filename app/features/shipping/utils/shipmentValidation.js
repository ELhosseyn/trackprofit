/**
 * ShipmentFormValidation utility
 * Validates shipment form data before submission
 */

/**
 * Validate shipment form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} - Validation result with success and errors
 */
export function validateShipmentForm(formData) {
  const errors = {};
  
  // Required fields
  const requiredFields = [
    { field: 'Client', message: 'Client name is required' },
    { field: 'MobileA', message: 'Primary phone is required' },
    { field: 'Adresse', message: 'Address is required' },
    { field: 'IDWilaya', message: 'Wilaya is required' },
    { field: 'Wilaya', message: 'Wilaya name is required' },
    { field: 'Commune', message: 'Commune is required' },
    { field: 'Total', message: 'Amount is required' },
    { field: 'TProduit', message: 'Product description is required' }
  ];
  
  requiredFields.forEach(({ field, message }) => {
    if (!formData[field]) {
      errors[field] = message;
    }
  });
  
  // Phone validation
  if (formData.MobileA && !/^\d{9,14}$/.test(formData.MobileA.replace(/\D/g, ''))) {
    errors.MobileA = 'Primary phone must be a valid number';
  }
  
  if (formData.MobileB && !/^\d{9,14}$/.test(formData.MobileB.replace(/\D/g, ''))) {
    errors.MobileB = 'Secondary phone must be a valid number';
  }
  
  // Amount validation
  if (formData.Total && (isNaN(parseFloat(formData.Total)) || parseFloat(formData.Total) < 0)) {
    errors.Total = 'Amount must be a valid positive number';
  }
  
  return {
    success: Object.keys(errors).length === 0,
    errors
  };
}
