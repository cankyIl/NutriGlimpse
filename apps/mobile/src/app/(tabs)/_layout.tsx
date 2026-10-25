import { Tabs } from 'expo-router';
import { Icon } from '../../ui/components';
import { colors as c } from '../../ui/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: c.green, tabBarInactiveTintColor: c.muted,
    tabBarStyle: { backgroundColor: c.background, borderTopColor: c.line, height: 76 + insets.bottom, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 12) }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 5 } }}>
    <Tabs.Screen name="index" options={{ title: 'Scan', tabBarIcon: ({ color }) => <Icon name="maximize" color={color} /> }} />
    <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: ({ color }) => <Icon name="clock" color={color} /> }} />
    <Tabs.Screen name="needs" options={{ title: 'My needs', tabBarIcon: ({ color }) => <Icon name="sliders" color={color} /> }} />
  </Tabs>;
}
