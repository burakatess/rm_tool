# CLAUDE.md

BGD Risk Simülatörü: Bilgi Güvenliği Direktörlüğü'nün GRC risk/kontrol Excel'lerini içe alıp metodolojiye göre yeniden hesaplayan, sonucu aynı şablonda dışa veren, tamamen tarayıcıda çalışan React + TypeScript uygulaması. Kurum içi sunucuda Docker (nginx) ile statik site olarak yayınlanır.

## Komutlar

- `npm run dev` — geliştirme sunucusu (http://localhost:5173)
- `npm test` — Vitest (birim + arayüz testleri)
- `npm run typecheck` — TypeScript kontrolü
- `npm run build` — `tsc -b && vite build`, çıktı `dist/`
- `docker compose up -d --build` — üretim imajı, port 8080

Değişiklikten sonra her zaman `npm run typecheck && npm test` çalıştırın.

## Mimari

- `src/domain/` — saf mantık, React'e bağımlı değil.
  - `engine.ts`: `calc`, `computeAll`, `cscore`, seviye fonksiyonları, `devs`, `applyFixes`.
  - `constants.ts`: GRC kolon başlıkları (`RISK_HEAD`, `CTRL_HEAD`), varsayılan metodoloji `M0`, güncel P parametreleri `P0`, metodoloji alan listesi `MP`.
  - `text.ts`: Türkçe normalizasyon (`norm`, `ascii`, `hnorm`, `tnorm`), biçimlendirme, kayıt alanı yardımcıları.
  - `sampleData.ts`: Kasım 2026 matrisi (yerleşik örnek veri) ve `FIXES`.
- `src/io/importer.ts` — sayfa tanıma (`sheetTables`), `parseRisks`, `parseControls`, `parseMethod`, `parseParams`, P seçeneği eşleme (`matchOpt`), parametre değişince seçim taşıma (`remapPV`), yükleme alanı değerlendirme (`evalStage`, `buildFromStage`).
- `src/io/exporter.ts` — `riskTable`, `controlTable`, çalışma kitapları, boş şablon, `saveBlob`.
- `src/state/store.ts` — zustand + immer. `mutate(fn)` ile taslak üzerinde değişiklik yapılır. `persist` IndexedDB'ye (idb-keyval) 300 ms gecikmeyle yazar. `useStage` (yükleme alanları) ve `useToast` kalıcı değildir.
- `src/state/results.ts` — hesap sonuçları `App` içinde bir kez `computeAll` ile üretilip context ile dağıtılır; bileşenler `useResults()` kullanır.
- `src/components/` — `simulator/` (RiskList + RiskDetail + ControlCard), `tables/ExcelTables.tsx` (filtre, genişlik, kolon görünürlüğü, hücre düzenleme; düzenleme kuralları `tables/editing.ts`), `methodology/`, `data/DataLoad.tsx`, `HeatMap.tsx`.

## Alan kuralları (bozmayın)

- Kalıntı Risk Skoru varsayılan olarak `max(1, doğal skor − bütünleşik skor)`; Kalıntı Risk Puanı `doğal puan − bütünleşik puan` (bilgi amaçlı). "puan" yöntemi kullanıcı seçimiyle alternatif senaryodur.
- Bütünleşik kontrol = en yüksek kontrol puanı + `m.f` × diğer aktif kontroller (`m.cap` > 0 ise ilk N). İptal/Pasif/Kapalı/Silindi kontroller ve `exDoc` açıkken doküman kontrolleri hesaba girmez.
- `engine.test.ts`: yerleşik veride kayıttan sapan tek risk **RE-12** olmalı; RE-1 sonuçları 20 / 7,90 / 12,10 / skor 2.
- Excel başlıkları GRC şablonlarıyla birebir aynıdır; kolonlar başlık adına göre bulunur (sıra önemsiz). Tanınmayan kolonlar `ex` içinde korunur ve dışa aktarımda aynen yazılır.
- Tarihler `"d:YYYY-MM-DD"` dizgisi olarak saklanır; dışa aktarımda `Date` olur, `dd.mm.yyyy` biçimindedir.
- Kontrol P değerleri `control.pv[paramId] = optionId` olarak tutulur. P parametreleri değişince `remapPV` kolon adı + seçenek metniyle eşler. Kontrol Excel'indeki P kolonları `ctrlHead(m)` ile metodolojiden gelir.
- Risk Statü İptal/Pasif/Kapalı/Silindi satırları varsayılan olarak içe alınmaz; yükleme alanında listelenir ve isteğe bağlı içe alınabilir.

## Kurallar

- Arayüz metinleri Türkçedir; kısa, aktif, kullanıcının bildiği terimlerle yazın (Risk Excel'i, Kontrol Excel'i, Uygula…).
- Veri sunucuya gönderilmez; yeni bir ağ isteği eklemeyin. CSP (`docker/nginx.conf`) `connect-src 'self'` ile sınırlıdır ve yazı tipleri pakete gömülüdür (`@fontsource`).
- Stil belirteçleri `src/styles.css` başındaki `:root` bloğundadır; açık/koyu tema `prefers-color-scheme` ile gelir. Renkleri belirteçlerden alın.
- Büyük tablolarda kaydırma konumu korunmalı; düzenleme kutusu `focus({ preventScroll: true })` ile odaklanır.
- Bağımlılık sürümleri sabitlenmiştir (`^`/`~` yok). `xlsx` paketi SheetJS 0.20.3'ün npm kopyasıdır (`npm:@e965/xlsx`); ayrıntı README'de.
- Yeni bir hesap kuralı veya içe aktarma davranışı eklerken `src/domain/engine.test.ts` ve `src/io/importer.test.ts`'e test ekleyin. Test Excel'leri `tests/fixtures/` altındadır.
