import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const API = typeof window !== 'undefined'
  ? 'http://localhost:3000/v1'
  : 'http://10.0.0.22:3000/v1';

const STORE_INFO = {
  paknsave:   { name: "Pak'nSave",  color: '#e8231a' },
  newworld:   { name: 'New World',  color: '#007837' },
  woolworths: { name: 'Woolworths', color: '#1b5e20' },
  countdown:  { name: 'Countdown',  color: '#007229' },
};

export default function PriceComparisonScreen({ onBack }) {
  const [products, setProducts]             = useState([]);
  const [selected, setSelected]             = useState(null);
  const [prices, setPrices]                 = useState([]);
  const [loading, setLoading]               = useState(true);
  const [loadingPrices, setLoadingPrices]   = useState(false);
  const [refreshing, setRefreshing]         = useState(false);

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      const { data } = await axios.get(`${API}/products`);
      setProducts(data);
      if (data.length > 0) selectProduct(data[0]);
    } catch (err) {
      console.error('fetchProducts error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectProduct = async (product) => {
    setSelected(product);
    setLoadingPrices(true);
    setPrices([]);
    try {
      const { data } = await axios.get(`${API}/products/${product._id}/prices`);
      // Sort cheapest first
      const sorted = [...data].sort((a, b) => a.price - b.price);
      setPrices(sorted);
    } catch (err) {
      console.error('fetchPrices error:', err.message);
      setPrices([]);
    } finally {
      setLoadingPrices(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (selected) await selectProduct(selected);
    setRefreshing(false);
  }, [selected]);

  const cheapest      = prices[0];
  const mostExpensive = prices[prices.length - 1];
  const savings       = prices.length > 1
    ? (mostExpensive.price - cheapest.price).toFixed(2)
    : 0;

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#1a5c38" />
      <Text style={s.loadingText}>Loading products...</Text>
    </View>
  );

  return (
    <View style={s.container}>

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Price Comparison</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* ── Product chips ── */}
      <View style={s.chipWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipScroll}
        >
          {products.map(item => (
            <TouchableOpacity
              key={item._id}
              style={[s.chip, selected?._id === item._id && s.chipActive]}
              onPress={() => selectProduct(item)}
            >
              <Text
                style={[s.chipText, selected?._id === item._id && s.chipTextActive]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Body ── */}
      <ScrollView
        style={s.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1a5c38']}
            tintColor="#1a5c38"
          />
        }
      >
        {/* Product name + savings badge */}
        {selected && (
          <View style={s.productHeader}>
            <Text style={s.productName} numberOfLines={2}>{selected.name}</Text>
            {Number(savings) > 0 && (
              <View style={s.saveBadge}>
                <Text style={s.saveText}>Save ${savings}</Text>
              </View>
            )}
          </View>
        )}

        {/* Price cards */}
        {loadingPrices ? (
          <ActivityIndicator size="large" color="#1a5c38" style={{ marginTop: 40 }} />
        ) : prices.length === 0 ? (
          <Text style={s.empty}>No price data available for this product</Text>
        ) : (
          prices.map((item, index) => {
            // Fix: backend returns store name in _id field
            const storeKey   = item.store || item._id || '';
            const store      = STORE_INFO[storeKey] || { name: storeKey, color: '#999' };
            const isCheapest = index === 0;
            const diff       = cheapest ? (item.price - cheapest.price).toFixed(2) : 0;

            return (
              <View
                key={`${storeKey}-${index}`}
                style={[s.priceCard, isCheapest && s.priceCardCheapest]}
              >
                {/* Store color dot */}
                <View style={[s.storeDot, { backgroundColor: store.color }]} />

                {/* Store name + cheapest badge + date */}
                <View style={{ flex: 1 }}>
                  <View style={s.storeNameRow}>
                    <Text style={s.storeName}>{store.name}</Text>
                    {isCheapest && (
                      <View style={s.cheapestBadge}>
                        <Text style={s.cheapestText}>Cheapest</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.updated}>
                    Updated: {new Date(item.date || item.updatedAt).toLocaleDateString('en-NZ', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                  </Text>
                </View>

                {/* Price + diff */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.price, isCheapest && s.priceCheapest]}>
                    ${item.price.toFixed(2)}
                  </Text>
                  {!isCheapest && Number(diff) > 0 && (
                    <Text style={s.diff}>+${diff} more</Text>
                  )}
                </View>

              </View>
            );
          })
        )}

        <Text style={s.tip}>Pull down to refresh prices</Text>
      </ScrollView>

    </View>
  );
}

const GREEN = '#1a5c38';

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f5f5f5' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:  { color: '#888', fontSize: 14, marginTop: 8 },

  // Header
  header: {
    backgroundColor: GREEN,
    paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { width: 60 },
  backText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Product chips
  chipWrapper: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: '#eee',
  },
  chipScroll:        { paddingHorizontal: 16, gap: 8, flexDirection: 'row' },
  chip:              { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  chipActive:        { backgroundColor: GREEN, borderColor: GREEN },
  chipText:          { fontSize: 13, color: '#555' },
  chipTextActive:    { color: '#fff', fontWeight: '600' },

  // Body
  body: { flex: 1, padding: 16 },

  // Product header
  productHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 14,
  },
  productName: { fontSize: 17, fontWeight: '700', color: '#222', flex: 1, marginRight: 8 },
  saveBadge:   { backgroundColor: '#e8f5e9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  saveText:    { color: GREEN, fontSize: 12, fontWeight: '700' },

  // Price cards
  priceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#eee',
  },
  priceCardCheapest: {
    borderColor: GREEN, borderWidth: 2,
    backgroundColor: '#f3faf4',
  },

  // Store
  storeDot:     { width: 10, height: 10, borderRadius: 5, marginRight: 12, flexShrink: 0 },
  storeNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  storeName:    { fontSize: 15, fontWeight: '600', color: '#222' },

  // Cheapest badge
  cheapestBadge: { backgroundColor: GREEN, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  cheapestText:  { color: '#fff', fontSize: 10, fontWeight: '700' },

  updated: { fontSize: 11, color: '#999', marginTop: 3 },

  // Price
  price:         { fontSize: 20, fontWeight: '700', color: '#333' },
  priceCheapest: { color: GREEN },
  diff:          { fontSize: 11, color: '#e65100', marginTop: 2 },

  empty: { textAlign: 'center', color: '#aaa', marginTop: 60, fontSize: 14 },
  tip:   { textAlign: 'center', color: '#ccc', fontSize: 12, paddingVertical: 20 },
});