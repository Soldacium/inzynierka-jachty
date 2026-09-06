# Backend aplikacji żeglarskiej

Backend REST + Socket.IO dla aplikacji mobilnej. System ma charakter informacyjny i nie jest certyfikowanym systemem nawigacyjnym.

## Uruchomienie

W katalogu głównym projektu:

```bash
docker compose up --build
```

Usługi:

- API: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/docs`
- OpenAPI: `http://localhost:3000/openapi.json`
- Mailpit: `http://localhost:8025`
- PostgreSQL/PostGIS: `localhost:5432`

Uruchomienie bez Dockera wymaga Node.js 20.19+ i działającego PostgreSQL z PostGIS:

```bash
cp .env.example .env
npm install
npm run migration:run
npm run dev
```

## Testy

```bash
npm run typecheck
npm test
npm run build
```

Test integracyjny wymaga bazy z `DATABASE_URL` i wykonanych migracji:

```bash
npm run test:integration
```

## API

Wszystkie chronione endpointy przyjmują `Authorization: Bearer <accessToken>`. API używa prefiksu `/api/v1`.

- `/auth`: rejestracja, logowanie, rotacja tokenu, wylogowanie i reset hasła.
- `/users/me`: profil, ustawienia prywatności i usunięcie historii lokalizacji.
- `/ports`: porty, infrastruktura, dostępność i komunikaty.
- `/routes`: zapisane trasy, punkty i obiekty w pobliżu trasy.
- `/locations/batch`: idempotentny zapis partii GPS.
- `/traffic/points` i `/traffic/heatmap`: pozycje z ochroną prywatności i agregaty ruchu.
- `/traffic/historical-ais`: osobna warstwa rocznej intensywności AIS HELCOM z 2024 r., filtrowana i normalizowana względem viewportu; nie przedstawia bieżących pozycji jednostek.
- `/alerts`: zgłoszenia i moderacja ostrzeżeń.
- `/conversations`: rozmowy, wiadomości i status przeczytania.
- `/admin`: blokowanie kont, zatwierdzanie portów, przypisania managerów i moderacja.

Socket.IO uwierzytelnia się access tokenem w `handshake.auth.token`. Klient dołącza do zakresu zdarzeniem `scope:join`, podając typ `alerts`, `traffic`, `port` lub `conversation`.

## Dane lokalne i import portów

Lokalny `docker-compose.yml` uruchamia API z `TRAFFIC_DEMO_MODE=true`. Endpointy ruchu zwracają wtedy jawnie oznaczone, syntetyczne jednostki i komórki `low`, `medium`, `high`, dzięki czemu można obejrzeć agregację bez publikowania prawdziwych lokalizacji. W środowisku produkcyjnym ta zmienna powinna być wyłączona.

Jednorazowy, idempotentny import portów i marin z OpenStreetMap/Overpass:

```bash
docker compose run --rm backend node dist/src/jobs/import-ports.js
```

Import zapisuje identyfikator źródłowy i przy kolejnym uruchomieniu aktualizuje istniejące rekordy. Dane OpenStreetMap są oznaczone w API polem `source: "openstreetmap"` i wymagają atrybucji `© OpenStreetMap contributors`.

Opcja `--prune` usuwa rekordy OpenStreetMap, których nie ma już w pełnym wyniku importu. Należy jej używać świadomie, np. przy zmianie zakresu importu:

```bash
docker compose run --rm backend node dist/src/jobs/import-ports.js --prune
```

## Prywatność i retencja

- Surowe próbki GPS są domyślnie usuwane po 7 dniach.
- Publiczne pozycje są zaokrąglane do około 100 metrów i używają pseudonimu zmienianego codziennie.
- Komórka heatmapy jest zwracana dopiero dla co najmniej 3 unikalnych użytkowników.
- Logi redagują tokeny, hasła i partie dokładnych współrzędnych.
- Cofnięcie zgody blokuje kolejne próbki; użytkownik może osobno usunąć dotychczasową historię.
