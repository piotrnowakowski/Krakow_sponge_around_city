"""Step 4: drought indicators for 2026 -> web/public/data/drought.json

Sources
  IMGW-PIB hydro (hydro.imgw.pl backend): last 365 days of operational discharge at the
      gauges, plus the station's characteristic flows (NNQ, SNQ, SSQ ...). Operational,
      not yet verified by IMGW.
  IMGW-PIB public archive (danepubliczne.imgw.pl): verified daily discharge 1991-2025,
      used to rank 2026 against previous years.
  IMGW-PIB public API: current hydrological warnings (including "susza hydrologiczna").
  Open-Meteo historical API (ECMWF ERA5 reanalysis): daily precipitation, FAO-56 reference
      evapotranspiration and 0-100 cm soil moisture at each catchment centroid, 1991-today.

Can run on its own (e.g. a daily GitHub Action): it only needs catchments.json from step 3.
"""
import datetime as dt
import io
import json
import time
import zipfile

import geopandas as gpd
import numpy as np
import pandas as pd
import requests

from config import CLIMATE_NORMAL, CLIMATE_START, IMGW_STATIONS, OUT, RAW

HEADERS = {"User-Agent": "KrakowSponge/0.1 (OneAquaHealth hackathon)"}
IMGW_BACK = "https://hydro-back.imgw.pl"
IMGW_BACK_HEADERS = {**HEADERS, "Referer": "https://hydro.imgw.pl/", "Origin": "https://hydro.imgw.pl"}
ARCHIVE = "https://danepubliczne.imgw.pl/data/dane_pomiarowo_obserwacyjne/dane_hydrologiczne/dobowe"
TODAY = dt.date.today()
YEAR = TODAY.year


def get_json(url, headers=HEADERS, params=None, tries=4):
    for attempt in range(tries):
        try:
            r = requests.get(url, headers=headers, params=params, timeout=120)
        except (requests.ConnectionError, requests.Timeout):
            if attempt == tries - 1:
                raise
            time.sleep(10 * (attempt + 1))
            continue
        if r.status_code == 429 and attempt < tries - 1:
            time.sleep(65)
            continue
        r.raise_for_status()
        return r.json()


# ---------------------------------------------------------------- IMGW discharge

def archive_daily(codes):
    """Verified daily discharge for the given station codes, 1991..last archived year."""
    cache = RAW / "imgw"
    cache.mkdir(parents=True, exist_ok=True)
    frames = []
    for year in range(1991, YEAR):
        names = [f"codz_{year}.zip"] if year >= 2023 else [f"codz_{year}_{m:02d}.zip" for m in range(1, 13)]
        for name in names:
            path = cache / name
            if not path.exists():
                r = requests.get(f"{ARCHIVE}/{year}/{name}", headers=HEADERS, timeout=120)
                if r.status_code == 404:
                    continue
                r.raise_for_status()
                path.write_bytes(r.content)
            with zipfile.ZipFile(path) as z:
                for member in z.namelist():
                    raw = z.read(member).decode("cp1250", errors="replace")
                    df = pd.read_csv(io.StringIO(raw), header=None, dtype=str)
                    df = df[df[0].str.strip().str.strip('"').isin(codes)]
                    if len(df):
                        frames.append(df)
    df = pd.concat(frames, ignore_index=True)
    # columns: code, name, river, hydro year, hydro month, day, stage, discharge, temp, calendar month
    df = df.apply(lambda s: s.str.strip().str.strip('"'))
    hy, hm, day, cm = (df[c].astype(int) for c in (3, 4, 5, 9))
    cal_year = np.where(hm <= 2, hy - 1, hy)  # hydrological months 1-2 are Nov-Dec of previous year
    q = pd.to_numeric(df[7], errors="coerce")
    q = q.where(q < 99999)
    out = pd.DataFrame({
        "code": df[0],
        "date": pd.to_datetime(dict(year=cal_year, month=cm, day=day), errors="coerce"),
        "q": q,
    })
    return out.dropna(subset=["date"])


