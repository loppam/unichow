export const CUISINE_TYPES = ["Pastries", "Smoothies", "Fast Food"] as const;
export type CuisineType = (typeof CUISINE_TYPES)[number];

// Add validation function
export const isValidCuisineType = (cuisine: string): cuisine is CuisineType => {
  return CUISINE_TYPES.includes(cuisine as CuisineType);
};

export const validateCuisineTypes = (
  cuisines: string[]
): cuisines is CuisineType[] => {
  return cuisines.every(isValidCuisineType);
};
