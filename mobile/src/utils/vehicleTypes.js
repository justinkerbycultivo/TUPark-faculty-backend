// Mirrors backend/utils/vehicleTypes.js VEHICLE_TYPE_KEYS exactly (8 types).
// Adds a short display label and a MaterialCommunityIcons icon name for the
// chip/grid selector used on Register, the guard visitor form and admin
// vehicle views.

export const VEHICLE_TYPES = [
  { key: 'motorcycle', label: 'Motorcycle', icon: 'motorbike' },
  { key: 'car', label: 'Car', icon: 'car' },
  { key: 'tricycle', label: 'Tricycle', icon: 'rickshaw' },
  { key: 'e_bike', label: 'E-Bike', icon: 'bicycle' },
  { key: 'bicycle', label: 'Bicycle', icon: 'bike' },
  { key: 'electric_motorcycle', label: 'Electric Motorcycle', icon: 'motorbike-electric' },
  { key: 'electric_scooter', label: 'Electric Scooter', icon: 'scooter-electric' },
  { key: 'other', label: 'Other', icon: 'help-circle-outline' },
];

export const VEHICLE_TYPE_KEYS = VEHICLE_TYPES.map((v) => v.key);

export function vehicleTypeLabel(key, vehicleTypeOther) {
  if (key === 'other' && vehicleTypeOther) return vehicleTypeOther;
  const found = VEHICLE_TYPES.find((v) => v.key === key);
  return found ? found.label : key || 'Unknown';
}

export function vehicleTypeIcon(key) {
  const found = VEHICLE_TYPES.find((v) => v.key === key);
  return found ? found.icon : 'help-circle-outline';
}
