# izkarwell. — Kararlar ve yol haritası (24.11.2026)

## Kapsam
Kurumsal çalışma platformu + isteğe bağlı kişisel İyi Yaşam. Aktif Yaşam, Uyku ve müşteri ziyaretleri kapsam dışı. Ford modülü yalnızca TEST pilotu; gerçek müşteri verisi kullanılmaz.

## Geri dönüş noktası
Kaynak kodu: `backup/pre-superapp-2026-11-24`, commit `5b7d2ebb14e1ff1c3c136bb3e5c0e4e24dd21230`. GitHub ZIP kopyası bu committen alınabilir.
Kullanıcı canlı Supabase ve Storage yedeğini pilot aşamasında ertelemeyi tercih etti. Bu nedenle kaynak kodu geri dönüşü canlı veritabanı geri yüklemesi değildir. Geri dönüş gerektiğinde eski kodu yeni bir commit/revert ile yayınla; mevcut kayıtları, yeni alanları ve fotoğrafları silme. Migration geriye uyumlu tutulmuştur. Uygulama önbelleği güncellenmeli.

## Onaylanan Foundation kapsamı
Mobil ve masaüstü tasarım, Ford teyit işlevleri, otomatik test altyapısı. Mevcut sağlık ve su modülleri ve bildirim davranışı korunur.

## Ertelenen konular (ayrı onay ile)
- Fatura/teslimat listesi aktarımı ve gerçek kurulum paydası. Ford Hesabım: tüzel müşterileri hariç tut; filo hem Ford Hesabım hem Ford uygulaması için hariç. Tüzel Ford uygulaması uygunluğu ayrıca netleştirilecek. Bu aşamada hesaplama değiştirilmedi.
- MFA, oturum ve yetki sertleştirme, dosya doğrulama ve kapsamlı canlı güvenlik testi; kurumsal yayından önce zorunlu değerlendirme.
- Kişisel sağlık verilerine iş yöneticilerinin erişmemesi; yalnızca yerel cihaz saklama veya ayrı altyapı seçeneği ayrıca değerlendirilecek.
- Bağımsız şifreli otomatik veritabanı/Storage yedekleme ve test geri yüklemesi. Free paket otomatik proje yedeği sağlamaz. Pro DB yedeği dosya içeriğini kapsamaz.
- Toplu bildirim ve duyuru merkezi; alıcı izni, hedef kitle, teslimat raporu.
- Dinamik formlar/checklistler ve kullanıcının yeni iş fikirleri.
- React/TypeScript/Vite mimari geçişi; mevcut işlevler finalize edildikten sonra ayrıca öğrenme ve değerlendirme.
- KVKK, yurt dışı aktarım, kurum onayı, saklama/imha, barındırma ve kurumsal hesap sahipliği.
- Mevcut paket bitince kapsamlı tekrar denetimi, yeni fikirler ve önceliklendirme.

## Yedek seçenekleri
Manuel SQL/Storage dışa aktarımı; CI veya ayrı güvenli sunucudan zamanlanmış şifreli bağımsız dosya/DB yedeği; Supabase Pro + bağımsız Storage yedeği. Gerçek kayıtlar ve sırlar public GitHub'a konmaz.

## Sınırlar
Mevcut fotoğrafın üzerine yazılmaz; fotoğraf değiştirme için ayrı sürümlü kanıt modeli gerekir. ZIP 200 fotoğraf / 200 MB ile sınırlı. Ford oranları yalnızca kayıtlı tamamlanmış teyitler üzerinden; gerçek teslimat performansı değildir. Genel Bakış sistem durumu yalnızca başarılı veri sorgusunu gösterir, yedek/kapasite/push sağlığı henüz ölçülmez. Statik ve sentetik testler gerçek sunucu ve iPhone testinin yerine geçmez.

## Açık test sorunu — 24.11.2026
- GitHub Actions ikinci çalışma [45419974065](https://github.com/dtalh/izkarwell/actions/runs/45419974065): 3/3 statik, 5/6 tarayıcı testi başarılı. Mobil WebKit kayıt düzenleme senaryosu, sahte Storage yanıtında `route.fulfill: body: expected string, got object` hatasıyla başarısız. Fotoğraf yükleme ve mükerrer devam adımları geçmiş olsa da düzenleme doğrulanmadı.
- Kullanıcı bu bilinen sorunla mevcut test ortamına pilot yayın yapılmasını onayladı. Gerçek müşteri verisi yasak; kurumsal üretim onayı değildir.
- Sonraki adım: test fixture binary yanıtını düzelt, mevcut fotoğrafı koruyarak düzenleme ve mükerrer uyarısında vazgeçme senaryosunu tekrar çalıştır. Gerçek iPhone ve Supabase yetki testleri ayrıca gerekli.

## v2.1 hazırlık kararı — 25.11.2026
- Kullanıcı gerçek kayıt girişinin şirket ve güvenlik onayları tamamlanana kadar kapalı tutulmasını açıkça onayladı. Gerçek kullanım açma işlemi ayrı onay gerektirir.
- v2.0 kaynak geri dönüşü: `backup/pre-v2.1-2026-11-25`, commit `6c2fd1952e7d568b6eba4edac1e6466c792d7708`. Canlı DB/Storage yedeği değildir.
- Kullanıcı ve Yetki Yönetimi masaüstü portalında mevcut; genel yönetici ataması SQL ile. Telefona özel yönetim ekranı ayrı değerlendirilir.
- WebKit fixture Buffer düzeltmesi ve kapalı giriş/iptal/rapor ayrımı/yetki kaldırma sentetik testleri hazırlandı; başarılı CI sonucu ve canlı RLS doğrulaması olmadan test sorunu kapanmış sayılmaz.


### v2.1 Mobil yönetim erişimi
Profilde kullanıcı yönetimi bağlantısı yalnızca sunucudan `platform_is_admin === true` doğrulanan hesaplara açılır. Telefonlarda kullanıcılar ve rol geçmişi kart düzeninde, rol seçimi dokunmatik kontrollerle gösterilir. Oturum değişiminde eski yanıtlar reddedilir; odak/sekme dönüşünde yetki yeniden doğrulanır; 401/403 yanıtında ekran temizlenir. Rol kaydetmeden önce yönetici yetkisi yeniden kontrol edilir; her işlem sunucu yetkilendirmesine tabidir. Sentetik tarayıcı testleri gerçek servisleri taklit eder. Gerçek müşteri girişi kapalı kalır; Supabase kurulumu ve fiziksel cihaz doğrulaması ayrıca bekler.
