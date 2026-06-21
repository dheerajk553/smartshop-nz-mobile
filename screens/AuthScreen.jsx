import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useState } from 'react';
import {
    ActivityIndicator, Alert,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View
} from 'react-native';

const API = 'http://10.0.0.22:3000/v1';

export default function AuthScreen({ onLogin }) {
  const [isLogin, setIsLogin]   = useState(true);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return Alert.alert('Error', 'Email and password are required!');
    if (!isLogin && !name) return Alert.alert('Error', 'Name is required!');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const body = isLogin ? { email, password } : { name, email, password };
      const { data } = await axios.post(`${API}${endpoint}`, body);
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('userId', data.user.id);
      onLogin(data.token, data.user.name);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Something went wrong!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <Text style={s.logo}>🛒</Text>
      <Text style={s.title}>SmartShop NZ</Text>
      <Text style={s.subtitle}>{isLogin ? 'Login to your account' : 'Create an account'}</Text>

      {!isLogin && (
        <TextInput
          style={s.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />
      )}

      <TextInput
        style={s.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={s.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.btnText}>{isLogin ? 'Login' : 'Register'}</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={s.toggle}>
        <Text style={s.toggleText}>
          {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:28, backgroundColor:'#fff' },
  logo:      { fontSize:48, textAlign:'center', marginBottom:8 },
  title:     { fontSize:26, fontWeight:'700', textAlign:'center', color:'#1a5c38', marginBottom:4 },
  subtitle:  { fontSize:15, textAlign:'center', color:'#888', marginBottom:28 },
  input:     { borderWidth:1, borderColor:'#ddd', borderRadius:10, padding:13,
               fontSize:15, marginBottom:14, backgroundColor:'#fafafa' },
  btn:       { backgroundColor:'#1a5c38', borderRadius:10, padding:15,
               alignItems:'center', marginTop:4 },
  btnText:   { color:'#fff', fontWeight:'700', fontSize:16 },
  toggle:    { marginTop:20, alignItems:'center' },
  toggleText:{ color:'#1a5c38', fontSize:14 },
});