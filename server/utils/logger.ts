import winston from "winston";

export default winston.createLogger({
  format: winston.format.cli(),
  level: "debug",
  transports: [new winston.transports.Console()],
});
