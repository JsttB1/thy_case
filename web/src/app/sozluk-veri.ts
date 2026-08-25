/**
 * Kısaltmalar sözlüğü — jüri ya da ekip üyesi bir terime takılırsa tek tık.
 * Ekranlarda geçen HER kısaltma burada olmalı; yeni terim eklerken listeye de eklenir.
 */
export interface SozlukSatir {
  terim: string;
  acilim: string;
  aciklama: string;
}

export const SOZLUK: SozlukSatir[] = [
  {
    terim: 'PN',
    acilim: 'Part Number · parça numarası',
    aciklama: 'Takip edilen her bir komponent tipi. Veride 5.000 tane var.',
  },
  {
    terim: 'Durum rozetleri',
    acilim: 'TÜKENİYOR · SİPARİŞTE · DIŞA BAĞIMLI · HURDA ADAYI',
    aciklama:
      'Parçanın bugünkü hâli. TÜKENİYOR: stok yenisi gelmeden bitiyor, sipariş yok. SİPARİŞTE: stok bitiyor ama yenisi yolda. DIŞA BAĞIMLI: iç tamir yok. HURDA ADAYI: tamir ekonomik değil.',
  },
  {
    terim: 'Donörden söküm',
    acilim: 'Sahadaki adıyla kanibalizasyon',
    aciklama:
      'İhtiyaç duyulan parçanın, rafta bekleyen arızalı bir üniteden sökülüp kullanılması. Kayıt altında yapılır, donör borç defterine işlenir.',
  },
  {
    terim: 'AOG',
    acilim: 'Aircraft on Ground',
    aciklama: 'Parça yokluğundan uçağın yerde kalması. Her saati doğrudan gelir kaybı.',
  },
  {
    terim: 'TAT',
    acilim: 'Turn Around Time',
    aciklama: 'Bir parçanın tamire gidip dönmesinin ya da yeni satın almanın süresi.',
  },
  {
    terim: 'TTS',
    acilim: 'Time to Survive · dayanma süresi',
    aciklama: 'Eldeki kullanılabilir stok, günlük talebe bölününce kaç gün yeteceği.',
  },
  {
    terim: 'TTR',
    acilim: 'Time to Recover · toparlanma süresi',
    aciklama:
      'Bir parçayı yeniden servise sokmanın süresi. İç atölye varsa iç tamir, yoksa dış tamir süresidir.',
  },
  {
    terim: 'Stok yeterlilik seviyesi',
    acilim: 'Talebi karşılama olasılığı',
    aciklama:
      'Belirli bir stok seviyesiyle, tedarik süresi boyunca gelen talebin tamamının karşılanma olasılığı. Parça detayındaki eğrinin dikey ekseni budur; %100\'e yaklaştıkça parça tükenmez. Tersi "stok yetmeme riski"dir.',
  },
  {
    terim: 'Karar kanalı',
    acilim: 'Havuz · Tamir · Satın alma · İzle',
    aciklama:
      "Karar Merkezi'nde her parçanın düştüğü kova. Aksiyon merdivenindeki en hızlı gerçek tedarik yolu kanalı belirler; donörden söküm kanal sayılmaz, hurda adayında tamir elenir. Açığı olmayan parça İzle'ye düşer.",
  },
  {
    terim: 'Sipariş penceresi',
    acilim: 'TTS − tedarik süresi',
    aciklama:
      "Sipariş için kalan gün. Dayanma süresinden tedarik süresi çıkarılır; eksi değer siparişin bugünden önce açılmış olması gerektiğini söyler. Karar Merkezi'ndeki planlama ufku bu pencereye göre dörde bölünür.",
  },
  {
    terim: 'Önerilen aksiyon',
    acilim: 'Parça bazlı tek karar',
    aciklama:
      'Merdivendeki seçenekler arasından, tamir ekonomisi ve hurda adaylığı elendikten sonra kalan en hızlı gerçek tedarik kanalı. Kartta bu kanalın stok yetmeme riskini nereye indirdiği de yazar; kararlar oturum içinde kaydedilir.',
  },
  {
    terim: 'Kırmızı liste',
    acilim: 'Stoğu dayanmayan parçalar',
    aciklama:
      "Stoğun, yenisi gelene kadar bitmesi beklenen parçalar. Bugün 134 parça, 72'sinin siparişi bile yok.",
  },
  {
    terim: 'CLP',
    acilim: 'Katalog liste fiyatı',
    aciklama: 'Bir parçayı sıfırdan satın almanın bedeli.',
  },
  {
    terim: 'FMV',
    acilim: 'Adil piyasa değeri',
    aciklama: "Bir parçanın ikinci el piyasa değeri. Ortalaması liste fiyatının %43'ü.",
  },
  {
    terim: 'SVC',
    acilim: 'Kullanılabilir stok',
    aciklama: 'Faal ve ana depodaki adetlerin toplamı. Hemen takılabilir parçalar.',
  },
  {
    terim: 'Lead time',
    acilim: 'Tedarik süresi',
    aciklama:
      'Min-max hesabında kullanılan temin süresi. İç tamir mümkünse odur, değilse dış tamir ile satın almanın kısası.',
  },
  {
    terim: 'BER',
    acilim: 'Ekonomik tamir sınırı',
    aciklama:
      "Dış tamir maliyeti liste fiyatının %65'ini aşarsa tamir mantıklı değildir. Değişim ya da hurda daha ekonomiktir.",
  },
  {
    terim: 'Scrap',
    acilim: 'Hurda',
    aciklama:
      "Tamir edilemeyip hurdaya ayrılan parça. Yerine yenisi alınır. Yılda 67,8 M$'lık bir kalem.",
  },
  {
    terim: 'Float',
    acilim: 'Tamir döngüsündeki parça',
    aciklama: 'Herhangi bir anda tamirde dönen beklenen parça miktarı. Sahada %97 tuttu.',
  },
  {
    terim: 'Min-Max',
    acilim: 'Stok politikası',
    aciklama:
      'Stok MIN altına inince MAX seviyesine tamamlanacak şekilde sipariş verilir. İkisi de parça bazında hesaplanır.',
  },
  {
    terim: 'Emniyet stoğu',
    acilim: 'Güvenlik payı',
    aciklama:
      'Talep dalgalanmasına karşı MIN üzerine eklenen tampon. Servis hedefine göre hesaplanır.',
  },
  {
    terim: 'SBA',
    acilim: 'Kesikli talep tahmini',
    aciklama: 'Ara ara sıfır olan talepler için tasarlanmış klasik bir tahmin yöntemi.',
  },
  {
    terim: 'Croston',
    acilim: 'Croston yöntemi',
    aciklama: "SBA'nın atası, kesikli talep tahmininin standart yöntemi.",
  },
  {
    terim: 'CV',
    acilim: 'Varyasyon katsayısı',
    aciklama: 'Talebin çeyrekten çeyreğe ne kadar oynadığının ölçüsü.',
  },
  {
    terim: 'ABC×XYZ',
    acilim: 'Segmentasyon matrisi',
    aciklama:
      'Parçalar hacme ve düzenliliğe göre sınıflanır, her gruba uygun tahmin yöntemi atanır.',
  },
  {
    terim: 'MAPE',
    acilim: 'Tahmin doğruluğu ölçüsü',
    aciklama: 'Yüzde cinsinden hata. Faz geçiş kapılarında kullanılır.',
  },
  {
    terim: 'MLP',
    acilim: 'Yapay sinir ağı',
    aciklama: 'Kullanılan model mimarisi, katmanlı bir sinir ağı.',
  },
  {
    terim: 'Poisson',
    acilim: 'Poisson dağılımı',
    aciklama: 'Sayım verisi için doğru olasılık modeli. Emniyet stoğu ve simülasyonun temeli.',
  },
  {
    terim: 'Belirsizlik denemesi',
    acilim: 'Dağılım hesabı',
    aciklama:
      'Talep kesin bir sayı değil dağılım olduğu için, sonucu tek değer yerine aralık olarak veririz. Tarayıcıdaki hesap kapalı formüldür; build sırasında ayrıca rastgele denemelerle koşulup doğrulanır.',
  },
  {
    terim: 'Cold-start',
    acilim: 'Soğuk başlangıç',
    aciklama:
      'Geçmiş verisi olmayan yeni parçanın tahmini. Benzerlerinden başla, gözlem geldikçe düzelt.',
  },
  {
    terim: 'MTBUR',
    acilim: 'Sökümler arası ortalama süre',
    aciklama: 'Bir parçanın plansız sökümler arası ortalama çalışma süresi. Üretici verisidir.',
  },
  {
    terim: 'Phase-out',
    acilim: 'Filodan çıkış',
    aciklama:
      'Emekli edilen modellere bağlı parçaların stoktan eritilmesi. Takvimle değil sinyalle yönetilir.',
  },
  {
    terim: 'Last-time-buy',
    acilim: 'Son alım fırsatı',
    aciklama: 'Üreticinin bir parçanın üretimini durdurmadan önceki son sipariş kararı.',
  },
  {
    terim: 'Pool',
    acilim: 'Havuz',
    aciklama:
      "Birden çok havayolunun parça stoğunu paylaştığı ortaklık modeli. Filonun %58'i pool uçağı.",
  },
  {
    terim: 'Exchange',
    acilim: 'Değişim',
    aciklama:
      'Arızalı parçayı verip havuzdan çalışanını almak. Yılda yaklaşık 2.600 adet trafik var.',
  },
  {
    terim: 'CDC',
    acilim: 'Değişiklik yakalama',
    aciklama:
      'Kaynak sistemlerdeki değişiklikleri salt okunur biçimde almak. Hiçbir kaynağa yazılmaz.',
  },
  {
    terim: 'Dış tamire bağımlı',
    acilim: 'Kritik ve iç tamiri olmayan parçalar',
    aciklama:
      'Hem uçak yatıran hem iç tamiri olmayan 547 parça. Kabiliyet yatırımının hedef listesi.',
  },
  {
    terim: 'Üçlü tehlike',
    acilim: 'En riskli alt küme',
    aciklama:
      'Dış tamire bağımlı 547 parça içinden geçmişi olmayan yeni nesil 181 parça. Hem kritik, hem tamirsiz, hem geçmişsiz.',
  },
];
