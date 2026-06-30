import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Modal, ScrollView, StyleSheet,
    Text, TouchableOpacity, View
} from 'react-native';

const API = typeof window !== 'undefined'
  ? 'http://localhost:3000/v1'
  : 'http://10.0.0.22:3000/v1';

const STORE_INFO = {
  paknsave:   { name: "Pak'nSave",  color: '#e8231a' },
  newworld:   { name: 'New World',  color: '#007837' },
  woolworths: { name: 'Woolworths', color: '#1b5e20' },
};

const STORES = ['paknsave', 'newworld', 'woolworths'];
const GREEN = '#1a5c38';

export default function PriceOptimisationScreen({ onBack }) {
  const [token, setToken]               = useState('');
  const [loading, setLoading]           = useState(true);
  const [calculating, setCalculating]   = useState(false);
  const [list, setList]                 = useState(null);
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState('');

  // Branch selection state — store -> { _id, name, suburb } | null
  const [branches, setBranches]         = useState({});       // available branches per store
  const [selectedBranch, setSelectedBranch] = useState({});   // chosen branch per store
  const [pickerStore, setPickerStore]   = useState(null);      // which store's picker is open

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      if (t) { setToken(t); init(t); }
      else setLoading(false);
    });
  }, []);

  const init = async (t) => {
    try {
      await Promise.all([fetchActiveList(t), fetchBranches(t)]);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveList = async (t) => {
    const { data } = await axios.get(`${API}/lists`, {
      headers: { Authorization: `Bearer ${t}` }
    });
    if (data.length > 0) setList(data[0]);
  };

  const fetchBranches = async (t) => {
    const results = {};
    for (const store of STORES) {
      try {
        const { data } = await axios.get(`${API}/optimise/branches`, {
          params: { store },
          headers: { Authorization: `Bearer ${t}` }
        });
        results[store] = data;
      } catch (err) {
        results[store] = [];
      }
    }
    setBranches(results);
  };

  const runOptimisation = async (overrideBranches = selectedBranch) => {
    if (!list) return;
    setCalculating(true);
    setError('');
    try {
      const branchParam = STORES
        .filter(store => overrideBranches[store])
        .map(store => `${store}:${overrideBranches[store]._id}`)
        .join(',');

      const { data } = await axios.get(`${API}/optimise/${list._id}`, {
        params: branchParam ? { branches: branchParam } : {},
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  const pickBranch = (store, branch) => {
    const next = { ...selectedBranch };
    if (branch === null) {
      delete next[store];
    } else {
      next[store] = branch;
    }
    setSelectedBranch(next);
    setPickerStore(null);
    runOptimisation(next);
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color={GREEN} />
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Price Optimisation</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={s.body}>

        {!list && (
          <Text style={s.empty}>No shopping list found. Add items to your list first.</Text>
        )}

        {list && list.items?.length === 0 && (
          <Text style={s.empty}>Your shopping list is empty — add some items first.</Text>
        )}

        {list && list.items?.length > 0 && (
          <>
            <Text style={s.sectionTitle}>📍 Choose Your Branch (optional)</Text>
            <Text style={s.sectionSub}>
              Prices may vary between branches of the same store. Select a branch for a more
              accurate total, or leave unset to use the chain average.
            </Text>

            <View style={s.branchRow}>
              {STORES.map(store => {
                const info = STORE_INFO[store];
                const chosen = selectedBranch[store];
                const hasBranches = (branches[store] || []).length > 0;
                return (
                  <TouchableOpacity
                    key={store}
                    style={[
                      s.branchChip,
                      { borderColor: info.color },
                      chosen && { backgroundColor: info.color }
                    ]}
                    disabled={!hasBranches}
                    onPress={() => setPickerStore(store)}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.branchChipStore, chosen && s.branchChipStoreActive]}>
                      {info.name}
                    </Text>
                    <Text style={[s.branchChipValue, chosen && s.branchChipValueActive]} numberOfLines={1}>
                      {chosen ? chosen.name : hasBranches ? 'Any branch ▾' : 'No branches'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={s.calcBtn}
              onPress={() => runOptimisation()}
              disabled={calculating}
            >
              {calculating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.calcBtnText}>Compare Cheapest Store</Text>
              )}
            </TouchableOpacity>

            {error !== '' && <Text style={s.errorText}>{error}</Text>}

            {result && (
              <View style={s.resultSection}>

                {result.cheapestStore ? (
                  <View style={s.recommendCard}>
                    <Text style={s.recommendLabel}>Cheapest store for this list</Text>
                    <Text style={s.recommendStore}>
                      {STORE_INFO[result.cheapestStore]?.name || result.cheapestStore}
                    </Text>
                    <Text style={s.recommendSavings}>
                      Save ${result.savings?.toFixed ? result.savings.toFixed(2) : result.savings}
                      {' '}vs {STORE_INFO[result.mostExpensiveStore]?.name || result.mostExpensiveStore}
                    </Text>
                  </View>
                ) : (
                  <Text style={s.empty}>{result.disclaimer || 'No pricing data available yet.'}</Text>
                )}

                {result.cheapestStore && (
                  <>
                    <Text style={s.sectionTitle}>💰 Store Totals</Text>
                    {STORES
                      .filter(store => result.totals[store] !== undefined)
                      .sort((a, b) => result.totals[a] - result.totals[b])
                      .map(store => {
                        const isCheapest = store === result.cheapestStore;
                        const available = result.itemsAvailable[store] || 0;
                        return (
                          <View
                            key={store}
                            style={[s.totalCard, isCheapest && s.totalCardCheapest]}
                          >
                            <View style={[s.storeDot, { backgroundColor: STORE_INFO[store].color }]} />
                            <View style={{ flex: 1 }}>
                              <Text style={s.totalStoreName}>{STORE_INFO[store].name}</Text>
                              <Text style={s.totalItemsAvail}>
                                {available} / {result.itemCount} items priced
                              </Text>
                            </View>
                            <Text style={[s.totalPrice, isCheapest && s.totalPriceCheapest]}>
                              ${result.totals[store].toFixed(2)}
                            </Text>
                          </View>
                        );
                      })}

                    {result.disclaimer && (
                      <Text style={s.disclaimer}>ℹ️ {result.disclaimer}</Text>
                    )}

                    <Text style={s.sectionTitle}>📋 Item Breakdown</Text>
                    {result.items.map((item, idx) => (
                      <View key={idx} style={s.itemRow}>
                        <Text style={s.itemName}>{item.itemName} ×{item.quantity}</Text>
                        <View style={s.itemPricesRow}>
                          {STORES.map(store => {
                            const p = item.prices[store];
                            return (
                              <Text key={store} style={s.itemPriceCell}>
                                {STORE_INFO[store].name.split(' ')[0]}: {p ? `$${p.lineTotal.toFixed(2)}` : 'Not available'}
                              </Text>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Branch picker modal */}
      <Modal
        visible={pickerStore !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerStore(null)}
      >
        <TouchableOpacity
          style={s.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerStore(null)}
        >
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>
              {pickerStore ? STORE_INFO[pickerStore].name : ''} — Choose Branch
            </Text>

            <TouchableOpacity
              style={s.modalOption}
              onPress={() => pickBranch(pickerStore, null)}
            >
              <Text style={s.modalOptionText}>Any branch (chain average)</Text>
            </TouchableOpacity>

            {(branches[pickerStore] || []).map(branch => (
              <TouchableOpacity
                key={branch._id}
                style={s.modalOption}
                onPress={() => pickBranch(pickerStore, branch)}
              >
                <Text style={s.modalOptionText}>{branch.name}</Text>
                {!!branch.suburb && <Text style={s.modalOptionSub}>{branch.suburb}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: GREEN, paddingTop: 48, paddingBottom: 16, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn:     { width: 60 },
  backText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },

  body: { flex: 1, padding: 16 },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#333', marginTop: 16, marginBottom: 6 },
  sectionSub:   { fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 17 },

  branchRow: { flexDirection: 'row', gap: 8 },
  branchChip: {
    flex: 1, borderWidth: 1.5, borderRadius: 12, padding: 10,
    backgroundColor: '#fff', alignItems: 'center',
  },
  branchChipStore:       { fontSize: 12, fontWeight: '700', color: '#333' },
  branchChipStoreActive: { color: '#fff' },
  branchChipValue:       { fontSize: 11, color: '#888', marginTop: 3 },
  branchChipValueActive: { color: '#fff' },

  calcBtn: {
    backgroundColor: GREEN, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 18,
  },
  calcBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  errorText: { color: '#c62828', fontSize: 13, marginTop: 10, textAlign: 'center' },

  resultSection: { marginTop: 10 },

  recommendCard: {
    backgroundColor: '#e8f5e9', borderRadius: 14, padding: 18,
    alignItems: 'center', borderWidth: 1.5, borderColor: GREEN, marginTop: 8,
  },
  recommendLabel:   { fontSize: 12, color: '#555' },
  recommendStore:   { fontSize: 22, fontWeight: '800', color: GREEN, marginTop: 4 },
  recommendSavings: { fontSize: 13, color: '#333', marginTop: 6, fontWeight: '600' },

  totalCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee',
  },
  totalCardCheapest: { borderColor: GREEN, borderWidth: 2, backgroundColor: '#f3faf4' },
  storeDot:           { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  totalStoreName:     { fontSize: 14, fontWeight: '600', color: '#222' },
  totalItemsAvail:    { fontSize: 11, color: '#999', marginTop: 2 },
  totalPrice:         { fontSize: 18, fontWeight: '700', color: '#333' },
  totalPriceCheapest: { color: GREEN },

  disclaimer: {
    fontSize: 11, color: '#e65100', backgroundColor: '#fff3e0',
    padding: 10, borderRadius: 8, marginTop: 4, marginBottom: 4, lineHeight: 16,
  },

  itemRow: {
    backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6,
    borderWidth: 1, borderColor: '#eee',
  },
  itemName: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  itemPricesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  itemPriceCell: { fontSize: 11, color: '#777' },

  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14, paddingHorizontal: 20 },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 14 },
  modalOption: {
    paddingVertical: 14, borderBottomWidth: 0.5, borderColor: '#eee',
  },
  modalOptionText: { fontSize: 15, color: '#333' },
  modalOptionSub:  { fontSize: 12, color: '#999', marginTop: 2 },
});
