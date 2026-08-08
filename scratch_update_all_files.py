import sys, os

cities = [
    # Active
    ("Istanbul", "İstanbul", "Yedi Tepeli Şehir", "Marmara", [41.0082, 28.9784], "marmara", "active"),
    ("Kocaeli", "Kocaeli", "Sanayinin Merkezi", "Marmara", [40.7654, 29.9408], "marmara", "active"),
    ("Sakarya", "Sakarya", "Doğanın Kalbi", "Marmara", [40.7560, 30.3784], "marmara", "active"),
    ("Izmir", "İzmir", "Ege'nin İncisi", "Ege", [38.4237, 27.1428], "ege", "active"),
    ("Balikesir", "Balıkesir", "Zeytin Kokulu Kent", "Ege", [39.6484, 27.8904], "ege", "active"),
    ("Samsun", "Samsun", "Karadeniz'in Kapısı", "Karadeniz", [41.2867, 36.3300], "karadeniz", "active"),
    ("Antalya", "Antalya", "Akdeniz'in İncisi", "Akdeniz", [36.8969, 30.7133], "akdeniz", "active"),

    # Remaining 74 Provinces of Turkey
    ("Adana", "Adana", "Torosların Eteğinde", "Akdeniz", [37.0000, 35.3213], "akdeniz", "coming_soon"),
    ("Adiyaman", "Adıyaman", "Nemrut Dağı Diyarı", "Güneydoğu", [37.7644, 38.2786], "guneydogu", "coming_soon"),
    ("Afyon", "Afyonkarahisar", "Termal Başkent", "Ege", [38.7507, 30.5567], "ege", "coming_soon"),
    ("Agri", "Ağrı", "Ağrı Dağı Eteği", "Doğu Anadolu", [39.7191, 43.0503], "dogu", "coming_soon"),
    ("Amasya", "Amasya", "Şehzadeler Şehri", "Karadeniz", [40.6499, 35.8353], "karadeniz", "coming_soon"),
    ("Ankara", "Ankara", "Başkent", "İç Anadolu", [39.9334, 32.8597], "icanadolu", "coming_soon"),
    ("Artvin", "Artvin", "Yeşilin Her Tonu", "Karadeniz", [41.1828, 41.8183], "karadeniz", "coming_soon"),
    ("Aydin", "Aydın", "Efe Şehri", "Ege", [37.8560, 27.8416], "ege", "coming_soon"),
    ("Bilecik", "Bilecik", "Kuruluşun Şehri", "Marmara", [40.1506, 29.9792], "marmara", "coming_soon"),
    ("Bingol", "Bingöl", "Yüzen Adalar", "Doğu Anadolu", [38.8854, 40.4980], "dogu", "coming_soon"),
    ("Bitlis", "Bitlis", "Tarihi Yapılar Kenti", "Doğu Anadolu", [38.4006, 42.1095], "dogu", "coming_soon"),
    ("Bolu", "Bolu", "Abant & Yedi Göller", "Karadeniz", [40.7358, 31.6061], "karadeniz", "coming_soon"),
    ("Burdur", "Burdur", "Salda Gölü Diyarı", "Akdeniz", [37.7203, 30.2903], "akdeniz", "coming_soon"),
    ("Bursa", "Bursa", "Yeşil Bursa", "Marmara", [40.1885, 29.0610], "marmara", "coming_soon"),
    ("Canakkale", "Çanakkale", "Tarihin Yazıldığı Yer", "Marmara", [40.1553, 26.4142], "marmara", "coming_soon"),
    ("Cankiri", "Çankırı", "Tuz Mağarası Kenti", "İç Anadolu", [40.6013, 33.6134], "icanadolu", "coming_soon"),
    ("Corum", "Çorum", "Hattuşaş Şehri", "Karadeniz", [40.5506, 34.9556], "karadeniz", "coming_soon"),
    ("Denizli", "Denizli", "Pamukkale Diyarı", "Ege", [37.7765, 29.0864], "ege", "coming_soon"),
    ("Diyarbakir", "Diyarbakır", "Tarihi Surlar Kenti", "Güneydoğu", [37.9144, 40.2306], "guneydogu", "coming_soon"),
    ("Edirne", "Edirne", "Serhat Şehri", "Marmara", [41.6772, 26.5557], "marmara", "coming_soon"),
    ("Elazig", "Elazığ", "Harput Diyarı", "Doğu Anadolu", [38.6810, 39.2264], "dogu", "coming_soon"),
    ("Erzincan", "Erzincan", "Munzur Eteğinde", "Doğu Anadolu", [39.7500, 39.5000], "dogu", "coming_soon"),
    ("Erzurum", "Erzurum", "Palandöken Diyarı", "Doğu Anadolu", [39.9043, 41.2679], "dogu", "coming_soon"),
    ("Eskisehir", "Eskişehir", "Kültür & Gençlik Kenti", "İç Anadolu", [39.7667, 30.5256], "icanadolu", "coming_soon"),
    ("Gaziantep", "Gaziantep", "Güneydoğunun İncisi", "Güneydoğu", [37.0662, 37.3833], "guneydogu", "coming_soon"),
    ("Giresun", "Giresun", "Fındığın Başkenti", "Karadeniz", [40.9128, 38.3895], "karadeniz", "coming_soon"),
    ("Gumushane", "Gümüşhane", "Karaca Mağarası Kenti", "Karadeniz", [40.4600, 39.4814], "karadeniz", "coming_soon"),
    ("Hakkari", "Hakkari", "Sümbül Dağı Eteği", "Doğu Anadolu", [37.5833, 43.7333], "dogu", "coming_soon"),
    ("Hatay", "Hatay", "Medeniyetler Şehri", "Akdeniz", [36.2000, 36.1667], "akdeniz", "coming_soon"),
    ("Isparta", "Isparta", "Gül & Lavanta Diyarı", "Akdeniz", [37.7648, 30.5566], "akdeniz", "coming_soon"),
    ("Mersin", "Mersin", "Akdeniz Liman Kenti", "Akdeniz", [36.8121, 34.6415], "akdeniz", "coming_soon"),
    ("Kars", "Kars", "Ani Harabeleri Kenti", "Doğu Anadolu", [40.6013, 43.0975], "dogu", "coming_soon"),
    ("Kastamonu", "Kastamonu", "Ilgaz Dağı Eteği", "Karadeniz", [41.3887, 33.7827], "karadeniz", "coming_soon"),
    ("Kayseri", "Kayseri", "Erciyes'in Gölgesinde", "İç Anadolu", [38.7312, 35.4787], "icanadolu", "coming_soon"),
    ("Kirklareli", "Kırklareli", "Trakya'nın Yeşili", "Marmara", [41.7333, 27.2167], "marmara", "coming_soon"),
    ("Kirsehir", "Kırşehir", "Ahiler Şehri", "İç Anadolu", [39.1425, 34.1709], "icanadolu", "coming_soon"),
    ("Konya", "Konya", "Huzur & Mevlana Şehri", "İç Anadolu", [37.8746, 32.4932], "icanadolu", "coming_soon"),
    ("Kutahya", "Kütahya", "Çini Şehri", "Ege", [39.4167, 29.9833], "ege", "coming_soon"),
    ("Malatya", "Malatya", "Kayısının Başkenti", "Doğu Anadolu", [38.3552, 38.3095], "dogu", "coming_soon"),
    ("Manisa", "Manisa", "Spil Dağı Eteği", "Ege", [38.6191, 27.4289], "ege", "coming_soon"),
    ("Kahramanmaras", "Kahramanmaraş", "Akdeniz'in Kapısı", "Akdeniz", [37.5858, 36.9371], "akdeniz", "coming_soon"),
    ("Mardin", "Mardin", "Tarihi Taş Konaklar", "Güneydoğu", [37.3212, 40.7245], "guneydogu", "coming_soon"),
    ("Bodrum", "Bodrum / Muğla", "Tatil Beldeleri", "Ege", [37.0344, 27.4305], "ege", "coming_soon"),
    ("Mus", "Muş", "Muş Ovası Kenti", "Doğu Anadolu", [38.7438, 41.5064], "dogu", "coming_soon"),
    ("Nevsehir", "Nevşehir", "Kapadokya Diyarı", "İç Anadolu", [38.6244, 34.7144], "icanadolu", "coming_soon"),
    ("Nigde", "Niğde", "Aladağlar Eteği", "İç Anadolu", [37.9667, 34.6833], "icanadolu", "coming_soon"),
    ("Ordu", "Ordu", "Boztepe Şehri", "Karadeniz", [40.9833, 37.8781], "karadeniz", "coming_soon"),
    ("Rize", "Rize", "Çayın Başkenti", "Karadeniz", [41.0201, 40.5234], "karadeniz", "coming_soon"),
    ("Siirt", "Siirt", "Veysel Karani Diyarı", "Güneydoğu", [37.9333, 41.9500], "guneydogu", "coming_soon"),
    ("Sinop", "Sinop", "Türkiye'nin Kuzey Ucu", "Karadeniz", [42.0231, 35.1531], "karadeniz", "coming_soon"),
    ("Sivas", "Sivas", "Selçuklu Kenti", "İç Anadolu", [39.7477, 37.0179], "icanadolu", "coming_soon"),
    ("Tekirdag", "Tekirdağ", "Marmara Kıyısı", "Marmara", [40.9833, 27.5167], "marmara", "coming_soon"),
    ("Tokat", "Tokat", "Ballıca Mağarası Diyarı", "Karadeniz", [40.3167, 36.5500], "karadeniz", "coming_soon"),
    ("Trabzon", "Trabzon", "Karadeniz'in Fırtınası", "Karadeniz", [41.0027, 39.7168], "karadeniz", "coming_soon"),
    ("Tunceli", "Tunceli", "Munzur Vadisi Kenti", "Doğu Anadolu", [39.1079, 39.5401], "dogu", "coming_soon"),
    ("Sanliurfa", "Şanlıurfa", "Göbeklitepe Şehri", "Güneydoğu", [37.1591, 38.7969], "guneydogu", "coming_soon"),
    ("Usak", "Uşak", "Kanyonlar Şehri", "Ege", [38.6823, 29.4082], "ege", "coming_soon"),
    ("Van", "Van", "Van Gölü Diyarı", "Doğu Anadolu", [38.5012, 43.3730], "dogu", "coming_soon"),
    ("Yozgat", "Yozgat", "Çamlık Milli Parkı", "İç Anadolu", [39.8181, 34.8147], "icanadolu", "coming_soon"),
    ("Zonguldak", "Zonguldak", "Emeğin Başkenti", "Karadeniz", [41.4564, 31.7987], "karadeniz", "coming_soon"),
    ("Aksaray", "Aksaray", "Ihlara Vadisi Diyarı", "İç Anadolu", [38.3687, 34.0370], "icanadolu", "coming_soon"),
    ("Bayburt", "Bayburt", "Çoruh Nehrinin Kenti", "Karadeniz", [40.2552, 40.2249], "karadeniz", "coming_soon"),
    ("Karaman", "Karaman", "Türkçenin Başkenti", "İç Anadolu", [37.1759, 33.2287], "icanadolu", "coming_soon"),
    ("Kirikkale", "Kırıkkale", "Kızılırmak Kenti", "İç Anadolu", [39.8453, 33.5153], "icanadolu", "coming_soon"),
    ("Batman", "Batman", "Hasankeyf Diyarı", "Güneydoğu", [37.8812, 41.1351], "guneydogu", "coming_soon"),
    ("Sirnak", "Şırnak", "Cudi Dağı Eteği", "Güneydoğu", [37.5164, 42.4611], "guneydogu", "coming_soon"),
    ("Bartin", "Bartın", "Amasra & Karadeniz", "Karadeniz", [41.6358, 32.3375], "karadeniz", "coming_soon"),
    ("Ardahan", "Ardahan", "Çıldır Gölü Diyarı", "Doğu Anadolu", [41.1105, 42.7022], "dogu", "coming_soon"),
    ("Igdir", "Iğdır", "Doğunun Yükselen Yıldızı", "Doğu Anadolu", [39.9167, 44.0333], "dogu", "coming_soon"),
    ("Yalova", "Yalova", "Termal Şehir", "Marmara", [40.6500, 29.2667], "marmara", "coming_soon"),
    ("Karabuk", "Karabük", "Safranbolu Diyarı", "Karadeniz", [41.2061, 32.6204], "karadeniz", "coming_soon"),
    ("Kilis", "Kilis", "Zeytin Diyarı", "Güneydoğu", [36.7161, 37.1150], "guneydogu", "coming_soon"),
    ("Osmaniye", "Osmaniye", "Fıstığın Başkenti", "Akdeniz", [37.0742, 36.2478], "akdeniz", "coming_soon"),
    ("Duzce", "Düzce", "Samandere Şelalesi Kenti", "Karadeniz", [40.8438, 31.1565], "karadeniz", "coming_soon")
]

