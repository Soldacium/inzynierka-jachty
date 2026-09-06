# Historyczne dane AIS

Plik `helcom-ais-2024.bin.gz` zawiera niepuste komórki warstwy
`all_shiptypes_all_months2024.tif` ze zbioru **HELCOM AIS Shipping density
maps**. Każdy rekord ma 12 bajtów: długość geograficzną `float32`, szerokość
geograficzną `float32` i liczbę przejść `uint32` (little-endian).

Wartość oznacza liczbę rejsów statków, które przecięły komórkę 1 x 1 km w
2024 r. Nie jest to liczba statków ani zbiór pojedynczych pozycji AIS.

API traktuje tę warstwę jako roczny rozkład intensywności, a nie stan ruchu w
konkretnej chwili. Dla każdego viewportu pokazuje komórki powyżej 70. percentyla
i skaluje je względem 99. percentyla widocznego obszaru. Warstwa jest ukrywana
od poziomu zoom 10, ponieważ większe przybliżenie eksponowałoby regularną
strukturę źródłowej siatki zamiast dostarczać dodatkowej informacji.

Źródło i warunki użycia:

- https://metadata.helcom.fi/geonetwork/srv/api/records/2558244b-0cea-46e9-8053-af6ef5d01853
- https://maps.helcom.fi/website/download/Shipping_traffic_intensity/2024.zip
- Dostawca i wymagane oznaczenie źródła: HELCOM.

Po pobraniu i rozpakowaniu oficjalnego TIFF-a zbiór można odtworzyć poleceniem:

```sh
npm run historical-ais:import -- /sciezka/all_shiptypes_all_months2024.tif
```

Importer weryfikuje układ EPSG:3035, przelicza środki komórek do EPSG:4326 i
zapisuje metadane wraz z SHA-256 pliku źródłowego.
