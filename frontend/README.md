# Na Fali — aplikacja mobilna

Frontend aplikacji żeglarskiej zbudowany w Expo SDK 54, React Native i Expo Router. Obejmuje mapę portów i ostrzeżeń, śledzenie rejsu w tle, planowanie tras, komunikator oraz panel zarządcy portu.

## Uruchomienie

1. Skopiuj `.env.example` do `.env` i ustaw adres backendu:

   ```env
   EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1
   ```

   `10.0.2.2` jest adresem hosta z emulatora Androida. Na fizycznym urządzeniu użyj adresu IP komputera w sieci lokalnej.

2. Zainstaluj zależności i przygotuj development build:

   ```bash
   npm install
   npx expo run:android
   ```

3. Przy kolejnych uruchomieniach wystarczy:

   ```bash
   npx expo start --dev-client
   ```

Aplikacja wymaga development buildu — MapLibre, bezpieczny magazyn tokenów oraz śledzenie lokalizacji w tle nie działają w Expo Go.

## Kontrola jakości

```bash
npm run lint
npm run typecheck
npm test -- --runInBand
```

Backend uruchamiany przez główny `docker-compose.yml` powinien być dostępny pod portem `3000`. Podgląd wiadomości e-mail znajduje się w Mailpit pod `http://localhost:8025`.

Domyślnie aplikacja korzysta ze szczegółowego stylu OpenFreeMap Liberty. W profilu można przełączyć go na jaśniejszy Positron; oba adresy można zastąpić zmiennymi `EXPO_PUBLIC_MAP_STYLE_DETAILED_URL` i `EXPO_PUBLIC_MAP_STYLE_SIMPLE_URL`.

Webowe wsparcie `expo-sqlite` jest eksperymentalne. Konfiguracja Metro dołącza pliki WASM; hosting wersji webowej wymaga dodatkowo nagłówków COOP/COEP dla `SharedArrayBuffer`. Pełne testy mapy i lokalizacji w tle należy wykonywać w buildzie Android/iOS.