# 1. Update src/js/state.js
state_file = r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\src\js\state.js"

c_to_r = "export const CITY_TO_REGION = {\n"
c_names_tr = "export const CITY_NAMES_TR = {\n"
c_names_title = "export const CITY_NAMES_TR_TITLE = {\n"

for key, name, sub, m_label, coords, market, status in cities:
    c_to_r += f"  {key}: '{market}',\n"
    c_names_tr += f"  {key}: '{name.upper()}',\n"
    c_names_title += f"  {key}: '{name}',\n"

# Add Warsaw districts & suburbs to state.js mappings
warsaw_districts = ["Warszawa", "Srodmiescie", "Mokotow", "Wola", "Ursynow", "Bemowo", "Bialoleka", "Praga-Polnoc", "Praga-Poludnie", "Targowek", "Ochota", "Zoliborz", "Bielany", "Ursus", "Wlochy", "Wilanow", "Wawer", "Rembertow", "Wesola", "Zabki", "Marki", "Sulejowek", "Jozefow", "Pruszkow", "Piastow", "Piaseczno", "Konstancin-Jeziorna"]
for w in warsaw_districts:
    c_to_r += f"  '{w}': 'mazowsze',\n"
    c_names_tr += f"  '{w}': '{w.upper()}',\n"
    c_names_title += f"  '{w}': '{w}',\n"