def station_block(code, meta, history):
    q = get_json(f"{IMGW_BACK}/station/hydro/discharge", IMGW_BACK_HEADERS,
                 {"id": code, "hoursInterval": 8760})
    status = get_json(f"{IMGW_BACK}/station/hydro/status", IMGW_BACK_HEADERS,
                      {"id": code, "hoursInterval": 24})
    op = pd.DataFrame(q["operational"])
    op["date"] = pd.to_datetime(op["date"]).dt.tz_convert("Europe/Warsaw").dt.date
    daily_op = op.groupby("date")["value"].mean()

    thresholds = {
        "NNQ": q["lowestLowDischargeValue"], "SNQ": q["mediumLowDischargeValue"],
        "NSQ": q["lowDischargeValue"], "SSQ": q["mediumOfYearMediumsDischargeValue"],
        "WSQ": q["highDischargeValue"], "SWQ": q["mediumHighDischargeValue"],
        "WWQ": q["highestHighDischargeValue"],
    }
    snq = thresholds["SNQ"]

    hist = history[history["code"] == code].set_index("date")["q"].dropna()
    this_year = pd.Series(daily_op.values, index=pd.to_datetime(daily_op.index))
    this_year = this_year[this_year.index.year == YEAR]
    last_day = this_year.index.max()

    # Compare the same calendar window (1 Jan .. last observed day) for every year.
    def window(series, year):
        s = series[(series.index >= f"{year}-01-01")
                   & (series.index <= f"{year}-{last_day.month:02d}-{last_day.day:02d}")]
        return s

    years = []
    for y in sorted(set(hist.index.year)):
        s = window(hist, y)
        if len(s) > 0.9 * len(this_year):
            years.append({"year": int(y), "mean_q": round(float(s.mean()), 3),
                          "days_below_snq": int((s < snq).sum())})
    years.append({"year": YEAR, "mean_q": round(float(this_year.mean()), 3),
                  "days_below_snq": int((this_year < snq).sum()), "operational": True})
    ranked = sorted(years, key=lambda r: r["mean_q"])
    rank = next(i for i, r in enumerate(ranked, start=1) if r["year"] == YEAR)

    below = (this_year < snq).astype(int)
    streak = longest = 0
    for v in below:
        streak = streak + 1 if v else 0
        longest = max(longest, streak)

    # Day-of-year envelope 1991-2020 for the chart.
    norm = hist[(hist.index.year >= CLIMATE_NORMAL[0]) & (hist.index.year <= CLIMATE_NORMAL[1])]
    by_doy = norm.groupby(norm.index.dayofyear)
    env = pd.DataFrame({"p10": by_doy.quantile(0.1), "median": by_doy.median(),
                        "p90": by_doy.quantile(0.9)}).round(3)

    return {
        **meta,
        "code": code,
        "state_code": status.get("stateCode"),
        "current": {"date": status["status"]["currentState"]["date"],
                    "stage_cm": status["status"]["currentState"]["value"],
                    "q": round(float(op["value"].iloc[-1]), 3)},
        "thresholds": thresholds,
        "daily_last_365": [[str(d), round(float(v), 3)] for d, v in daily_op.items()],
        "doy_envelope_1991_2020": {int(k): v for k, v in env.to_dict("index").items()},
        "year_window": f"01-01..{last_day.strftime('%m-%d')}",
        "days_below_snq": int(below.sum()),
        "longest_streak_below_snq": int(longest),
        "rank_driest_since_1991": rank,
        "years_compared": len(ranked),
        "years": years,
        "history_last_year": int(hist.index.year.max()) if len(hist) else None,
    }


# ---------------------------------------------------------------- IMGW warnings

