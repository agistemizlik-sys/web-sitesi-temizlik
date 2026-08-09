import React, { useState, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Linking,
  Dimensions,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CITIES, EXTRAS } from './src/constants/cities';
import { submitLeadToVDS } from './src/services/api';

const { width, height } = Dimensions.get('window');

// Uber / Bolt Tier Categories
const UBER_TIERS = [
  {
    id: 'standard',
    title: 'Aclean Standard',
    eta: '12-15 dk',
    price: 1500,
    icon: '🚗',
    desc: 'Salon, odalar, mutfak & banyo hijyeni',
    tag: 'EN POPÜLER',
    badgeColor: '#38bdf8'
  },
  {
    id: 'express',
    title: 'Aclean Express',
    eta: '6-8 dk',
    price: 1950,
    icon: '⚡',
    desc: 'Acil 3 saat içinde kapınızda hızlı ekip',
    tag: 'HIZLI VARIŞ',
    badgeColor: '#f59e0b'
  },
  {
    id: 'comfort',
    title: 'Aclean VIP Comfort',
    eta: '18-22 dk',
    price: 2800,
    icon: '🌟',
    desc: '2 Kişilik kıdemli uzman ekip & derin hijyen',
    tag: 'PREMIUM VIP',
    badgeColor: '#a855f7'
  },
  {
    id: 'office',
    title: 'Aclean Commercial',
    eta: '25-30 dk',
    price: 2500,
    icon: '🏢',
    desc: 'Ofis, plaza ve iş yeri temizliği',
    tag: 'KURUMSAL',
    badgeColor: '#10b981'
  }
];

