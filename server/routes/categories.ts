export default defineEventHandler((event) => {
  logger.info(`Processing ${event.path}`);
  return config.categories;
});
