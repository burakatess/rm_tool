# BGD Risk Simülatörü

Bilgi Güvenliği Direktörlüğü'nün risk ve kontrol matrisini GRC Excel'lerinden okuyan, metodolojiye göre yeniden hesaplayan ve sonucu aynı şablonda Excel olarak geri veren web uygulaması.

- **Simülatör:** Sayfalı risk kütüğü (20/30/50/100) ve kayıt detayı; etki, olasılık, Flag for IT ve P parametreleri değiştikçe doğal risk, bütünleşik kontrol ve kalıntı risk anında hesaplanır.
- **Excel tabloları:** Risk ve Kontrol Excel'i tüm kolonlarıyla; kolon filtresi, sürükleyerek genişlik, kolon aç/kapa, hücrede düzenleme, ayrı ayrı indirme.
- **Metodoloji:** Etki ağırlıkları, doğal / kontrol / bütünleşik / kalıntı seviye sınırları ve P parametreleri (sayı, kolon adı, seçenekler, puanlar) uygulamadan düzenlenir.
- **Veri yükle:** Risk, Kontrol ve Metodoloji için ayrı yükleme alanları; dosyalar önce kontrol edilir, "Uygula" ile sisteme işlenir. Boş şablonlar indirilebilir.

## Veri gizliliği

Uygulama tamamen tarayıcıda çalışır. Yüklenen Excel'ler ve yapılan değişiklikler yalnızca kullanıcının tarayıcısında (IndexedDB) saklanır; sunucuya veya dışarıya hiçbir veri gönderilmez. Sunucu yalnızca statik dosyaları sunar. Farklı kişiler ve cihazlar birbirinin verisini görmez; aynı veriyle çalışmak için Excel dosyaları paylaşılır.

## Hızlı başlangıç

Gereksinim: Node.js 20 veya üzeri (önerilen 22, bkz. `.nvmrc`).

```bash
npm ci            # bağımlılıkları kur
npm run dev       # geliştirme sunucusu: http://localhost:5173
npm test          # birim ve arayüz testleri (Vitest)
npm run build     # üretim paketi: dist/
```

## Kurum içi sunucuda yayın (Docker)

```bash
docker compose up -d --build
# http://<sunucu>:8080   ·  sağlık kontrolü: /healthz
```

İmaj iki aşamalıdır: Node ile derlenir, root olmayan `nginx-unprivileged` ile 8080 portundan sunulur. Compose dosyası kapsayıcıyı salt okunur dosya sistemi, düşürülmüş yetkiler (`cap_drop: ALL`) ve `no-new-privileges` ile çalıştırır. nginx yapılandırması (`docker/nginx.conf`) sıkı bir Content-Security-Policy ve güvenlik başlıkları ekler; uygulama dış kaynağa bağlanmadığı için yazı tipleri de paketin içindedir.

Ters vekil (reverse proxy) arkasında HTTPS ile yayınlanması önerilir.

## Excel şablonları

`templates/` klasöründe:

| Dosya | İçerik |
| --- | --- |
| `BGD_Risk_Sablonu.xlsx` | GRC Risk kolon sırası; Kasım 2026 matrisindeki 20 risk dolu |
| `BGD_Kontrol_Sablonu.xlsx` | GRC Kontrol kolon sırası; 81 kontrol dolu |
| `BGD_Risk_Sablonu_Bos.xlsx` | Boş taslak, açılır listeli |
| `BGD_Kontrol_Sablonu_Bos.xlsx` | Boş taslak, açılır listeli ve P puanları sayfalı |

Uygulama içinden indirilen boş şablonlar Metodoloji sekmesindeki güncel P parametreleriyle oluşur.

## Metodoloji özeti

| Adım | Kural |
| --- | --- |
| Etki | Flag for IT = 1 ise Gizlilik/Bütünlük/Erişilebilirlik (35/30/35), değilse Finansal/İtibar/Regülasyon/Müşteri (30/30/20/20) ağırlıklı ortalaması; boş/N/A boyutlar hariç; varsayılan yukarı yuvarlama |
| Doğal risk | Puan = Etki × Olasılık; skor üst sınırlar 2 / 6 / 10 / 16 ile 1–5 |
| Kontrol puanı | P1 + … + Pn; kontrol skoru alt sınırlar 2,5 / 5 / 7,5 |
| Bütünleşik kontrol | En yüksek kontrol puanı + 0,3 × diğer aktif kontrollerin toplamı; skor alt sınırlar 2,5 / 5 / 7,5 (Zayıf / Makul / Güçlü / Çok Güçlü) |
| Kalıntı risk | Puan = Doğal puan − Bütünleşik puan (bilgi amaçlı); skor = max(1, Doğal skor − Bütünleşik skor) |

Bu kurallar Kasım 2026 matrisinden geri hesaplanmıştır ve matrisin 20 riskinden 19'unu birebir üretir. Sapan tek kayıt RE-12'dir: matriste etki 3,05 aşağı yuvarlanmış, diğer bütün kayıtlarda yukarı yuvarlanmıştır. `src/domain/engine.test.ts` bu davranışı korur.

## SheetJS (Excel kütüphanesi) kaynağı

SheetJS'in güvenlik düzeltmeli sürümleri npm'de değil, kendi CDN'inde yayımlanır. npm'deki `xlsx@0.18.5` bilinen açıklar içerdiği için bu proje aynı 0.20.3 sürümünün npm'deki birebir kopyasını kullanır:

```json
"xlsx": "npm:@e965/xlsx@0.20.3"
```

Resmi kaynağı tercih ederseniz (kurum ağından `cdn.sheetjs.com` erişilebiliyorsa) satırı şununla değiştirip `npm install` çalıştırın:

```json
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

Kod `import * as XLSX from "xlsx"` kullandığı için başka değişiklik gerekmez.

## Proje yapısı

```
src/
  domain/      hesap motoru, sabitler, tipler, örnek veri (arayüzden bağımsız, test edilir)
  io/          Excel içe aktarma (importer) ve dışa aktarma (exporter)
  state/       uygulama durumu (zustand + immer, IndexedDB kalıcılığı)
  components/  simulator/, tables/, methodology/, data/, HeatMap
tests/         arayüz testleri ve Excel test dosyaları
templates/     dolu ve boş Excel şablonları
docker/        nginx yapılandırması
```

## Claude Code ile geliştirme

Proje kökünde `claude` komutunu çalıştırın. `CLAUDE.md` mimariyi, alan kurallarını ve değişiklik yaparken korunması gereken davranışları açıklar.
