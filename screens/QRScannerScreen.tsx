import AsyncStorage from '@react-native-async-storage/async-storage';
import { BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable,
  ScrollView, StyleSheet, Text, View
} from 'react-native';

const API_BASE_URL = 'http://10.0.0.22:3000/v1';

// Seeded zone codes — used for simulated-scan evidence collection
// (see backend services/seedZones.js)
const TEST_ZONE_CODES = [
  'ZONE-MILK-01',
  'ZONE-CHEESE-02',
  'ZONE-BUTTER-03',
  'ZONE-EGGS-04',
  'ZONE-BREAD-05',
];

interface QRScannerScreenProps {
  onBack: () => void;
}

interface ScanLogEntry {
  id: string;
  code: string;
  status: number | 'ERROR';
  success: boolean;
  elapsedMs: number;
  timestamp: string;
}

export default function QRScannerScreen({ onBack }: QRScannerScreenProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanLog, setScanLog] = useState<ScanLogEntry[]>([]);
  const lockRef = useRef(false); // prevents double-fires on rapid frames

  // Core lookup logic — shared by both camera-triggered and simulated-trigger scans.
  // Identical code path either way; only the trigger source differs.
  const performZoneLookup = async (code: string) => {
    setLoading(true);
    const startTime = Date.now();

    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_BASE_URL}/zones/${code}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token ?? ''}`,
        },
      });

      const elapsedMs = Date.now() - startTime;
      console.log(`[QR_SCAN] code=${code} status=${response.status} time=${elapsedMs}ms`);

      const logEntry: ScanLogEntry = {
        id: `${Date.now()}-${code}`,
        code,
        status: response.status,
        success: response.ok,
        elapsedMs,
        timestamp: new Date().toLocaleTimeString(),
      };
      setScanLog(prev => [logEntry, ...prev]);

      if (!response.ok) {
        Alert.alert('Zone not found', `No zone matched code: ${code}`, [
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
          { text: 'Done', onPress: resetScanner },
        ]
      );
    } catch (err) {
      const elapsedMs = Date.now() - startTime;
      console.log('[QR_SCAN] error', err);

      setScanLog(prev => [
        {
          id: `${Date.now()}-${code}`,
          code,
          status: 'ERROR',
          success: false,
          elapsedMs,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      Alert.alert('Error', 'Could not reach server. Check connection.', [
        { text: 'Scan Again', onPress: resetScanner },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setScanned(true);
    await performZoneLookup(result.data);
  };

  // Manual trigger for evidence collection — bypasses camera detection,
  // calls the exact same lookup + logging path as a real scan.
  const handleSimulatedScan = async (code: string) => {
    if (loading) return;
    await performZoneLookup(code);
  };

  const resetScanner = () => {
    lockRef.current = false;
    setScanned(false);
  };

  const clearLog = () => setScanLog([]);

  const successCount = scanLog.filter(e => e.success).length;
  const totalCount = scanLog.length;
  const accuracyPct = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : '—';
  const avgResponseMs = totalCount > 0
    ? Math.round(scanLog.reduce((sum, e) => sum + e.elapsedMs, 0) / totalCount)
    : 0;

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1a5c38" />
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
        <Pressable style={styles.backLink} onPress={onBack}>
          <Text style={styles.backLinkText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrap}>
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

        <Pressable style={styles.closeButton} onPress={onBack}>
          <Text style={styles.buttonText}>Close</Text>
        </Pressable>
      </View>

      {/* Evidence collection panel */}
      <View style={styles.evidencePanel}>
        <Text style={styles.panelTitle}>Test Evidence (Simulated Scan Mode)</Text>

        <View style={styles.testButtonRow}>
          {TEST_ZONE_CODES.map(code => (
            <Pressable
              key={code}
              style={styles.testButton}
              onPress={() => handleSimulatedScan(code)}
              disabled={loading}
            >
              <Text style={styles.testButtonText}>{code.replace('ZONE-', '')}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.statText}>Runs: {totalCount}</Text>
          <Text style={styles.statText}>Success: {successCount}</Text>
          <Text style={styles.statText}>Accuracy: {accuracyPct}%</Text>
          <Text style={styles.statText}>Avg: {avgResponseMs}ms</Text>
        </View>

        <ScrollView style={styles.logScroll}>
          {scanLog.map(entry => (
            <Text key={entry.id} style={[styles.logLine, !entry.success && styles.logLineFail]}>
              [{entry.timestamp}] {entry.code} → {entry.status} ({entry.elapsedMs}ms)
            </Text>
          ))}
        </ScrollView>

        {scanLog.length > 0 && (
          <Pressable style={styles.clearButton} onPress={clearLog}>
            <Text style={styles.clearButtonText}>Clear Log</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraWrap: { flex: 1.2 },
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
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: '#00FF88',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  hint: {
    color: '#fff',
    marginTop: 20,
    fontSize: 14,
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
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: '#00AA55',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  button: {
    backgroundColor: '#1a5c38',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  backLink: { marginTop: 16 },
  backLinkText: { color: '#1a5c38', fontSize: 15, fontWeight: '500' },

  evidencePanel: {
    flex: 1,
    backgroundColor: '#111',
    padding: 12,
    borderTopWidth: 2,
    borderTopColor: '#00AA55',
  },
  panelTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  testButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  testButton: {
    backgroundColor: '#1a5c38',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testButtonText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1c',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  statText: { color: '#00FF88', fontSize: 11, fontWeight: '600' },
  logScroll: { flex: 1 },
  logLine: { color: '#ccc', fontSize: 11, marginBottom: 2, fontFamily: 'monospace' },
  logLineFail: { color: '#ff6b6b' },
  clearButton: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  clearButtonText: { color: '#888', fontSize: 11 },
});