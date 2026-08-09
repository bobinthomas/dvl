import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
  },
  resolve: {
    // Generated react-native output imports the real "react-native" package
    // name — that's the correct, portable import for a consumer's actual
    // app. Under vitest there's no device or Metro bundler, so this alias
    // swaps in react-native-web's DOM implementations of the same
    // components purely for the test run, the same technique real RN-on-web
    // apps use in production, not a stand-in that changes what the
    // generated source says.
    alias: {
      "react-native": "react-native-web",
    },
  },
});