def hydro_warnings():
    data = get_json("https://danepubliczne.imgw.pl/api/data/warningshydro")
    keep = []
    for w in data:
        regions = [o for o in w.get("obszary", []) if o.get("wojewodztwo") == "małopolskie"]
        if regions:
            keep.append({
                "event": w.get("zdarzenie"), "level": w.get("stopień"),
                "from": w.get("data_od"), "to": w.get("data_do"),
                "published": w.get("opublikowano"), "office": w.get("biuro"),
                "text": w.get("przebieg"), "probability": w.get("prawdopodobienstwo"),
                "areas": [o.get("opis") for o in regions],
            })
    return keep


# ---------------------------------------------------------------- climate (ERA5)

def era5_daily(lat, lon):
    cache = RAW / "climate"
    cache.mkdir(parents=True, exist_ok=True)
    frames = []
    start = pd.Timestamp(CLIMATE_START)
    end = pd.Timestamp(TODAY)
    chunk_start = start
    while chunk_start <= end:
        chunk_end = min(chunk_start + pd.DateOffset(years=5) - pd.Timedelta(days=1), end)
        closed = chunk_end.year < YEAR  # complete past chunks are cached for good
        path = cache / f"era5_{lat:.2f}_{lon:.2f}_{chunk_start.date()}_{chunk_end.date()}.json"
        if closed and path.exists():
            payload = json.loads(path.read_text())
        else:
            payload = get_json("https://archive-api.open-meteo.com/v1/archive", params={
                "latitude": lat, "longitude": lon, "models": "era5", "timezone": "Europe/Warsaw",
                "start_date": str(chunk_start.date()), "end_date": str(chunk_end.date()),
                "daily": "precipitation_sum,et0_fao_evapotranspiration,soil_moisture_0_to_100cm_mean",
            })
            if closed:
                path.write_text(json.dumps(payload))
        d = payload["daily"]
        frames.append(pd.DataFrame({"P": d["precipitation_sum"], "ET0": d["et0_fao_evapotranspiration"],
                                    "SM": d["soil_moisture_0_to_100cm_mean"]},
                                   index=pd.to_datetime(d["time"])))
        chunk_start = chunk_end + pd.Timedelta(days=1)
    return pd.concat(frames).dropna(how="all")


