import { Redirect } from "expo-router";

/**
 * Explicit web/native entry point. Expo Router otherwise has no route for `/`
 * because the authenticated tabs live in a route group and the public entry
 * screen is `/sign-in`.
 */
export default function Index() {
  return <Redirect href="/sign-in" />;
}
