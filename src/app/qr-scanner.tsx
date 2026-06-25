import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const API_BASE_URL = 'http://10.0.0.22:3000/v1'; // same base you use elsewhere

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const lockRef = useRef(false); // prevents double-fires on rapid frames

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanned(true);
    setLoading(true);

    const startTime = Date.now();

    try {
      const response = await fetch(`${API_BASE_URL}/zones/${result.data}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getToken()}`, // replace with your auth storage getter
        },
      });

      const elapsedMs = Date.now() - startTime;
      console.log(`[QR_SCAN] code=${result.data} status=${response.status} time=${elapsedMs}ms`);

      if (!response.ok) {
        Alert.alert('Zone not found', `No zone matched code: ${result.data}`, [
          { text: 'Scan Again', onPress: resetScanner },
        ]);
        return;
      }

      const zone = await response.json();

      Alert.alert(
        zone.name ?? 'Zone Found',
        `Code: ${zone.qrCode}\nLocation: ${zone.location ?? 'N/A'}\nResponse time: ${elapsedMs}ms`,
        [
          { text: 'Scan Again', onPress: resetScanner },
          { text: 'Done', onPress: () => router.back() },
        ]
      );
    } catch (err) {
      console.log('[QR_SCAN] error', err);
      Alert.alert('Error', 'Could not reach server. Check connection.', [
        { text: 'Scan Again', onPress: resetScanner },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetScanner = () => {
    lockRef.current = false;
    setScanned(false);
  };

  // Placeholder — wire this to wherever you store the JWT (AsyncStorage etc.)
  const getToken = async (): Promise<string> => {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    return (await AsyncStorage.default.getItem('token')) ?? '';
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>Camera access is needed to scan zone QR codes.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
      />

      <View style={styles.overlay}>
        <View style={styles.frame} />
        <Text style={styles.hint}>
          {loading ? 'Looking up zone...' : 'Point camera at a zone QR code'}
        </Text>
      </View>

      {loading && (
        <View style={styles.loadingBadge}>
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {scanned && !loading && (
        <Pressable style={styles.rescanButton} onPress={resetScanner}>
          <Text style={styles.buttonText}>Tap to Scan Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  permissionText: { textAlign: 'center', marginBottom: 16, fontSize: 16 },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: 250,
    height: 250,
    borderWidth: 3,
    borderColor: '#00FF88',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    marginTop: 20,
    fontSize: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  loadingBadge: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 20,
  },
  rescanButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#00AA55',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  button: {
    backgroundColor: '#00AA55',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});