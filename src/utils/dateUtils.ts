export const isRestaurantOpen = (openingHours: string, closingHours: string): boolean => {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const [openHours, openMinutes] = openingHours.split(':').map(Number);
  const [closeHours, closeMinutes] = closingHours.split(':').map(Number);

  const openingTime = openHours * 60 + openMinutes;
  const closingTime = closeHours * 60 + closeMinutes;

  return currentTime >= openingTime && currentTime <= closingTime;
}; 