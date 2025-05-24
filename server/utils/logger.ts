import winston from "winston";

export default winston.createLogger({
  format: winston.format.cli(),
  level: "verbose",
  transports: [new winston.transports.Console()],
});