c_to_r += "};\n"
c_names_tr += "};\n"
c_names_title += "};\n"

state_content = f"""// Global Application State (Single Source of Truth)
export const STATE = {{
  selectedCity: null,
  selectedRegion: null,
  lenisInstance: null,
  language: 'tr',
  
  calculator: {{
    applied: false,
    serviceType: 'standart',
    area: 100,
    frequency: '1',
    extras: [],
    price: 1500,
    promoCode: null,
    discountRate: 0
  }},
  
  cinema: {{
    activeIdx: -1,
    activeTextBlockIdx: -1,
    targetRadius: 120,
    currentRadius: 120,
    targetX: 50,
    currentX: 50,
    targetY: 50,
    currentY: 50,
    isScrubbing: false,
    sceneStates: Array.from({{ length: 12 }}, () => ({{
      currentTime: 0,
      targetTime: 0,
      currentOpacity: 0,
      targetOpacity: 0,
      currentVideoY: 50,
      targetVideoY: 50,
      currentVideoX: 50,
      targetVideoX: 50
    }})),
    introVideoState: {{
      currentTime: 0,
      targetTime: 0,
      currentScale: 1.0,
      targetScale: 1.0,
      currentTranslateY: 0,
      targetTranslateY: 0,
      currentOpacity: 1.0,
      targetOpacity: 1.0
    }},
    introTextState: {{
      currentOffset: 0,
      targetOffset: 0,
      currentOpacity: 1.0,
      targetOpacity: 1.0
    }}
  }},

  ambientParticles: []
}};

export const REGION_THEMES = {{
  akdeniz: {{ accent: '#06b6d4', rgb: '6, 182, 212' }},
  marmara: {{ accent: '#2563eb', rgb: '37, 99, 235' }},
  ege: {{ accent: '#d97706', rgb: '217, 119, 6' }},
  karadeniz: {{ accent: '#dc2626', rgb: '220, 38, 38' }},
  icanadolu: {{ accent: '#8b5cf6', rgb: '139, 92, 246' }},
  guneydogu: {{ accent: '#f59e0b', rgb: '245, 158, 11' }},
  dogu: {{ accent: '#6366f1', rgb: '99, 102, 241' }},
  mazowsze: {{ accent: '#dc2626', rgb: '220, 38, 38' }}
}};

{c_to_r}
{c_names_tr}
{c_names_title}
"""

