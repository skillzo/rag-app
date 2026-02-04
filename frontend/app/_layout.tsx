import { Stack } from "expo-router";

export default function RootLayout() {
  return (
  <Stack screenOptions={{ headerShown: false , contentStyle: { backgroundColor: "transparent" } }}>
    <Stack.Screen name="index" options={{ headerShown: false }} />
  </Stack>
  );
}
