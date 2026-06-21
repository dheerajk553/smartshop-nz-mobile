import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'SmartShop NZ 🛒',
          headerStyle: { backgroundColor: '#1a5c38' },
          headerTintColor: '#fff',
        }}
      />
    </Stack>
  );
}