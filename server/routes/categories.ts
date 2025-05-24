export default defineEventHandler((event) => {
  logger.verbose(`Processing ${event.path}`);
  return config.categories;
});
