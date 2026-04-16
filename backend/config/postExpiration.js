const DEFAULT_POST_TTL_HOURS = 2;
const DEFAULT_POST_CLEANUP_INTERVAL_MS = 60 * 1000;

const parsePositiveNumber = (value, fallbackValue) => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
};

const POST_TTL_HOURS = parsePositiveNumber(
  process.env.POST_TTL_HOURS,
  DEFAULT_POST_TTL_HOURS
);

const POST_CLEANUP_INTERVAL_MS = parsePositiveNumber(
  process.env.POST_CLEANUP_INTERVAL_MS,
  DEFAULT_POST_CLEANUP_INTERVAL_MS
);

const buildPostExpirationDate = (createdAt = new Date()) => {
  const createdAtDate =
    createdAt instanceof Date ? createdAt : new Date(createdAt);

  return new Date(createdAtDate.getTime() + POST_TTL_HOURS * 60 * 60 * 1000);
};

module.exports = {
  POST_TTL_HOURS,
  POST_CLEANUP_INTERVAL_MS,
  buildPostExpirationDate,
};
