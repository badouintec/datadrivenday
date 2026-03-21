-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 0002: city chart data
-- Time-series and categorical data for the Hermosillo dashboard
-- ─────────────────────────────────────────────────────────────────────────────

-- Time-series: line/bar charts indexed by year
CREATE TABLE IF NOT EXISTS chart_timeseries (
  id          TEXT    PRIMARY KEY,
  city        TEXT    NOT NULL DEFAULT 'hermosillo',
  indicator   TEXT    NOT NULL,   -- e.g. 'modal_share', 'subsidio_mdp'
  series      TEXT    NOT NULL,   -- e.g. 'tp', 'auto', 'total'
  year        INTEGER NOT NULL,
  value       REAL    NOT NULL
);

CREATE INDEX IF NOT EXISTS cts_city_indicator_idx ON chart_timeseries(city, indicator);

-- Categorical: donut/pie/horizontal-bar charts
CREATE TABLE IF NOT EXISTS chart_categorical (
  id          TEXT    PRIMARY KEY,
  city        TEXT    NOT NULL DEFAULT 'hermosillo',
  indicator   TEXT    NOT NULL,   -- e.g. 'modal_2024', 'solar_mw'
  category    TEXT    NOT NULL,   -- label
  value       REAL    NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS ccat_city_indicator_idx ON chart_categorical(city, indicator);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: Hermosillo · Movilidad
-- modal_share: reparto modal por modo 2019–2024
-- ─────────────────────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO chart_timeseries VALUES
  ('hmo-ms-tp-2019',   'hermosillo','modal_share','tp',        2019, 35.4),
  ('hmo-ms-tp-2020',   'hermosillo','modal_share','tp',        2020, 28.6),
  ('hmo-ms-tp-2021',   'hermosillo','modal_share','tp',        2021, 23.9),
  ('hmo-ms-tp-2022',   'hermosillo','modal_share','tp',        2022, 25.1),
  ('hmo-ms-tp-2023',   'hermosillo','modal_share','tp',        2023, 22.4),
  ('hmo-ms-tp-2024',   'hermosillo','modal_share','tp',        2024, 23.8),
  ('hmo-ms-auto-2019', 'hermosillo','modal_share','auto',      2019, 28.0),
  ('hmo-ms-auto-2020', 'hermosillo','modal_share','auto',      2020, 33.2),
  ('hmo-ms-auto-2021', 'hermosillo','modal_share','auto',      2021, 37.1),
  ('hmo-ms-auto-2022', 'hermosillo','modal_share','auto',      2022, 38.9),
  ('hmo-ms-auto-2023', 'hermosillo','modal_share','auto',      2023, 40.5),
  ('hmo-ms-auto-2024', 'hermosillo','modal_share','auto',      2024, 41.5),
  ('hmo-ms-walk-2019', 'hermosillo','modal_share','caminando', 2019, 10.0),
  ('hmo-ms-walk-2020', 'hermosillo','modal_share','caminando', 2020, 11.2),
  ('hmo-ms-walk-2021', 'hermosillo','modal_share','caminando', 2021, 12.8),
  ('hmo-ms-walk-2022', 'hermosillo','modal_share','caminando', 2022, 12.0),
  ('hmo-ms-walk-2023', 'hermosillo','modal_share','caminando', 2023, 13.1),
  ('hmo-ms-walk-2024', 'hermosillo','modal_share','caminando', 2024, 12.4);

-- subsidio: millones de pesos fideicomiso UNE
INSERT OR IGNORE INTO chart_timeseries VALUES
  ('hmo-sub-2019','hermosillo','subsidio_mdp','subsidio',2019,  92.87),
  ('hmo-sub-2020','hermosillo','subsidio_mdp','subsidio',2020, 252.49),
  ('hmo-sub-2021','hermosillo','subsidio_mdp','subsidio',2021, 427.51),
  ('hmo-sub-2022','hermosillo','subsidio_mdp','subsidio',2022, 482.43),
  ('hmo-sub-2023','hermosillo','subsidio_mdp','subsidio',2023, 613.54),
  ('hmo-sub-2024','hermosillo','subsidio_mdp','subsidio',2024, 723.36);

-- recaudo: ingresos por tarifa en mdp
INSERT OR IGNORE INTO chart_timeseries VALUES
  ('hmo-rec-2019','hermosillo','recaudo_mdp','recaudo',2019,159.41),
  ('hmo-rec-2020','hermosillo','recaudo_mdp','recaudo',2020,153.71),
  ('hmo-rec-2021','hermosillo','recaudo_mdp','recaudo',2021,236.90),
  ('hmo-rec-2022','hermosillo','recaudo_mdp','recaudo',2022,289.54),
  ('hmo-rec-2023','hermosillo','recaudo_mdp','recaudo',2023,281.46),
  ('hmo-rec-2024','hermosillo','recaudo_mdp','recaudo',2024,218.32);

-- viajes: millones de viajes
INSERT OR IGNORE INTO chart_timeseries VALUES
  ('hmo-vij-2019','hermosillo','viajes_m','viajes',2019,17.71),
  ('hmo-vij-2020','hermosillo','viajes_m','viajes',2020,17.08),
  ('hmo-vij-2021','hermosillo','viajes_m','viajes',2021,26.32),
  ('hmo-vij-2022','hermosillo','viajes_m','viajes',2022,32.17),
  ('hmo-vij-2023','hermosillo','viajes_m','viajes',2023,31.27),
  ('hmo-vij-2024','hermosillo','viajes_m','viajes',2024,24.26);

-- zonas: % residentes que usan TP por zona
INSERT OR IGNORE INTO chart_timeseries VALUES
  ('hmo-zn-n-2019','hermosillo','zonas_tp','norte', 2019,45.8),
  ('hmo-zn-n-2020','hermosillo','zonas_tp','norte', 2020,21.5),
  ('hmo-zn-n-2021','hermosillo','zonas_tp','norte', 2021,25.2),
  ('hmo-zn-n-2022','hermosillo','zonas_tp','norte', 2022,28.0),
  ('hmo-zn-n-2023','hermosillo','zonas_tp','norte', 2023,18.3),
  ('hmo-zn-n-2024','hermosillo','zonas_tp','norte', 2024,28.4),
  ('hmo-zn-c-2019','hermosillo','zonas_tp','centro',2019,31.9),
  ('hmo-zn-c-2020','hermosillo','zonas_tp','centro',2020,17.3),
  ('hmo-zn-c-2021','hermosillo','zonas_tp','centro',2021,13.4),
  ('hmo-zn-c-2022','hermosillo','zonas_tp','centro',2022,24.0),
  ('hmo-zn-c-2023','hermosillo','zonas_tp','centro',2023,10.1),
  ('hmo-zn-c-2024','hermosillo','zonas_tp','centro',2024,23.7),
  ('hmo-zn-s-2019','hermosillo','zonas_tp','sur',   2019,40.6),
  ('hmo-zn-s-2020','hermosillo','zonas_tp','sur',   2020,23.5),
  ('hmo-zn-s-2021','hermosillo','zonas_tp','sur',   2021,30.6),
  ('hmo-zn-s-2022','hermosillo','zonas_tp','sur',   2022,26.7),
  ('hmo-zn-s-2023','hermosillo','zonas_tp','sur',   2023,15.9),
  ('hmo-zn-s-2024','hermosillo','zonas_tp','sur',   2024,33.3);

-- agua: satisfacción percibida
INSERT OR IGNORE INTO chart_timeseries VALUES
  ('hmo-hid-satisf-2016','hermosillo','agua_satisf','satisfaccion',2016,54),
  ('hmo-hid-satisf-2017','hermosillo','agua_satisf','satisfaccion',2017,58),
  ('hmo-hid-satisf-2018','hermosillo','agua_satisf','satisfaccion',2018,62),
  ('hmo-hid-satisf-2019','hermosillo','agua_satisf','satisfaccion',2019,68),
  ('hmo-hid-satisf-2020','hermosillo','agua_satisf','satisfaccion',2020,73);

-- digital: índice servicios digitales (base 100 = 2020)
INSERT OR IGNORE INTO chart_timeseries VALUES
  ('hmo-dig-2020','hermosillo','digital_idx','mercado', 2020,100),
  ('hmo-dig-2021','hermosillo','digital_idx','mercado', 2021,115),
  ('hmo-dig-2022','hermosillo','digital_idx','mercado', 2022,132),
  ('hmo-dig-2023','hermosillo','digital_idx','mercado', 2023,152),
  ('hmo-dig-2024','hermosillo','digital_idx','mercado', 2024,175),
  ('hmo-dig-2025','hermosillo','digital_idx','mercado', 2025,201),
  ('hmo-dig-2026','hermosillo','digital_idx','mercado', 2026,231);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED: categoricals
-- ─────────────────────────────────────────────────────────────────────────────

-- Reparto modal 2019 (donut)
INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-md19-auto', 'hermosillo','modal_2019','Vehículo privado',28.0,1),
  ('hmo-md19-tp',   'hermosillo','modal_2019','Transporte Público',35.4,2),
  ('hmo-md19-bici', 'hermosillo','modal_2019','Bicicleta',8.4,3),
  ('hmo-md19-ride', 'hermosillo','modal_2019','Rideshare',6.3,4),
  ('hmo-md19-taxi', 'hermosillo','modal_2019','Taxi',3.2,5),
  ('hmo-md19-walk', 'hermosillo','modal_2019','Caminando',10.0,6);

-- Reparto modal 2024 (donut)
INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-md24-auto', 'hermosillo','modal_2024','Vehículo privado',41.5,1),
  ('hmo-md24-tp',   'hermosillo','modal_2024','Transporte Público',23.8,2),
  ('hmo-md24-walk', 'hermosillo','modal_2024','Caminando',12.4,3),
  ('hmo-md24-taxi', 'hermosillo','modal_2024','Taxi',6.5,4),
  ('hmo-md24-ride', 'hermosillo','modal_2024','Rideshare',5.1,5),
  ('hmo-md24-bici', 'hermosillo','modal_2024','Bicicleta',4.2,6);

-- Asequibilidad del agua: ciudades (horizontal bar)
INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-agu-mty', 'hermosillo','agua_asequibilidad','Monterrey',58,1),
  ('hmo-agu-mx',  'hermosillo','agua_asequibilidad','Promedio MX',50,2),
  ('hmo-agu-gdl', 'hermosillo','agua_asequibilidad','Guadalajara',49,3),
  ('hmo-agu-cdmx','hermosillo','agua_asequibilidad','CDMX',46,4),
  ('hmo-agu-tj',  'hermosillo','agua_asequibilidad','Tijuana',42,5),
  ('hmo-agu-hmo', 'hermosillo','agua_asequibilidad','Hermosillo',35,6);

-- Diversificación económica relativa (horizontal bar)
INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-div-a','hermosillo','diversificacion','Monterrey',8.2,1),
  ('hmo-div-b','hermosillo','diversificacion','Guadalajara',6.9,2),
  ('hmo-div-c','hermosillo','diversificacion','Tijuana',5.8,3),
  ('hmo-div-d','hermosillo','diversificacion','Ciudad Juárez',4.7,4),
  ('hmo-div-e','hermosillo','diversificacion','León',4.1,5),
  ('hmo-div-f','hermosillo','diversificacion','Querétaro',3.5,6),
  ('hmo-div-g','hermosillo','diversificacion','Mexicali',3.1,7),
  ('hmo-div-h','hermosillo','diversificacion','Hermosillo',2.3,8);

-- Capacidad solar instalada por estado (MW)
INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-sol-son','hermosillo','solar_mw','Sonora',1423,1),
  ('hmo-sol-coa','hermosillo','solar_mw','Coahuila',891,2),
  ('hmo-sol-yuc','hermosillo','solar_mw','Yucatán',762,3),
  ('hmo-sol-jal','hermosillo','solar_mw','Jalisco',634,4),
  ('hmo-sol-chi','hermosillo','solar_mw','Chihuahua',521,5);

-- Importaciones Arizona por sector (miles de millones USD)
INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-az-sem', 'hermosillo','arizona_imports','Electrónica y semiconductores',4.2,1),
  ('hmo-az-med', 'hermosillo','arizona_imports','Dispositivos médicos',2.8,2),
  ('hmo-az-ev',  'hermosillo','arizona_imports','Baterías y vehículos eléctricos',1.9,3),
  ('hmo-az-maq', 'hermosillo','arizona_imports','Maquinaria industrial',1.5,4),
  ('hmo-az-sw',  'hermosillo','arizona_imports','Software e ingeniería',0.8,5),
  ('hmo-az-qui', 'hermosillo','arizona_imports','Química especializada',0.6,6),
  ('hmo-az-vid', 'hermosillo','arizona_imports','Vidrio y cerámica',0.4,7);

-- Mix energético Sonora vs nacional (%)
INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-en-son-sol','hermosillo','energia_sonora','Solar',38,1),
  ('hmo-en-son-gas','hermosillo','energia_sonora','Gas natural',45,2),
  ('hmo-en-son-hid','hermosillo','energia_sonora','Hidroeléctrica',6,3),
  ('hmo-en-son-eol','hermosillo','energia_sonora','Eólica',8,4),
  ('hmo-en-son-nuc','hermosillo','energia_sonora','Nuclear',0,5),
  ('hmo-en-son-car','hermosillo','energia_sonora','Carbón',3,6);

INSERT OR IGNORE INTO chart_categorical VALUES
  ('hmo-en-mx-sol','hermosillo','energia_nacional','Solar',8,1),
  ('hmo-en-mx-gas','hermosillo','energia_nacional','Gas natural',52,2),
  ('hmo-en-mx-hid','hermosillo','energia_nacional','Hidroeléctrica',10,3),
  ('hmo-en-mx-eol','hermosillo','energia_nacional','Eólica',5,4),
  ('hmo-en-mx-nuc','hermosillo','energia_nacional','Nuclear',4,5),
  ('hmo-en-mx-car','hermosillo','energia_nacional','Carbón',6,6);
