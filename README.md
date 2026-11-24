# izkarwell. v1.0.0
Çalışan Sağlığı ve İyi Yaşam Platformu — pilot sürüm.

## Kurulum
1. GitHub'da `izkarwell` adlı bir Public repository oluşturun (README ile başlatılabilir).
2. ZIP içindeki dosyaları deponun kök dizinine yükleyin. ZIP dosyasını doğrudan yüklemeyin.
3. Settings → Pages → Build and deployment → Source: Deploy from a branch → main / (root) → Save.
4. Pages ekranında gösterilen HTTPS adresini açın.
5. iPhone: Safari → Paylaş → Ana Ekrana Ekle. PC: tarayıcı üzerinden kullanın.

## Mimari
- `index.html`: ortak görünüm, gezinme ve modül kartları.
- `style.css`: ortak tema, mobil/masaüstü düzeni.
- `smoking.js`: Dumansız Yaşam (sigara/elektronik sigara, süre, tasarruf, sağlık bilgileri, kriz sayacı, hedefler).
- `water.js`: su kaydı, günlük hedef ve 7 günlük grafik.
- `manifest.json`, `sw.js`, `icon-*.png`: PWA yükleme ve önbellek altyapısı.

## Veri ve güncelleme
Kişisel kayıtlar tarayıcıda localStorage ile saklanır. Sunucuya gönderilmez, hesap veya otomatik cihaz eşitlemesi yoktur. Profil sekmesinden yedek alıp başka cihaza taşıyabilirsiniz. Eski Duman Yok yedekleri desteklenir. Alan adı, protokol veya tarayıcı değişirse eski kayıtlar kendiliğinden taşınmaz. Yedek dosyası kişisel bilgi içerir; GitHub'a yüklemeyin.

Yeni modülleri ayrı JS dosyalarında geliştirin. Eski kayıt anahtarlarını değiştirmeyin; veri şeması değişirse uyumlu geçiş ekleyin. Her yayında sw.js içindeki cache sürümünü artırın, yeni dosyaları ASSETS listesine ekleyin. Önce test edin; aynı depo ve URL üzerinden yayınlayın. Service worker yeni sürümü alana kadar uygulamayı yeniden açmak gerekebilir.

## Test durumu
JS sözdizimi ve izole Chromium arayüzü kontrol edildi: su ekleme/hedef, simüle depolama, vape profili, kriz sayacı ve iki ekran genişliği. Gerçek HTTPS, service worker çevrimdışı çalışma, gerçek iPhone ve kalıcı tarayıcı depolaması henüz doğrulanmadı. Kurumsal dağıtım öncesi marka onayı, gizlilik ve güvenlik değerlendirmesi yapılmalıdır. Sağlık bilgileri genel niteliktedir, kişisel ölçüm veya tıbbi öneri değildir.
