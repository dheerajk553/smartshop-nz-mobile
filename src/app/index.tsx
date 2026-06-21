import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import AuthScreen from '../../screens/AuthScreen';
import HomeScreen from '../../screens/HomeScreen';
import PriceComparisonScreen from '../../screens/PriceComparisonScreen';
import PriceHistoryScreen from '../../screens/PriceHistoryScreen';
import ShoppingListScreen from '../../screens/ShoppingListScreen';

export default function Index() {
  const [token, setToken] = useState<string | null>(null);
  const [screen, setScreen] = useState('Home');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      setToken(t);
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('userId');
    await AsyncStorage.removeItem('userName');
    setToken(null);
    setScreen('Home');
  };

  const handleLogin = async (t: string, name: string) => {
    await AsyncStorage.setItem('userName', name);
    setToken(t);
  };

  if (loading) return (
    <View style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <ActivityIndicator size="large" color="#1a5c38" />
    </View>
  );

  if (!token) return <AuthScreen onLogin={handleLogin} />;

  switch (screen) {
    case 'ShoppingList':
      return <ShoppingListScreen onLogout={handleLogout} onBack={() => setScreen('Home')} />;
    case 'PriceComparison':
      return <PriceComparisonScreen onBack={() => setScreen('Home')} />;
    case 'PriceHistory':
      return <PriceHistoryScreen onBack={() => setScreen('Home')} />;
    default:
      return <HomeScreen onNavigate={setScreen} onLogout={handleLogout} />;
  }
}