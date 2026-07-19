# Bałtyk

Uruchom backend, bazę i usługi pomocnicze, a następnie aplikację mobilną:

```bash
docker compose up -d && npm --prefix frontend run start -- --dev-client --android
```

W środowisku deweloperskim dostępne jest konto administratora:

```text
e-mail: admin@example.com
hasło: admin
```

Po zalogowaniu na głównej mapie pojawia się przycisk `Uruchom symulację`. Resetuje on 31 deterministycznych użytkowników testowych do pozycji początkowych i uruchamia ich ruch w interwale dziesięciu sekund. Kolejne pozycje i skupiska heatmapy są odświeżane przez Socket.IO.

Konto ze słabym hasłem jest seedowane tylko przy `DEMO_ADMIN_ENABLED=true`; tej opcji nie należy włączać poza środowiskiem demo/deweloperskim.
