// City dashboard data queries — Cloudflare D1

export interface TimeseriesRow {
  series: string;
  year: number;
  value: number;
}

export interface CategoricalRow {
  category: string;
  value: number;
  sort_order: number;
}

async function queryTimeseries(
  db: D1Database,
  city: string,
  indicator: string
): Promise<TimeseriesRow[]> {
  const { results } = await db
    .prepare(
      `SELECT series, year, value FROM chart_timeseries
       WHERE city = ? AND indicator = ?
       ORDER BY year ASC`
    )
    .bind(city, indicator)
    .all<TimeseriesRow>();
  return results;
}

async function queryCategorical(
  db: D1Database,
  city: string,
  indicator: string
): Promise<CategoricalRow[]> {
  const { results } = await db
    .prepare(
      `SELECT category, value, sort_order FROM chart_categorical
       WHERE city = ? AND indicator = ?
       ORDER BY sort_order ASC`
    )
    .bind(city, indicator)
    .all<CategoricalRow>();
  return results;
}

// Helper: pivot timeseries rows into { seriesLabel: value[] } keyed by year-order
function pivotTimeseries(rows: TimeseriesRow[]): Record<string, number[]> {
  const map: Record<string, number[]> = {};
  for (const r of rows) {
    (map[r.series] ??= []).push(r.value);
  }
  return map;
}

// Helper: unique sorted years from rows
function years(rows: TimeseriesRow[]): number[] {
  return [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
}

export async function getCityDashboard(db: D1Database, city: string) {
  const [
    modalShare,
    subsidio,
    recaudo,
    viajes,
    zonas,
    modal2019,
    modal2024,
    aguaSatisf,
    aguaAseq,
    diversif,
    solarMw,
    digitalIdx,
    arizonaImports,
    energiaSonora,
    energiaNacional,
  ] = await Promise.all([
    queryTimeseries(db, city, 'modal_share'),
    queryTimeseries(db, city, 'subsidio_mdp'),
    queryTimeseries(db, city, 'recaudo_mdp'),
    queryTimeseries(db, city, 'viajes_m'),
    queryTimeseries(db, city, 'zonas_tp'),
    queryCategorical(db, city, 'modal_2019'),
    queryCategorical(db, city, 'modal_2024'),
    queryTimeseries(db, city, 'agua_satisf'),
    queryCategorical(db, city, 'agua_asequibilidad'),
    queryCategorical(db, city, 'diversificacion'),
    queryCategorical(db, city, 'solar_mw'),
    queryTimeseries(db, city, 'digital_idx'),
    queryCategorical(db, city, 'arizona_imports'),
    queryCategorical(db, city, 'energia_sonora'),
    queryCategorical(db, city, 'energia_nacional'),
  ]);

  return {
    movilidad: {
      years: years(modalShare),
      modal_share: pivotTimeseries(modalShare),
      subsidio: pivotTimeseries(subsidio).subsidio ?? [],
      recaudo: pivotTimeseries(recaudo).recaudo ?? [],
      viajes: pivotTimeseries(viajes).viajes ?? [],
      zonas: pivotTimeseries(zonas),
      modal_2019: modal2019.map((r) => ({ label: r.category, value: r.value })),
      modal_2024: modal2024.map((r) => ({ label: r.category, value: r.value })),
    },
    agua: {
      satisf_years: years(aguaSatisf),
      satisfaccion: pivotTimeseries(aguaSatisf).satisfaccion ?? [],
      asequibilidad: aguaAseq.map((r) => ({ label: r.category, value: r.value })),
    },
    economia: {
      digital_years: years(digitalIdx),
      digital_idx: pivotTimeseries(digitalIdx).mercado ?? [],
      diversificacion: diversif.map((r) => ({ label: r.category, value: r.value })),
      solar_mw: solarMw.map((r) => ({ label: r.category, value: r.value })),
    },
    oportunidades: {
      arizona_imports: arizonaImports.map((r) => ({ label: r.category, value: r.value })),
      energia_sonora: energiaSonora.map((r) => ({ label: r.category, value: r.value })),
      energia_nacional: energiaNacional.map((r) => ({ label: r.category, value: r.value })),
    },
  };
}
