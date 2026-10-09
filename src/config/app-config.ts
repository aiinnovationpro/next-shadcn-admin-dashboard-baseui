import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Akutu",
  version: packageJson.version,
  copyright: `© ${currentYear}, Akutu.`,
  meta: {
    title: "Akutu dashboard",
    description: "A read-only view of the Akutu_2 workspace files, on this Mac only.",
  },
};
