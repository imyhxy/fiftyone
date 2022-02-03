import reactRefresh from "@vitejs/plugin-react-refresh";
import { UserConfig } from "vite";
import relay from "vite-plugin-relay";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default {
  base: "",
  plugins: [
    reactRefresh({
      parserPlugins: ["classProperties", "classPrivateProperties"],
    }),
    relay,
    nodePolyfills(),
  ],
} as UserConfig;
