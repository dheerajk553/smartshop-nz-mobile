import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, StyleSheet,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';

const API = 'http://10.0.0.22:3000/v1';

export default function ShoppingListScreen({ onBack, onLogout }) {
  const [activeList, setActive] = useState(null);
  const [newItem, setNewItem]   = useState('');
  const [token, setToken]       = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('token').then(t => {
      if (t) { setToken(t); fetchLists(t); }
      else setLoading(false);
    });
  }, []);

  const fetchLists = async (t) => {
    try {
      const { data } = await axios.get(`${API}/lists`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (data.length > 0) {
        setActive(data[0]);
      } else {
        // Auto-create list if none exists
        const { data: newList } = await axios.post(
          `${API}/lists`,
          { name: 'My Shopping List' },
          { headers: { Authorization: `Bearer ${t}` } }
        );
        setActive(newList);
      }
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!newItem.trim() || !activeList) return;
    const { data } = await axios.post(
      `${API}/lists/${activeList._id}/items`,
      { name: newItem, quantity: 1 },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setActive(data);
    setNewItem('');
  };

  const toggleItem = async (itemId) => {
    const { data } = await axios.patch(
      `${API}/lists/${activeList._id}/items/${itemId}/toggle`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setActive(data);
  };

  const deleteItem = async (itemId) => {
    const { data } = await axios.delete(
      `${API}/lists/${activeList._id}/items/${itemId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setActive(data);
  };

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#1a5c38" />
    </View>
  );

  return (
    <View style={s.container}>

      {/* Header with back button */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={s.title}>🛒 Shopping List</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Input row */}
      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Add item..."
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addItem}
        />
        <TouchableOpacity style={s.addBtn} onPress={addItem}>
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Items count */}
      {activeList?.items?.length > 0 && (
        <Text style={s.count}>
          {activeList.items.filter(i => i.checked).length} / {activeList.items.length} completed
        </Text>
      )}

      {activeList?.items?.length === 0 && (
        <Text style={s.empty}>No items yet — add something above! 👆</Text>
      )}

      <FlatList
        data={activeList?.items || []}
        keyExtractor={item => item._id}
        renderItem={({ item }) => (
          <View style={s.item}>
            <TouchableOpacity onPress={() => toggleItem(item._id)} style={{ flex: 1 }}>
              <Text style={[s.itemText, item.checked && s.checked]}>
                {item.checked ? '✅' : '⬜'} {item.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteItem(item._id)}>
              <Text style={s.del}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:'#fff' },
  center:     { flex:1, justifyContent:'center', alignItems:'center' },
  header:     { backgroundColor:'#1a5c38', padding:16, paddingTop:48,
                flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  backBtn:    { width:60 },
  backText:   { color:'#fff', fontSize:15, fontWeight:'600' },
  title:      { fontSize:18, fontWeight:'700', color:'#fff' },
  inputRow:   { flexDirection:'row', gap:8, margin:16 },
  input:      { flex:1, borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, fontSize:15 },
  addBtn:     { backgroundColor:'#1a5c38', borderRadius:8, paddingHorizontal:16, justifyContent:'center' },
  addBtnText: { color:'#fff', fontWeight:'600', fontSize:15 },
  count:      { fontSize:12, color:'#888', paddingHorizontal:16, marginBottom:8 },
  item:       { flexDirection:'row', alignItems:'center', padding:16,
                borderBottomWidth:0.5, borderColor:'#eee', marginHorizontal:4 },
  itemText:   { fontSize:15, color:'#333' },
  checked:    { textDecorationLine:'line-through', color:'#aaa' },
  del:        { color:'#e55', fontSize:18, paddingLeft:12 },
  empty:      { textAlign:'center', color:'#aaa', marginTop:60, fontSize:14 },
});