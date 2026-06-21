import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Dimensions, FlatList,
    ScrollView, StyleSheet, Text, TouchableOpacity, View
} from 'react-native';

const API = 'http://10.0.0.22:3000/v1';
const screenWidth = Dimensions.get('window').width;

const storeStyles = {
  paknsave:   { name: "Pak'nSave",  color: '#FFD700' },
  newworld:   { name: 'New World',  color: '#e53935' },
  woolworths: { name: 'Woolworths', color: '#1b5e20' },
  countdown:  { name: 'Countdown',  color: '#1b5e20' },
};

export default function PriceHistoryScreen({ onBack }) {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory]   = useState([]);
  const [days, setDays]         = useState(30);
  const [loading, setLoading]   = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => { fetchProducts(); }, []);
  useEffect(() => { if (selected) fetchHistory(selected._id, days); }, [days]);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(`${API}/products`);
      setProducts(data);
      if (data.length > 0) selectProduct(data[0]);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = async (product) => {
    setSelected(product);
    fetchHistory(product._id, days);
  };

  const fetchHistory = async (productId, d) => {
    setLoadingHistory(true);
    try {
      const { data } = await axios.get(`${API}/products/${productId}/history?days=${d}`);
      setHistory(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error(err.message);
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const allPrices = history.map(h => h.price);
  const minPrice = allPrices.length ? Math.min(...allPrices) : 0;
  const maxPrice = allPrices.length ? Math.max(...allPrices) : 0;

  const chartMax = maxPrice * 1.1 || 1;
  const chartHeight = 120;

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
        <Text style={s.title}>📈 Price History</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Product selector */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={products}
        keyExtractor={item => item._id}
        style={s.productList}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[s.productPill, selected?._id === item._id && s.productPillActive]}
            onPress={() => selectProduct(item)}
          >
            <Text style={[s.productPillText, selected?._id === item._id && s.productPillTextActive]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Day range selector */}
      <View style={s.rangeRow}>
        {[7, 30, 90].map(d => (
          <TouchableOpacity
            key={d}
            style={[s.rangeBtn, days === d && s.rangeBtnActive]}
            onPress={() => setDays(d)}
          >
            <Text style={[s.rangeText, days === d && s.rangeTextActive]}>{d} days</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Scrollable body */}
      <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 40 }}>
        {loadingHistory ? (
          <ActivityIndicator size="large" color="#1a5c38" style={{ marginTop: 40 }} />
        ) : history.length === 0 ? (
          <Text style={s.empty}>No price history available for this period</Text>
        ) : (
          <>
            {/* Min/Max summary */}
            <View style={s.summaryRow}>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Lowest</Text>
                <Text style={[s.summaryVal, { color: '#1a5c38' }]}>${minPrice.toFixed(2)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Highest</Text>
                <Text style={[s.summaryVal, { color: '#c62828' }]}>${maxPrice.toFixed(2)}</Text>
              </View>
              <View style={s.summaryCard}>
                <Text style={s.summaryLabel}>Records</Text>
                <Text style={s.summaryVal}>{history.length}</Text>
              </View>
            </View>

            {/* Bar chart */}
            <Text style={s.sectionLabel}>Trend ({days} days)</Text>
            <View style={s.chartContainer}>
              <FlatList
                horizontal
                data={[...history].reverse()}
                keyExtractor={(item, i) => item._id || i.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ alignItems: 'flex-end', gap: 6, paddingHorizontal: 8 }}
                renderItem={({ item }) => {
                  const store = storeStyles[item.store] || { color: '#999' };
                  const barHeight = Math.max((item.price / chartMax) * chartHeight, 4);
                  return (
                    <View style={{ alignItems: 'center' }}>
                      <View style={[s.bar, { height: barHeight, backgroundColor: store.color }]} />
                      <Text style={s.barDate}>
                        {new Date(item.date).toLocaleDateString('en-NZ', { day:'numeric', month:'short' })}
                      </Text>
                    </View>
                  );
                }}
              />
            </View>

            {/* All records — plain map, no nested FlatList */}
            <Text style={s.sectionLabel}>All Records</Text>
            {history.map((item, i) => {
              const store = storeStyles[item.store] || { name: item.store, color: '#ccc' };
              return (
                <View key={item._id || i} style={s.row}>
                  <View style={[s.dot, { backgroundColor: store.color }]} />
                  <Text style={s.rowStore}>{store.name}</Text>
                  <Text style={s.rowDate}>
                    {new Date(item.date).toLocaleDateString('en-NZ', { day:'numeric', month:'short', year:'numeric' })}
                  </Text>
                  <Text style={s.rowPrice}>${item.price.toFixed(2)}</Text>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
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
  productList: { backgroundColor:'#fff', paddingVertical:12, borderBottomWidth:0.5, borderColor:'#eee' },
  productPill: { paddingHorizontal:14, paddingVertical:8, borderRadius:20,
                 borderWidth:1, borderColor:'#ddd', backgroundColor:'#fff' },
  productPillActive:    { backgroundColor:'#1a5c38', borderColor:'#1a5c38' },
  productPillText:      { fontSize:13, color:'#555' },
  productPillTextActive:{ color:'#fff', fontWeight:'600' },
  rangeRow:    { flexDirection:'row', gap:8, paddingHorizontal:16, paddingVertical:10, backgroundColor:'#fff' },
  rangeBtn:    { paddingHorizontal:14, paddingVertical:6, borderRadius:16, backgroundColor:'#f0f0f0' },
  rangeBtnActive: { backgroundColor:'#1a5c38' },
  rangeText:   { fontSize:12, color:'#666', fontWeight:'600' },
  rangeTextActive: { color:'#fff' },
  body:        { flex:1, padding:16 },
  empty:       { textAlign:'center', color:'#aaa', marginTop:60, fontSize:14 },
  summaryRow:  { flexDirection:'row', gap:10, marginBottom:16 },
  summaryCard: { flex:1, backgroundColor:'#fff', borderRadius:12, padding:12, alignItems:'center' },
  summaryLabel:{ fontSize:11, color:'#888' },
  summaryVal:  { fontSize:18, fontWeight:'700', marginTop:2, color:'#222' },
  sectionLabel:{ fontSize:13, fontWeight:'700', color:'#333', marginBottom:8 },
  chartContainer: { backgroundColor:'#fff', borderRadius:12, padding:12, marginBottom:16, height:170 },
  bar:         { width:18, borderRadius:4 },
  barDate:     { fontSize:9, color:'#999', marginTop:4, width:30, textAlign:'center' },
  row:         { flexDirection:'row', alignItems:'center', backgroundColor:'#fff',
                 borderRadius:10, padding:12, marginBottom:6 },
  dot:         { width:8, height:8, borderRadius:4, marginRight:10 },
  rowStore:    { flex:1, fontSize:13, fontWeight:'600', color:'#333' },
  rowDate:     { fontSize:11, color:'#999', marginRight:10 },
  rowPrice:    { fontSize:14, fontWeight:'700', color:'#1a5c38' },
});