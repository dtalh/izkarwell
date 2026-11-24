# Ford pilot — kurulum ve kabul testleri

Yalnızca uydurma müşteri isimleri ve örnek fotoğraflar kullanın.

1. Supabase SQL Editor'de `supabase/migrations/20261124_ford_pilot.sql` çalıştırın.
2. Authentication → Users bölümünde test hesabı UUID değerini alın.
3. SQL Editor'de UUID yerine test hesabının gerçek UUID değerini girerek çalıştırın:

```sql
insert into public.work_module_members(user_id,module_key,role)
values ('TEST-HESABI-UUID','ford-pilot','admin')
on conflict(user_id,module_key) do update set role=excluded.role;
```

İkinci hesap için operator veya reviewer rolünü kullanın. Yetkisiz hesapta rol satırı olmamalı. Admin bu modüle özeldir.
4. Google hesabıyla giriş yapın; yenileyip Profil → Ford Uygulamaları → Kurulum teyitlerini aç.

## Canlı kabul kriterleri
- [ ] Yetkisiz hesap paneli göremez; doğrudan REST ve fotoğraf isteği reddedilir.
- [ ] Operator yalnızca kendi kayıtlarını/fotoğraflarını görür.
- [ ] Reviewer tüm pilot kayıtlarını görür ancak oluşturamaz.
- [ ] Admin kayıt oluşturur ve tüm pilot kayıtlarını görür.
- [ ] TEST Müşteri A, teslim tarihi ve iki örnek fotoğraf kaydedilir.
- [ ] İşaretli uygulamada fotoğraf yoksa bitirme reddedilir.
- [ ] Telefon ve PC'de fotoğraflar okunaklı açılır.
- [ ] Yükleme kesildiğinde taslağa devam edilir; yüklenen fotoğraf değişmez.
- [ ] Çıkış/giriş sonrası doğru hesap görünür.
- [ ] Bucket public URL ile erişilemez.
- [ ] JSON fotoğraflı dışa aktarımda SHA-256 özetleri doğrulanır.
- [ ] Geri yükleme ayrı test ortamında denenir (henüz uygulanmadı).

Dışa aktarım en fazla 200 kayıtla sınırlı; taslaklar dahil değildir. Üretim öncesi bağımsız otomatik şifreli yedek, geri yükleme, işlem denetim kaydı, rol yönetim arayüzü, veri saklama ve şirket/KVKK onayı gerekir.

## Yönetim portalı v1.1 testleri
Ford admin SQL sonrasında `supabase/migrations/20261124_ford_report.sql` çalıştırın. Mevcut reviewer/admin rolü kullanılır.
- [ ] Eski ve yeni kayıtlarda oluşturan hesap adı/e-posta doğru.
- [ ] Operatör ve yetkisiz kullanıcı rapor kimlik RPC'sine erişemiyor; reviewer arşiv kayıtlarının kimliğini alamıyor.
- [ ] Rapor ön izlemesi ve XLSX indirme, tüm filtrelenmiş kayıtları kapsıyor; Excel'de iki sayfa açılıyor.
- [ ] Doğrudan ve ön izlemeden JPEG indirme doğru fotoğrafı ve dosya adını veriyor.
