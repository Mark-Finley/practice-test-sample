import { defineConfig } from "prisma/config";

// Load dotenv conditionally. If it's not present (like during early install phases on Vercel),
// we catch the error. Environment variables will instead be read from the system context.
try {
  const dotenvModule = 'dotenv' + '/config';
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require(dotenvModule);
} catch (e) {
  // dotenv not available on path, which is fine if env variables are already set
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
