const VALID_ENTITY_TYPES = [
  'PERSON',
  'PHONE',
  'ACCOUNT',
  'LOCATION',
  'ORGANIZATION',
  'VEHICLE'
];

function isValidEntityType(type) {
  return VALID_ENTITY_TYPES.includes(type);
}

function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  // Standard Indian phone normalization
  if (digits.length === 10) {
    return '91' + digits;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return '91' + digits.slice(1);
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  return digits;
}

function normalizeAccount(account) {
  if (!account || typeof account !== 'string') return '';
  return account.trim().toUpperCase();
}

function normalizeLocation(location) {
  if (!location || typeof location !== 'string') return '';
  return location.trim().toLowerCase();
}

function normalizeEntity(type, value) {
  if (!value || typeof value !== 'string') return '';
  switch (type) {
    case 'PHONE':
      return normalizePhone(value);
    case 'ACCOUNT':
      return normalizeAccount(value);
    case 'LOCATION':
      return normalizeLocation(value);
    case 'PERSON':
    case 'ORGANIZATION':
    case 'VEHICLE':
    default:
      return value.trim().toLowerCase();
  }
}

module.exports = {
  VALID_ENTITY_TYPES,
  isValidEntityType,
  normalizePhone,
  normalizeAccount,
  normalizeLocation,
  normalizeEntity
};
