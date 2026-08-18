import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const LIVE_URL = 'https://relaxax.com';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(LIVE_URL);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const webViewRef = useRef(null);

  // Hardware Back Button on Android
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true; // prevent app exit
      }
      return false; // let default back behavior exit
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setHasError(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const customUserAgent =
    Platform.OS === 'ios'
      ? 'RELAXAX-NativeApp-iOS/1.0.0 (Apple; Mobile)'
      : 'RELAXAX-NativeApp-Android/1.0.0 (Google; Mobile)';

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" backgroundColor="#f7f6f2" translucent={false} />

        <View style={styles.container}>
          {hasError ? (
            <ScrollView
              contentContainerStyle={styles.errorContainer}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#e11d48']} />
              }
            >
              <Text style={styles.errorIcon}>📡</Text>
              <Text style={styles.errorTitle}>Bağlantı Kurulamadı</Text>
              <Text style={styles.errorDesc}>
                İnternet bağlantınızı kontrol edip tekrar deneyebilirsiniz.
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.85}>
                <Text style={styles.retryBtnText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <>
              <WebView
                ref={webViewRef}
                source={{ uri: currentUrl }}
                style={styles.webview}
                userAgent={customUserAgent}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                allowsBackForwardNavigationGestures={true}
                bounces={false}
                overScrollMode="never"
                renderLoading={() => (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#e11d48" />
                    <Text style={styles.loadingText}>RELAXAX Yükleniyor...</Text>
                  </View>
                )}
                onNavigationStateChange={(navState) => {
                  setCanGoBack(navState.canGoBack);
                  setCurrentUrl(navState.url);
                }}
                onLoadStart={() => setIsLoading(true)}
                onLoadEnd={() => {
                  setIsLoading(false);
                  setRefreshing(false);
                }}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f6f2',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f7f6f2',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#f7f6f2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryBtn: {
    backgroundColor: '#e11d48',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#e11d48',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