with open(state_file, 'w', encoding='utf-8') as f:
    f.write(state_content)
print("Updated src/js/state.js successfully!")

# 2. Update src/main.js turkeyCities array
main_file = r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\src\main.js"
with open(main_file, 'r', encoding='utf-8') as f:
    main_code = f.read()

tc_entries = []
for key, name, sub, m_label, coords, market, status in cities:
    tc_entries.append(f"      {{ key: '{key}', coords: [{coords[0]}, {coords[1]}], market: '{market}', status: '{status}' }}")

tc_str = "    const turkeyCities = [\n" + ",\n".join(tc_entries) + "\n    ];"

import re
main_code_updated = re.sub(
    r"const turkeyCities = \[[\s\S]*?\n    \];",
    tc_str,
    main_code
)

with open(main_file, 'w', encoding='utf-8') as f:
    f.write(main_code_updated)
print("Updated src/main.js turkeyCities successfully!")

# 3. Update src/js/translations.js
trans_file = r"C:\Users\balik\OneDrive\Masaüstü\web temizlik sitesi\src\js\translations.js"
with open(trans_file, 'r', encoding='utf-8') as f:
    trans_code = f.read()

tr_cities_entries = []
for key, name, sub, m_label, coords, market, status in cities:
    lat = coords[0]
    lng = coords[1]
    status_str = f', status: "{status}"' if status == 'coming_soon' else ''
    tr_cities_entries.append(f'      {key}: {{ name: "{name}", sub: "{sub}", market: "{m_label}", coords: "{lat:.2f}° N, {lng:.2f}° E"{status_str} }}')

tr_cities_str = "cities: {\n" + ",\n".join(tr_cities_entries) + ",\n      Warszawa:"

trans_code_updated = re.sub(
    r"cities: \{\s*Istanbul:[\s\S]*?Warszawa:",
    tr_cities_str,
    trans_code
)

with open(trans_file, 'w', encoding='utf-8') as f:
    f.write(trans_code_updated)
print("Updated src/js/translations.js successfully!")
