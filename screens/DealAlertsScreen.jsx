import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const API = 'http://10.0.0.22:3000/v1';

export default function DealAlertsScreen({ onBack }) {
  const [products, setProducts]   = useState([]);
  const [alerts, setAlerts]       = useState([]);
  const [selected, setSelected]   = useState(null);
  const [targetPrice, setTargetPrice] = useState('');
  const [token, setToken]         = useState('');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      if (t) {
        setToken(t);
        fetchData(t);
      } else {
        setLoading(false);
      }
    });
  }, []);

  const fetchData = async (t) => {
    try {
      const [productsRes, alertsRes] = await Promise.all([
        axios.get(`${API}/products`),
        axios.get(`${API}/alerts`, { headers: { Authorization: `Bearer ${t}` } })
      ]);
      setProducts(productsRes.data);
      setAlerts(alertsRes.data);
      if (productsRes.data.length > 0) setSelected(productsRes.data[0]);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!selected || !targetPrice) return;
    setSaving(true);
    try {
      const { data } = await axios.post(
        `${API}/alerts`,
        { productId: selected._id, targetPrice: parseFloat(targetPrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAlerts([{ ...data, productId: selected }, ...alerts]);
      setTargetPrice('');
    } catch (err) {
      console.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAlert = async (id) => {
    try {
      await axios.delete(`${API}/alerts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAlerts(alerts.filter(a => a._id !== id));
    } catch (err) {
      console.error(err.message);
    }
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#1a5c38" />
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>Deal Alerts</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Create alert form */}
      <View style={s.form}>
        <Text style={s.label}>Product</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={products}
          keyExtractor={item => item._id}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[s.productPill, selected?._id === item._id && s.productPillActive]}
              onPress={() => setSelected(item)}
            >
              <Text style={[s.productPillText, selected?._id === item._id && s.productPillTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        <Text style={[s.label, { marginTop: 14 }]}>Notify me when price drops to or below</Text>
        <View style={s.inputRow}>
          <Text style={s.dollarSign}>$</Text>
          <TextInput
            style={s.input}
            placeholder="0.00"
            value={targetPrice}
            onChangeText={setTargetPrice}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={s.addBtn} onPress={createAlert} disabled={saving}>
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.addBtnText}>Set Alert</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Existing alerts list */}
      <Text style={s.sectionLabel}>Your Alerts</Text>
      {alerts.length === 0 ? (
        <Text style={s.empty}>No alerts set yet</Text>
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          renderItem={({ item }) => (
            <View style={s.alertCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.alertProduct}>{item.productId?.name || 'Unknown product'}</Text>
                <Text style={s.alertTarget}>Alert below ${item.targetPrice.toFixed(2)}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteAlert(item._id)}>
                <Text style={s.del}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#f5f5f5' },
  center:      { flex:1, justifyContent:'center', alignItems:'center' },
  header:      { backgroundColor:'#1a5c38', padding:16, paddingTop:48,
                 flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  backBtn:     { width:60 },
  backText:    { color:'#fff', fontSize:15, fontWeight:'600' },
  title:       { fontSize:17, fontWeight:'700', color:'#fff' },
  form:        { backgroundColor:'#fff', padding:16, borderBottomWidth:0.5, borderColor:'#eee' },
  label:       { fontSize:13, fontWeight:'600', color:'#555', marginBottom:8 },
  productPill: { paddingHorizontal:14, paddingVertical:8, borderRadius:20,
                 borderWidth:1, borderColor:'#ddd', backgroundColor:'#fff' },
  productPillActive:    { backgroundColor:'#1a5c38', borderColor:'#1a5c38' },
  productPillText:      { fontSize:13, color:'#555' },
  productPillTextActive:{ color:'#fff', fontWeight:'600' },
  inputRow:    { flexDirection:'row', alignItems:'center', gap:8 },
  dollarSign:  { fontSize:16, color:'#555' },
  input:       { flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, fontSize:15 },
  addBtn:      { backgroundColor:'#1a5c38', borderRadius:8, paddingHorizontal:14, paddingVertical:10 },
  addBtnText:  { color:'#fff', fontWeight:'600', fontSize:13 },
  sectionLabel:{ fontSize:13, fontWeight:'700', color:'#333', padding:16, paddingBottom:8 },
  empty:       { textAlign:'center', color:'#aaa', marginTop:40, fontSize:14 },
  alertCard:   { flexDirection:'row', alignItems:'center', backgroundColor:'#fff',
                 borderRadius:10, padding:14, marginBottom:8 },
  alertProduct:{ fontSize:14, fontWeight:'600', color:'#222' },
  alertTarget: { fontSize:12, color:'#888', marginTop:2 },
  del:         { color:'#e55', fontSize:18, paddingLeft:12 },
});