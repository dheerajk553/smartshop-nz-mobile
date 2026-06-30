import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  ScrollView, StatusBar, StyleSheet,
  Text, TouchableOpacity, View
} from 'react-native';

const API = 'http://10.0.0.22:3000/v1';

export default function HomeScreen({ onNavigate, onLogout }) {
  const [userName, setUserName] = useState('');
  const [stats, setStats]       = useState({ lists: 0, items: 0, savings: 0 });
  const [token, setToken]       = useState('');

  const fetchStats = async (t) => {
    try {
      const { data } = await axios.get(`${API}/lists`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      const totalItems = data.reduce((acc, l) => acc + l.items.length, 0);
      setStats({ lists: data.length, items: totalItems, savings: (totalItems * 1.2).toFixed(2) });
    } catch (e) { console.log(e.message); }
  };

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      if (t) { setToken(t); fetchStats(t); }
    });
    AsyncStorage.getItem('userName').then(n => {
      if (n) setUserName(n);
    });
  }, []);

  const features = [
    { icon:'🔍', title:'Price Comparison', desc:"Compare prices across Pak'nSave, New World & Woolworths", color:'#e8f5e9', border:'#1a5c38', screen:'PriceComparison' },
    { icon:'🛒', title:'Shopping List',    desc:'Manage your grocery list and track what you need',        color:'#e3f2fd', border:'#1565c0', screen:'ShoppingList' },
    { icon:'📈', title:'Price History',    desc:'Track price changes over time and spot the best deals',   color:'#fff3e0', border:'#e65100', screen:'PriceHistory' },
    { icon:'🔔', title:'Deal Alerts',      desc:'Get notified when prices drop on your favourite items',   color:'#fce4ec', border:'#c62828', screen:'DealAlerts' },
    { icon:'📍', title:'Store Navigation', desc:'Find products inside the store using QR codes', color:'#f3e5f5', border:'#6a1b9a', screen:'QRScanner' },
    { icon:'💰', title:'Price Optimisation', desc:'Find the cheapest store for your whole shopping list', color:'#e0f7fa', border:'#006064', screen:'PriceOptimisation' },
  ];

  const stores = [
    { name:"Pak'nSave", color:'#FFD700', text:'#333' },
    { name:'New World',  color:'#e53935', text:'#fff' },
    { name:'Woolworths', color:'#1b5e20', text:'#fff' },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="#1a5c38" />

      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Kia ora 👋</Text>
          <Text style={s.userName}>{userName || 'Shopper'}</Text>
        </View>
        <TouchableOpacity style={s.logoutBtn} onPress={onLogout}>
          <Text style={s.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>

        <View style={s.statsRow}>
          <View style={s.statCard}>
            <Text style={s.statVal}>{stats.lists}</Text>
            <Text style={s.statLbl}>Lists</Text>
          </View>
          <View style={s.statCard}>
            <Text style={s.statVal}>{stats.items}</Text>
            <Text style={s.statLbl}>Items</Text>
          </View>
          <View style={s.statCard}>
            <Text style={[s.statVal, { color:'#1a5c38' }]}>${stats.savings}</Text>
            <Text style={s.statLbl}>Est. Savings</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>🏪 Supported Stores</Text>
        <View style={s.storesRow}>
          {stores.map(store => (
            <View key={store.name} style={[s.storeChip, { backgroundColor: store.color }]}>
              <Text style={[s.storeText, { color: store.text }]}>{store.name}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>⚡ Features</Text>
        <View style={s.grid}>
          {features.map(f => (
            <TouchableOpacity
              key={f.screen}
              style={[s.card, { backgroundColor: f.color, borderLeftColor: f.border }]}
              onPress={() => onNavigate(f.screen)}
              activeOpacity={0.85}
            >
              <Text style={s.cardIcon}>{f.icon}</Text>
              <Text style={s.cardTitle}>{f.title}</Text>
              <Text style={s.cardDesc}>{f.desc}</Text>
              <Text style={[s.cardArrow, { color: f.border }]}>Tap to open →</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.footer}>
          <Text style={s.footerText}>SmartShop NZ · MSE907 Capstone</Text>
          <Text style={s.footerSub}>Yoobee College · Dheeraj Kumar</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex:1, backgroundColor:'#f5f5f5' },
  header:      { backgroundColor:'#1a5c38', padding:20, paddingTop:48,
                 flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  greeting:    { color:'#a5d6a7', fontSize:13 },
  userName:    { color:'#fff', fontSize:20, fontWeight:'700', marginTop:2 },
  logoutBtn:   { backgroundColor:'rgba(255,255,255,0.2)', borderRadius:8, paddingHorizontal:12, paddingVertical:6 },
  logoutText:  { color:'#fff', fontSize:13, fontWeight:'600' },
  scroll:      { flex:1 },
  statsRow:    { flexDirection:'row', gap:10, padding:16, paddingBottom:8 },
  statCard:    { flex:1, backgroundColor:'#fff', borderRadius:12, padding:14,
                 alignItems:'center', elevation:2, shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4 },
  statVal:     { fontSize:22, fontWeight:'700', color:'#333' },
  statLbl:     { fontSize:11, color:'#888', marginTop:2 },
  sectionTitle:{ fontSize:15, fontWeight:'700', color:'#333', paddingHorizontal:16, marginTop:12, marginBottom:8 },
  storesRow:   { flexDirection:'row', gap:8, paddingHorizontal:16, marginBottom:4 },
  storeChip:   { flex:1, borderRadius:8, padding:10, alignItems:'center' },
  storeText:   { fontSize:12, fontWeight:'700' },
  grid:        { padding:12, gap:10 },
  card:        { backgroundColor:'#fff', borderRadius:14, padding:16, borderLeftWidth:4, elevation:2,
                 shadowColor:'#000', shadowOpacity:0.06, shadowRadius:4 },
  cardIcon:    { fontSize:26, marginBottom:6 },
  cardTitle:   { fontSize:15, fontWeight:'700', color:'#222', marginBottom:4 },
  cardDesc:    { fontSize:12, color:'#666', lineHeight:18, marginBottom:8 },
  cardArrow:   { fontSize:12, fontWeight:'600' },
  footer:      { padding:24, alignItems:'center' },
  footerText:  { color:'#aaa', fontSize:12 },
  footerSub:   { color:'#ccc', fontSize:11, marginTop:2 },
  comingSoonBanner: {
    margin: 16, padding: 16, backgroundColor: '#e0f7fa',
    borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#006064',
  },
  comingSoonTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginBottom: 6 },
  comingSoonText: { fontSize: 13, color: '#555', lineHeight: 19, marginBottom: 10 },
  comingSoonClose: {
    backgroundColor: '#006064', paddingVertical: 8, borderRadius: 8, alignItems: 'center',
  },
  comingSoonCloseText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});