import React, { useState, useMemo } from 'react';
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
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CITIES, SERVICES, EXTRAS } from './src/constants/cities';
import { submitLeadToVDS } from './src/services/api';

const { width } = Dimensions.get('window');

export default function App() {
  // State
  const [selectedCity, setSelectedCity] = useState(CITIES[0]); // İstanbul default
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [area, setArea] = useState(100);
  const [frequency, setFrequency] = useState('1'); // 1 = Tek seferlik, 2 = Haftalık (-15%), 3 = 2 Haftada bir (-10%)
  const [selectedExtras, setSelectedExtras] = useState([]);
  
  // Referral / Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [searchCityQuery, setSearchCityQuery] = useState('');
  const [referralModalVisible, setReferralModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); // home, cities, affiliate, leads

  // Price Calculation
  const totalPrice = useMemo(() => {
    let base = selectedService.basePrice;
    let areaMultiplier = area / 100;
    let subtotal = base * areaMultiplier;

    // Extras
    let extrasTotal = selectedExtras.reduce((sum, extraId) => {
      const ext = EXTRAS.find(e => e.id === extraId);
      return sum + (ext ? ext.price : 0);
    }, 0);

    let total = subtotal + extrasTotal;

    // Frequency Discount
    if (frequency === '2') total *= 0.85; // Haftalık %15 indirim
    if (frequency === '3') total *= 0.90; // 2 Haftada bir %10 indirim

    // Promo / Referral Discount
    if (appliedPromo) {
      total *= 0.85; // %15 indirim
    }

    return Math.round(total);
  }, [selectedService, area, selectedExtras, frequency, appliedPromo]);

  // Filtered Cities for Modal
  const filteredCities = useMemo(() => {
    if (!searchCityQuery.trim()) return CITIES;
    return CITIES.filter(c => 
      c.name.toLowerCase().includes(searchCityQuery.toLowerCase()) ||
      c.region.toLowerCase().includes(searchCityQuery.toLowerCase())
    );
  }, [searchCityQuery]);

  // Toggle Extras
  const toggleExtra = (id) => {
    if (selectedExtras.includes(id)) {
      setSelectedExtras(selectedExtras.filter(e => e !== id));
    } else {
      setSelectedExtras([...selectedExtras, id]);
    }
  };

  // Apply Referral Code
  const handleApplyPromo = () => {
    if (!promoCode.trim()) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir emlakçı / referans kodu girin.');
      return;
    }
    const code = promoCode.trim().toUpperCase();
    setAppliedPromo(code);
    setReferralModalVisible(false);
    Alert.alert('Tebrikler! 🎉', `'${code}' referans kodu başarıyla uygulandı! %15 İndirim kazandınız.`);
  };

  // Submit Reservation
  const handleSubmitReservation = async () => {
    if (!name.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen adınızı ve soyadınızı girin.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen telefon numaranızı girin.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen temizlik yapılacak adresi girin.');
      return;
    }

    if (selectedCity.status === 'coming_soon') {
      Alert.alert(
        `✨ ${selectedCity.name} — YAKINDA GELECEK`,
        `Bu şehrimizde hizmetlerimiz çok yakında aktif olacaktır! Ön talep ve bilgi almak için müşteri temsilcimizle WhatsApp üzerinden iletişime geçebilirsiniz.`,
        [
          { text: 'Kapat', style: 'cancel' },
          { text: '💬 WhatsApp Ön Kayıt', onPress: () => {
            const msg = encodeURIComponent(`Merhaba, ${selectedCity.name} şehri için temizlik hizmeti ön talebinde bulunmak istiyorum.`);
            Linking.openURL(`https://wa.me/905466479004?text=${msg}`);
          }}
        ]
      );
      return;
    }

    setSubmitting(true);

    const leadData = {
      city: selectedCity.name,
      district: address.split('/')[0] || selectedCity.name,
      serviceType: selectedService.title,
      area,
      price: totalPrice,
      name,
      phone,
      email,
      address,
      date,
      promoCode: appliedPromo,
      discountAmount: appliedPromo ? Math.round(totalPrice * 0.15) : 0
    };

    const res = await submitLeadToVDS(leadData);
    setSubmitting(false);

    if (res.success) {
      setSuccessModal({
        id: res.data?.data?.id || res.data?.id || 'MOB-' + Math.floor(Math.random()*90000 + 10000),
        city: selectedCity.name,
        service: selectedService.title,
        price: totalPrice
      });
    } else {
      Alert.alert('Hata', 'Rezervasyon gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP NAVBAR */}
      <View style={styles.navBar}>
        <View style={styles.navBrand}>
          <Text style={styles.navLogo}>ACLEAN</Text>
          <Text style={styles.navSub}>PREMIUM CLEANING</Text>
        </View>

        <TouchableOpacity 
          style={styles.citySelectorBtn} 
          onPress={() => setCityModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.citySelectorPin}>📍</Text>
          <Text style={styles.citySelectorText}>{selectedCity.name.toUpperCase()}</Text>
          <Text style={styles.citySelectorArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* BODY CONTENT BASED ON ACTIVE TAB */}
      {activeTab === 'home' && (
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          
          {/* HERO BANNER */}
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.heroBanner}
          >
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>✨ RESMİ MOBİL UYGULAMA</Text>
            </View>
            <Text style={styles.heroTitle}>Profesyonel Temizlik Kapınızda</Text>
            <Text style={styles.heroDesc}>
              {selectedCity.name} için 30 saniyede kolay rezervasyon oluşturun.
            </Text>

            {/* REFERRAL CODE PROMO PILL */}
            <TouchableOpacity 
              style={styles.promoBtn}
              onPress={() => setReferralModalVisible(true)}
            >
              <Text style={styles.promoIcon}>🎟️</Text>
              <Text style={styles.promoText}>
                {appliedPromo ? `KOD AKTİF: ${appliedPromo} (%15 İndirim)` : 'Emlakçı / Referans Kodu Gir (%15 İndirim)'}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* SERVICE SELECTION */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Hizmet Türünü Seçin</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceScroll}>
            {SERVICES.map((item) => {
              const isSelected = selectedService.id === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.serviceCard, isSelected && styles.serviceCardActive]}
                  onPress={() => setSelectedService(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.serviceIconContainer}>
                    <Text style={styles.serviceIconText}>
                      {item.id === 'standart' ? '🏠' : item.id === 'derin' ? '🧹' : item.id === 'insaat' ? '🏗️' : item.id === 'ofis' ? '🏢' : '🏡'}
                    </Text>
                  </View>
                  <Text style={[styles.serviceTitle, isSelected && styles.serviceTitleActive]}>{item.title}</Text>
                  <Text style={styles.serviceDesc}>{item.desc}</Text>
                  <Text style={styles.servicePrice}>{item.basePrice} ₺'den başlayan</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* CALCULATOR & AREA */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>2. Metrekare (m²) Seçimi</Text>
          </View>
          <View style={styles.cardContainer}>
            <View style={styles.areaRow}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setArea(Math.max(40, area - 10))}>
                <Text style={styles.stepBtnText}>-</Text>
              </TouchableOpacity>
              <View style={styles.areaDisplay}>
                <Text style={styles.areaValue}>{area}</Text>
                <Text style={styles.areaUnit}>m² Konut Alanı</Text>
              </View>
              <TouchableOpacity style={styles.stepBtn} onPress={() => setArea(Math.min(500, area + 10))}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Quick m² Selector Chips */}
            <View style={styles.chipsRow}>
              {[60, 90, 120, 150, 200].map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chip, area === val && styles.chipActive]}
                  onPress={() => setArea(val)}
                >
                  <Text style={[styles.chipText, area === val && styles.chipTextActive]}>{val} m²</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* EXTRAS SELECTION */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>3. Ekstra Hizmetler (İsteğe Bağlı)</Text>
          </View>
          <View style={styles.cardContainer}>
            {EXTRAS.map((extra) => {
              const isChecked = selectedExtras.includes(extra.id);
              return (
                <TouchableOpacity
                  key={extra.id}
                  style={[styles.extraRow, isChecked && styles.extraRowChecked]}
                  onPress={() => toggleExtra(extra.id)}
                >
                  <View style={styles.checkbox}>
                    <Text style={styles.checkboxText}>{isChecked ? '✓' : ''}</Text>
                  </View>
                  <Text style={styles.extraTitle}>{extra.title}</Text>
                  <Text style={styles.extraPrice}>+{extra.price} ₺</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* RESERVATION FORM */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>4. İletişim & Adres Bilgileri</Text>
          </View>
          <View style={styles.cardContainer}>
            <Text style={styles.inputLabel}>Ad Soyad *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Ahmet Yılmaz"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Telefon Numarası *</Text>
            <TextInput
              style={styles.input}
              placeholder="05XX XXX XX XX"
              placeholderTextColor="#64748b"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.inputLabel}>E-posta Adresi</Text>
            <TextInput
              style={styles.input}
              placeholder="ahmet@example.com"
              placeholderTextColor="#64748b"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.inputLabel}>Açık Adres & İlçe *</Text>
            <TextInput
              style={[styles.input, { height: 75 }]}
              placeholder="İlçe, Mahalle, Sokak, Bina No..."
              placeholderTextColor="#64748b"
              multiline
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.inputLabel}>Tercih Edilen Tarih</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-AA-GG"
              placeholderTextColor="#64748b"
              value={date}
              onChangeText={setDate}
            />
          </View>

          {/* PRICE SUMMARY & SUBMIT BUTTON */}
          <LinearGradient colors={['#2563eb', '#1d4ed8']} style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Toplam Tahmini Tutar:</Text>
              <Text style={styles.summaryPrice}>{totalPrice} ₺</Text>
            </View>

            {appliedPromo && (
              <Text style={styles.summaryDiscountText}>
                ✓ Referans Kodu (%15 İndirim Uygulandı)
              </Text>
            )}

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmitReservation}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitBtnText}>REZERVASYON TALEBİ GÖNDER 🚀</Text>
              )}
            </TouchableOpacity>
          </LinearGradient>

        </ScrollView>
      )}

      {/* CITIES LIST TAB */}
      {activeTab === 'cities' && (
        <View style={styles.tabContainer}>
          <Text style={styles.tabHeaderTitle}>🇹🇷 Türkiye'nin 81 İli</Text>
          <Text style={styles.tabHeaderSub}>Hizmet verdiğimiz ve çok yakında geleceğimiz tüm iller</Text>
          
          <ScrollView style={{ flex: 1 }}>
            {CITIES.map(c => (
              <TouchableOpacity 
                key={c.id} 
                style={styles.cityListItem}
                onPress={() => {
                  setSelectedCity(c);
                  setActiveTab('home');
                }}
              >
                <View>
                  <Text style={styles.cityListItemName}>{c.name}</Text>
                  <Text style={styles.cityListItemSub}>{c.desc} • {c.region}</Text>
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

      {/* AFFILIATE / REFERRAL TAB */}
      {activeTab === 'affiliate' && (
        <ScrollView style={styles.tabContainer}>
          <Text style={styles.tabHeaderTitle}>🤝 Emlakçı & Partner Modülü</Text>
          <Text style={styles.tabHeaderSub}>Müşterilerinizi yönlendirin, komisyon kazanın!</Text>
          
          <View style={styles.cardContainer}>
            <Text style={styles.affiliateIntro}>
              Anlaşmalı emlakçılarımız ve iş ortaklarımız kendilerine özel referans koduyla müşterilerine %15 indirim sunabilir ve sistem üzerinden canlı müşteri paslayabilirler.
            </Text>

            <TouchableOpacity 
              style={styles.actionBtnGreen}
              onPress={() => Linking.openURL('https://wa.me/905466479004?text=Merhaba,%20Emlakçı%20partner%20kodu%20başvurusu%20yapmak%20istiyorum.')}
            >
              <Text style={styles.actionBtnText}>💬 Emlakçı Kodu Başvurusu (WhatsApp)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* BOTTOM TAB BAR */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('home')}>
          <Text style={[styles.tabIcon, activeTab === 'home' && styles.tabIconActive]}>🏠</Text>
          <Text style={[styles.tabLabel, activeTab === 'home' && styles.tabLabelActive]}>Rezervasyon</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('cities')}>
          <Text style={[styles.tabIcon, activeTab === 'cities' && styles.tabIconActive]}>🗺️</Text>
          <Text style={[styles.tabLabel, activeTab === 'cities' && styles.tabLabelActive]}>81 Şehir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem} onPress={() => setActiveTab('affiliate')}>
          <Text style={[styles.tabIcon, activeTab === 'affiliate' && styles.tabIconActive]}>🤝</Text>
          <Text style={[styles.tabLabel, activeTab === 'affiliate' && styles.tabLabelActive]}>Emlakçı</Text>
        </TouchableOpacity>
      </View>

      {/* CITY SELECTION MODAL */}
      <Modal visible={cityModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Hizmet Şehrini Seçin</Text>
              <TouchableOpacity onPress={() => setCityModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Şehir adı yazın... (Örn: İzmir)"
              placeholderTextColor="#64748b"
              value={searchCityQuery}
              onChangeText={setSearchCityQuery}
            />

            <ScrollView style={{ maxHeight: 400 }}>
              {filteredCities.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.cityModalRow}
                  onPress={() => {
                    setSelectedCity(item);
                    setCityModalVisible(false);
                  }}
                >
                  <Text style={styles.cityModalName}>{item.name}</Text>
                  {item.status === 'active' ? (
                    <Text style={styles.cityStatusActive}>✓ AKTİF</Text>
                  ) : (
                    <Text style={styles.cityStatusSoon}>⏳ YAKINDA</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REFERRAL / PROMO MODAL */}
      <Modal visible={referralModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎟️ Referans / Emlakçı Kodu</Text>
            <Text style={{ color: '#94a3b8', marginVertical: 8 }}>
              Emlakçınızdan veya partnerinizden aldığınız indirim kodunu aşağıya yazın:
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: EMLAK2026"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              value={promoCode}
              onChangeText={setPromoCode}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleApplyPromo}>
              <Text style={styles.submitBtnText}>KODU UYGULA (%15 İNDİRİM)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setReferralModalVisible(false)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#94a3b8', textAlign: 'center' }}>Vazgeç</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS CONFIRMATION MODAL */}
      {successModal && (
        <Modal visible animationType="bounce" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: '#0f172a', borderColor: '#22c55e', borderWidth: 1.5 }]}>
              <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>🎉</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' }}>
                Rezervasyonunuz Alındı!
              </Text>
              <Text style={{ color: '#cbd5e1', textAlign: 'center', marginVertical: 10, lineHeight: 20 }}>
                Talebiniz başarıyla alınarak Temizlik Panelimize düşmüştür. Ekibimiz sizinle en kısa sürede iletişime geçecektir.
              </Text>

              <View style={{ backgroundColor: '#1e293b', padding: 12, borderRadius: 10, marginVertical: 10 }}>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Takip Numarası:</Text>
                <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: 'bold' }}>{successModal.id}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>Şehir / Hizmet:</Text>
                <Text style={{ color: '#ffffff', fontSize: 14 }}>{successModal.city} - {successModal.service}</Text>
                <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>{successModal.price} ₺</Text>
              </View>

              <TouchableOpacity 
                style={styles.actionBtnGreen} 
                onPress={() => {
                  const msg = encodeURIComponent(`Merhaba, ${successModal.id} takip numaralı temizlik rezervasyonum hakkında bilgi almak istiyorum.`);
                  Linking.openURL(`https://wa.me/905466479004?text=${msg}`);
                }}
              >
                <Text style={styles.actionBtnText}>💬 WhatsApp Destek & Bilgi</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSuccessModal(null)} style={{ marginTop: 12 }}>
                <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>Tamam / Kapat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090d16'
  },
  navBar: {
    height: 60,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)'
  },
  navBrand: {
    justifyContent: 'center'
  },
  navLogo: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1
  },
  navSub: {
    color: '#38bdf8',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1
  },
  citySelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)'
  },
  citySelectorPin: {
    fontSize: 12,
    marginRight: 4
  },
  citySelectorText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  citySelectorArrow: {
    color: '#94a3b8',
    fontSize: 10,
    marginLeft: 6
  },
  container: {
    flex: 1
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  heroBanner: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    marginBottom: 10
  },
  heroBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: 'bold'
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6
  },
  heroDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14
  },
  promoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217, 119, 6, 0.2)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d97706'
  },
  promoIcon: {
    fontSize: 16,
    marginRight: 8
  },
  promoText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold'
  },
  sectionHeader: {
    marginBottom: 10
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  serviceScroll: {
    marginBottom: 20
  },
  serviceCard: {
    width: 170,
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  serviceCardActive: {
    borderColor: '#38bdf8',
    backgroundColor: '#0f172a',
    borderWidth: 2
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  serviceIconText: {
    fontSize: 20
  },
  serviceTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4
  },
  serviceTitleActive: {
    color: '#38bdf8'
  },
  serviceDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 10,
    height: 30
  },
  servicePrice: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold'
  },
  cardContainer: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  areaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepBtnText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold'
  },
  areaDisplay: {
    alignItems: 'center'
  },
  areaValue: {
    color: '#38bdf8',
    fontSize: 28,
    fontWeight: 'bold'
  },
  areaUnit: {
    color: '#94a3b8',
    fontSize: 12
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#334155'
  },
  chipActive: {
    backgroundColor: '#38bdf8'
  },
  chipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600'
  },
  chipTextActive: {
    color: '#0f172a',
    fontWeight: 'bold'
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  extraRowChecked: {
    backgroundColor: 'rgba(56, 189, 248, 0.05)'
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  checkboxText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: 'bold'
  },
  extraTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13
  },
  extraPrice: {
    color: '#fbbf24',
    fontSize: 13,
    fontWeight: 'bold'
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 8
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14
  },
  summaryBox: {
    padding: 20,
    borderRadius: 20,
    marginBottom: 20
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  summaryLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600'
  },
  summaryPrice: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '900'
  },
  summaryDiscountText: {
    color: '#86efac',
    fontSize: 12,
    marginBottom: 12,
    fontWeight: 'bold'
  },
  submitBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6
  },
  submitBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  tabContainer: {
    flex: 1,
    padding: 16
  },
  tabHeaderTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4
  },
  tabHeaderSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 16
  },
  cityListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8
  },
  cityListItemName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  },
  cityListItemSub: {
    color: '#94a3b8',
    fontSize: 11
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
  affiliateIntro: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16
  },
  actionBtnGreen: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center'
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  tabBar: {
    height: 60,
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)'
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.5
  },
  tabIconActive: {
    opacity: 1
  },
  tabLabel: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2
  },
  tabLabelActive: {
    color: '#38bdf8',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalClose: {
    color: '#94a3b8',
    fontSize: 20
  },
  modalSearchInput: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12
  },
  cityModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  cityModalName: {
    color: '#ffffff',
    fontSize: 14
  },
  cityStatusActive: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: 'bold'
  },
  cityStatusSoon: {
    color: '#f59e0b',
    fontSize: 12
  }
});