def climate_block(lat, lon):
    df = era5_daily(lat, lon)
    df = df[~((df.index.month == 2) & (df.index.day == 29))]  # align day-of-year across years
    df["doy"] = df.index.dayofyear - ((df.index.is_leap_year) & (df.index.month > 2)).astype(int)
    df["CWB"] = df["P"] - df["ET0"]
    df["year"] = df.index.year
    last = df.dropna(subset=["P"]).index.max()

    cum = df.groupby("year")[["P", "CWB"]].cumsum()
    df["cumP"], df["cumCWB"] = cum["P"], cum["CWB"]
    norm = df[(df["year"] >= CLIMATE_NORMAL[0]) & (df["year"] <= CLIMATE_NORMAL[1])]

    def envelope(col):
        g = norm.groupby("doy")[col]
        return pd.DataFrame({"p10": g.quantile(0.1), "mean": g.mean(), "p90": g.quantile(0.9)}).round(3)

    def year_series(col, year):
        s = df[df["year"] == year].set_index("doy")[col].dropna()
        return [[int(k), round(float(v), 2)] for k, v in s.items()]

    doy_last = int(df.loc[last, "doy"])
    ytd = df[(df["year"] == YEAR) & (df["doy"] <= doy_last)]
    ytd_norm = norm[norm["doy"] <= doy_last].groupby("year")[["P", "CWB"]].sum().mean()
    sm_env = envelope("SM")
    sm_now = float(df["SM"].dropna().iloc[-1])
    sm_mean = float(sm_env.loc[doy_last, "mean"])

    monthly = df.groupby(["year", df.index.month])["P"].sum().unstack()
    mnorm = monthly.loc[CLIMATE_NORMAL[0]:CLIMATE_NORMAL[1]].mean()
    months = []
    for m in range(1, last.month + 1):
        months.append({"month": m, "p": round(float(monthly.loc[YEAR, m]), 1),
                       "normal": round(float(mnorm[m]), 1),
                       "pct": round(100 * float(monthly.loc[YEAR, m]) / float(mnorm[m]), 0),
                       "partial": m == last.month})

    return {
        "point": {"lat": lat, "lon": lon},
        "data_until": str(last.date()),
        "summary": {
            "p_ytd_mm": round(float(ytd["P"].sum()), 0),
            "p_ytd_normal_mm": round(float(ytd_norm["P"]), 0),
            "p_ytd_pct": round(100 * float(ytd["P"].sum()) / float(ytd_norm["P"]), 0),
            "cwb_ytd_mm": round(float(ytd["CWB"].sum()), 0),
            "cwb_ytd_normal_mm": round(float(ytd_norm["CWB"]), 0),
            "soil_moisture_now": round(sm_now, 3),
            "soil_moisture_normal": round(sm_mean, 3),
            "soil_moisture_anomaly_pct": round(100 * (sm_now - sm_mean) / sm_mean, 0),
        },
        "monthly": months,
        "cum_p": {"normal": envelope("cumP").to_dict("index"),
                  str(YEAR): year_series("cumP", YEAR), str(YEAR - 1): year_series("cumP", YEAR - 1)},
        "cum_cwb": {"normal": envelope("cumCWB").to_dict("index"),
                    str(YEAR): year_series("cumCWB", YEAR), str(YEAR - 1): year_series("cumCWB", YEAR - 1)},
        "soil_moisture": {"normal": sm_env.to_dict("index"),
                          str(YEAR): year_series("SM", YEAR), str(YEAR - 1): year_series("SM", YEAR - 1)},
    }


def main():
    catchments = gpd.read_file(OUT / "catchments.json")
    print("IMGW archive 1991-")
    history = archive_daily(set(IMGW_STATIONS))
    # Keep the previous values for any source that is down, instead of failing the refresh.
    previous_path = OUT / "drought.json"
    previous = json.loads(previous_path.read_text(encoding="utf-8")) if previous_path.exists() else {}

    def keep_previous(section, key, build):
        try:
            return build()
        except Exception as exc:  # noqa: BLE001 - any source failure falls back to the snapshot
            old = previous.get(section, {}).get(key)
            if old is None:
                raise
            print(f"  ! {section}/{key}: {type(exc).__name__}, keeping previous data")
            return old

    print("IMGW gauges")
    stations = {code: keep_previous("stations", code, lambda c=code, m=meta: station_block(c, m, history))
                for code, meta in IMGW_STATIONS.items()}
    for s in stations.values():
        print(f"  {s['river']:8s} {s['name']:8s} Q={s['current']['q']} SNQ={s['thresholds']['SNQ']} "
              f"days<SNQ={s['days_below_snq']} rank={s['rank_driest_since_1991']}/{s['years_compared']}")
    print("IMGW warnings")
    try:
        warnings = hydro_warnings()
    except Exception as exc:  # noqa: BLE001
        print(f"  ! warnings: {type(exc).__name__}, keeping previous data")
        warnings = previous.get("warnings", [])
    print(f"  {len(warnings)} active warnings in Małopolska")
    print("ERA5 climate")
    climate = {}
    for _, c in catchments.iterrows():
        p = c.geometry.representative_point()
        climate[c["id"]] = keep_previous("climate", c["id"],
                                         lambda p=p: climate_block(round(p.y, 2), round(p.x, 2)))
        print(f"  {c['id']:8s} {climate[c['id']]['summary']}")

    out = {
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
        "year": YEAR,
        "stations": stations,
        "warnings": warnings,
        "climate": climate,
    }
    (OUT / "drought.json").write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"  drought.json {(OUT / 'drought.json').stat().st_size / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