export default function App() {
  // Navigation & Screen State: 'map' | 'dispatch' | 'tracking' | 'cities'
  const [screenState, setScreenState] = useState('map');
  
  // Uber Selections
  const [selectedCity, setSelectedCity] = useState(CITIES[0]); // İstanbul
  const [selectedTier, setSelectedTier] = useState(UBER_TIERS[0]);
  const [area, setArea] = useState(100);
  const [selectedExtras, setSelectedExtras] = useState([]);
  
  // Address & Customer Info
  const [address, setAddress] = useState('Caferağa Mah. Moda Cd. No:42, Kadıköy / İstanbul');
  const [customerName, setCustomerName] = useState('Ahmet Yılmaz');
  const [customerPhone, setCustomerPhone] = useState('0546 647 90 04');

  // Promo / Referral Code State
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [cityModalVisible, setCityModalVisible] = useState(false);

  // Live Dispatch Simulation
  const [assignedDriver, setAssignedDriver] = useState(null);
  const [trackingId, setTrackingId] = useState(null);

  // Price Calculation
  const totalPrice = useMemo(() => {
    let base = selectedTier.price;
    let areaMultiplier = area / 100;
    let subtotal = base * areaMultiplier;

    let extrasTotal = selectedExtras.reduce((sum, extraId) => {
      const ext = EXTRAS.find(e => e.id === extraId);
      return sum + (ext ? ext.price : 0);
    }, 0);

    let total = subtotal + extrasTotal;

    if (appliedPromo) {
      total *= 0.85; // %15 İndirim
    }

    return Math.round(total);
  }, [selectedTier, area, selectedExtras, appliedPromo]);

  // Handle Apply Promo / Referral Code
  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir emlakçı / referans kodu girin.');
      return;
    }
    const code = promoCode.trim().toUpperCase();
    setAppliedPromo(code);
    setReferralModalVisible(false);
    Alert.alert('Tebrikler! 🎉', `'${code}' emlakçı referans kodu uygulandı. %15 İndirim kazandınız!`);
  };

  // Uber Style Dispatch Call Button
  const handleCallAclean = async () => {
    if (selectedCity.status === 'coming_soon') {
      Alert.alert(
        `✨ ${selectedCity.name} — YAKINDA GELECEK`,
        `Bu ilimizde Uber tarzı canlı çağrı hizmetimiz çok yakında başlıyor! Ön talep ve avantajlı kayıt için müşteri temsilcimizle WhatsApp üzerinden görüşebilirsiniz.`,
        [
          { text: 'Kapat', style: 'cancel' },
          { text: '💬 WhatsApp Ön Kayıt', onPress: () => {
            const msg = encodeURIComponent(`Merhaba, Uber Bolt uygulaması üzerinden ${selectedCity.name} şehri için ön rezervasyon kaydı yaptırmak istiyorum.`);
            Linking.openURL(`https://wa.me/905466479004?text=${msg}`);
          }}
        ]
      );
      return;
    }

    // Switch to Live Radar Dispatching Screen
    setScreenState('dispatch');

    // Send Lead to Live VDS Server
    const leadData = {
      city: selectedCity.name,
      district: address.split(',')[0] || selectedCity.name,
      serviceType: selectedTier.title,
      area,
      price: totalPrice,
      name: customerName,
      phone: customerPhone,
      address,
      promoCode: appliedPromo,
      discountAmount: appliedPromo ? Math.round(totalPrice * 0.15) : 0
    };

    const res = await submitLeadToVDS(leadData);

    // Simulate Match in 2.5 seconds
    setTimeout(() => {
      const generatedId = res.data?.data?.id || res.data?.id || 'UBER-CLEAN-' + Math.floor(Math.random()*90000 + 10000);
      setTrackingId(generatedId);
      setAssignedDriver({
        name: 'Mehmet Usta & Zeynep Hanım',
        rating: '4.98 ⭐',
        trips: '340+ Temizlik',
        vehicle: 'Beyaz Fiat Doblo • 34 ACL 789',
        eta: selectedTier.eta,
        phone: '05466479004'
      });
      setScreenState('tracking');
    }, 2500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1d" />

      {/* UBER / BOLT MAIN SCREEN WITH LIVE MAP */}
      {screenState === 'map' && (
        <View style={styles.mainWrapper}>

          {/* SIMULATED FULL-SCREEN DARK MAP CANVAS */}
          <View style={styles.mapCanvas}>
            {/* Map Grid Lines */}
            <View style={styles.mapGridHorizontal1} />
            <View style={styles.mapGridHorizontal2} />
            <View style={styles.mapGridVertical1} />
            <View style={styles.mapGridVertical2} />

            {/* Radar Pulsing Circle Around User Location */}
            <View style={styles.userLocationPulseOuter} />
            <View style={styles.userLocationPulseInner} />
            <View style={styles.userLocationDot}>
              <Text style={{ fontSize: 10 }}>📍</Text>
            </View>

            {/* Nearby Cleaner Cars Moving Pins */}
            <View style={[styles.carMarker, { top: '32%', left: '28%' }]}>
              <Text style={styles.carIcon}>🚗</Text>
              <View style={styles.carEtaBadge}><Text style={styles.carEtaText}>4 dk</Text></View>
            </View>

            <View style={[styles.carMarker, { top: '24%', left: '62%' }]}>
              <Text style={styles.carIcon}>🚗</Text>
              <View style={styles.carEtaBadge}><Text style={styles.carEtaText}>8 dk</Text></View>
            </View>

            <View style={[styles.carMarker, { top: '48%', left: '74%' }]}>
              <Text style={styles.carIcon}>🚗</Text>
              <View style={styles.carEtaBadge}><Text style={styles.carEtaText}>12 dk</Text></View>
            </View>

            {/* Map Top Status Pill */}
            <View style={styles.mapStatusPill}>
              <View style={styles.greenLiveDot} />
              <Text style={styles.mapStatusText}>4 Temizlik Ekibi Çevrede Müsait</Text>
            </View>
          </View>

          {/* UBER FLOATING TOP NAVBAR */}
          <View style={styles.uberHeader}>
            <TouchableOpacity style={styles.uberMenuBtn} onPress={() => setScreenState('cities')}>
              <Text style={styles.uberMenuIcon}>≡</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uberCityPill} onPress={() => setCityModalVisible(true)}>
              <Text style={{ fontSize: 12 }}>📍</Text>
              <Text style={styles.uberCityName}>{selectedCity.name.toUpperCase()}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 10, marginLeft: 4 }}>▼</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.uberPromoPill, appliedPromo && styles.uberPromoPillActive]} 
              onPress={() => setReferralModalVisible(true)}
            >
              <Text style={styles.uberPromoText}>{appliedPromo ? '🎟️ %15 KOD' : '🎟️ KOD GİR'}</Text>
            </TouchableOpacity>
          </View>

          {/* UBER SLIDING BOTTOM SHEET */}
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />

            {/* Address Input Pill */}
            <View style={styles.addressBox}>
              <Text style={{ fontSize: 16, marginRight: 10 }}>📍</Text>
              <TextInput
                style={styles.addressInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Temizlik yapılacak adresi yazın..."
                placeholderTextColor="#64748b"
              />
            </View>

            {/* Area m² Selector Bar */}
            <View style={styles.areaSelectorBar}>
              <Text style={styles.areaSelectorLabel}>Konut Büyüklüğü:</Text>
              <View style={styles.areaChipGroup}>
                {[60, 90, 120, 150, 200].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.areaChip, area === val && styles.areaChipActive]}
                    onPress={() => setArea(val)}
                  >
                    <Text style={[styles.areaChipText, area === val && styles.areaChipTextActive]}>{val}m²</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* UBER SERVICE TIERS SCROLL */}
            <Text style={styles.tierHeaderTitle}>Hizmet Seçeneğini Belirleyin</Text>
            <ScrollView style={styles.tierScroll} nestedScrollEnabled>
              {UBER_TIERS.map((tier) => {
                const isSelected = selectedTier.id === tier.id;
                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.tierRow, isSelected && styles.tierRowSelected]}
                    onPress={() => setSelectedTier(tier)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.tierIcon}>{tier.icon}</Text>
                    <View style={styles.tierBody}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.tierTitle}>{tier.title}</Text>
                        <View style={[styles.tierBadge, { backgroundColor: tier.badgeColor }]}>
                          <Text style={styles.tierBadgeText}>{tier.tag}</Text>
                        </View>
                      </View>
                      <Text style={styles.tierDesc}>{tier.desc}</Text>
                      <Text style={styles.tierEta}>⏱️ En yakın varış: {tier.eta}</Text>
                    </View>
                    <View style={styles.tierPriceBox}>
                      <Text style={styles.tierPriceText}>{Math.round(tier.price * (area/100) * (appliedPromo ? 0.85 : 1))} ₺</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* UBER BIG CALL BUTTON */}
            <TouchableOpacity style={styles.uberCallBtn} onPress={handleCallAclean} activeOpacity={0.88}>
              <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.uberCallBtnGrad}>
                <Text style={styles.uberCallBtnText}>
                  🧹 {selectedTier.title.toUpperCase()} ÇAĞIR • {totalPrice} ₺
                </Text>
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </View>
      )}

      {/* LIVE DISPATCH RADAR SEARCHING SCREEN */}
      {screenState === 'dispatch' && (
        <View style={styles.dispatchWrapper}>
          <LinearGradient colors={['#0f172a', '#020617']} style={styles.dispatchGrad}>
            <View style={styles.radarCircle3} />
            <View style={styles.radarCircle2} />
            <View style={styles.radarCircle1} />
            
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginBottom: 20 }} />
            
            <Text style={styles.dispatchTitle}>En Yakın Temizlik Ekibi Aranıyor...</Text>
            <Text style={styles.dispatchSub}>
              {selectedCity.name} / {selectedTier.title} için mobil ekiplerimiz taranıyor.
            </Text>

            <View style={styles.dispatchInfoCard}>
              <Text style={{ color: '#94a3b8', fontSize: 12 }}>Seçilen Adres:</Text>
              <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginVertical: 2 }}>{address}</Text>
              <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>Tutar: {totalPrice} ₺</Text>
            </View>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setScreenState('map')}>
              <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Aramayı İptal Et</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}

      {/* LIVE TRACKING SCREEN (UBER RIDE MATCHED) */}
      {screenState === 'tracking' && assignedDriver && (
        <View style={styles.trackingWrapper}>
          {/* TOP LIVE STATUS BAR */}
          <LinearGradient colors={['#16a34a', '#15803d']} style={styles.trackingHeader}>
            <Text style={styles.trackingHeaderTitle}>✨ TEMİZLİK EKİBİNİZ ATANDI!</Text>
            <Text style={styles.trackingHeaderSub}>Ekip yola çıktı • Tahmini varış: {assignedDriver.eta}</Text>
          </LinearGradient>

          <ScrollView style={{ flex: 1, padding: 16 }}>
            {/* MATCHED CLEANER TEAM CARD */}
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={{ fontSize: 32 }}>🧹</Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{assignedDriver.name}</Text>
                <Text style={styles.driverRating}>{assignedDriver.rating} ({assignedDriver.trips})</Text>
                <Text style={styles.driverVehicle}>{assignedDriver.vehicle}</Text>
              </View>
            </View>

            {/* RESERVATION TRACKING DETAILS */}
            <View style={styles.trackingDetailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Takip Numarası:</Text>
                <Text style={styles.detailValueHex}>{trackingId}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Durum:</Text>
                <Text style={{ color: '#22c55e', fontWeight: 'bold' }}>● Panelde Onaylandı / Ekip Yolda</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Toplam Tutar:</Text>
                <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: 'bold' }}>{totalPrice} ₺</Text>
              </View>
            </View>

            {/* ACTION BUTTONS */}
            <TouchableOpacity 
              style={styles.actionBtnGreen} 
              onPress={() => {
                const msg = encodeURIComponent(`Merhaba, ${trackingId} kodlu temizlik rezervasyonum için ekiple iletişime geçmek istiyorum.`);
                Linking.openURL(`https://wa.me/905466479004?text=${msg}`);
              }}
            >
              <Text style={styles.actionBtnText}>💬 Ekip ile WhatsApp'tan İletişime Geç</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtnGreen, { backgroundColor: '#3b82f6', marginTop: 10 }]} 
              onPress={() => Linking.openURL(`tel:${assignedDriver.phone}`)}
            >
              <Text style={styles.actionBtnText}>📞 Ekip Liderini Doğrudan Ara</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 20, padding: 12, alignItems: 'center' }}
              onPress={() => setScreenState('map')}
            >
              <Text style={{ color: '#94a3b8' }}>Ana Haritaya Dön</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* CITIES SCREEN */}
      {screenState === 'cities' && (
        <View style={{ flex: 1, padding: 16, backgroundColor: '#090d16' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ color: '#ffffff', fontSize: 20, fontWeight: 'bold' }}>🇹🇷 Hizmet Verilen Şehirler</Text>
            <TouchableOpacity onPress={() => setScreenState('map')}>
              <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: 'bold' }}>Geri ✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }}>
            {CITIES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.cityRowItem}
                onPress={() => {
                  setSelectedCity(c);
                  setScreenState('map');
                }}
              >
                <View>
                  <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}>{c.name}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>{c.desc} • {c.region}</Text>
                </View>
                {c.status === 'active' ? (
                  <View style={styles.badgeActive}><Text style={styles.badgeActiveText}>AKTİF</Text></View>
                ) : (
                  <View style={styles.badgeSoon}><Text style={styles.badgeSoonText}>YAKINDA</Text></View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* REFERRAL PROMO MODAL */}
      <Modal visible={referralModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎟️ Referans & Emlakçı Kodu</Text>
            <Text style={{ color: '#94a3b8', marginVertical: 8 }}>
              Anlaşmalı emlakçınızdan aldığınız kod ile %15 anında indirim kazanın:
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Örn: EMLAK2026"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleApplyPromo}>
              <Text style={styles.modalSubmitBtnText}>KODU UYGULA (%15 İNDİRİM)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReferralModalVisible(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#94a3b8', textAlign: 'center' }}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CITY SWITCHER MODAL */}
      <Modal visible={cityModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={styles.modalTitle}>Hizmet İlinizi Seçin</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Text style={{ color: '#94a3b8', fontSize: 18 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              {CITIES.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.cityModalRow}
                  onPress={() => {
                    setSelectedCity(c);
                    setCityModalVisible(false);
                  }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 14 }}>{c.name}</Text>
                  {c.status === 'active' ? (
                    <Text style={{ color: '#22c55e', fontSize: 12, fontWeight: 'bold' }}>✓ AKTİF</Text>
                  ) : (
                    <Text style={{ color: '#f59e0b', fontSize: 12 }}>⏳ YAKINDA</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a0f1d'
  },
  mainWrapper: {
    flex: 1,
    position: 'relative'
  },
  mapCanvas: {
    flex: 1,
    backgroundColor: '#0b1329',
    position: 'relative'
  },
  mapGridHorizontal1: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  mapGridHorizontal2: {
    position: 'absolute',
    top: '60%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  mapGridVertical1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '35%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  mapGridVertical2: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '70%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)'
  },
  userLocationPulseOuter: {
    position: 'absolute',
    top: '42%',
    left: '48%',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    transform: [{ translateX: -50 }, { translateY: -50 }]
  },
  userLocationPulseInner: {
    position: 'absolute',
    top: '42%',
    left: '48%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    transform: [{ translateX: -25 }, { translateY: -25 }]
  },
  userLocationDot: {
    position: 'absolute',
    top: '42%',
    left: '48%',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -14 }, { translateY: -14 }]
  },
  carMarker: {
    position: 'absolute',
    alignItems: 'center'
  },
  carIcon: {
    fontSize: 22
  },
  carEtaBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  carEtaText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: 'bold'
  },
  mapStatusPill: {
    position: 'absolute',
    top: 65,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  greenLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    marginRight: 6
  },
  mapStatusText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold'
  },
  uberHeader: {
    position: 'absolute',
    top: 12,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100
  },
  uberMenuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  uberMenuIcon: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold'
  },
  uberCityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  uberCityName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4
  },
  uberPromoPill: {
    backgroundColor: 'rgba(217, 119, 6, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#d97706'
  },
  uberPromoPillActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    borderColor: '#22c55e'
  },
  uberPromoText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: 'bold'
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: height * 0.58,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 16,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)'
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 12
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  addressInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600'
  },
  areaSelectorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  areaSelectorLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: 'bold'
  },
  areaChipGroup: {
    flexDirection: 'row',
    gap: 6
  },
  areaChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#1e293b'
  },
  areaChipActive: {
    backgroundColor: '#38bdf8'
  },
  areaChipText: {
    color: '#94a3b8',
    fontSize: 11
  },
  areaChipTextActive: {
    color: '#0f172a',
    fontWeight: 'bold'
  },
  tierHeaderTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8
  },
  tierScroll: {
    maxHeight: 180,
    marginBottom: 10
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  tierRowSelected: {
    borderColor: '#38bdf8',
    backgroundColor: '#182438',
    borderWidth: 2
  },
  tierIcon: {
    fontSize: 24,
    marginRight: 10
  },
  tierBody: {
    flex: 1
  },
  tierTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  tierBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4
  },
  tierBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold'
  },
  tierDesc: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2
  },
  tierEta: {
    color: '#38bdf8',
    fontSize: 10,
    marginTop: 2
  },
  tierPriceBox: {
    marginLeft: 8
  },
  tierPriceText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '900'
  },
  uberCallBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 4
  },
  uberCallBtnGrad: {
    paddingVertical: 16,
    alignItems: 'center'
  },
  uberCallBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  dispatchWrapper: {
    flex: 1,
    backgroundColor: '#020617'
  },
  dispatchGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  radarCircle1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)'
  },
  radarCircle2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)'
  },
  radarCircle3: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)'
  },
  dispatchTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6
  },
  dispatchSub: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24
  },
  dispatchInfoCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  cancelBtn: {
    padding: 12
  },
  trackingWrapper: {
    flex: 1,
    backgroundColor: '#090d16'
  },
  trackingHeader: {
    padding: 20,
    alignItems: 'center'
  },
  trackingHeaderTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900'
  },
  trackingHeaderSub: {
    color: '#dcfce7',
    fontSize: 12,
    marginTop: 4
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  driverInfo: {
    flex: 1
  },
  driverName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  driverRating: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2
  },
  driverVehicle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2
  },
  trackingDetailCard: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  detailLabel: {
    color: '#94a3b8',
    fontSize: 12
  },
  detailValueHex: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold'
  },
  actionBtnGreen: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  cityRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8
  },
  badgeActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeActiveText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: 'bold'
  },
  badgeSoon: {
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6
  },
  badgeSoonText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 20
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 14
  },
  modalSubmitBtn: {
    backgroundColor: '#38bdf8',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center'
  },
  modalSubmitBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: 'bold'
  },
  cityModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  }
});
