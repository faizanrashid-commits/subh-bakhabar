"use client";

import React, { useState } from "react";

type CityKey = "islamabad" | "lahore" | "karachi";

interface DayForecast {
  day: string;
  condition: string;
  high: string;
  low: string;
  solarYield: string;
  wind: string;
}

interface CityAlmanacData {
  id: CityKey;
  label: string;
  shortLabel: string;
  temp: string;
  high: string;
  low: string;
  sky: string;
  aqi: string;
  humidity: string;
  uvSolar: string;
  commuterAdvisory: string;
  threeDayForecast: DayForecast[];
}

const CITY_ALMANAC: Record<CityKey, CityAlmanacData> = {
  islamabad: {
    id: "islamabad",
    label: "Islamabad / Rawalpindi",
    shortLabel: "ISB / RWP",
    temp: "24°C",
    high: "26°C",
    low: "14°C",
    sky: "Clear",
    aqi: "AQI 82 · Moderate",
    humidity: "38%",
    uvSolar: "UV 6 · Optimal Solar Irradiation",
    commuterAdvisory:
      "Dry skies across the Potohar plateau; optimal morning solar yield; unobstructed commuter transit with minor dusk haze along Kashmir Highway.",
    threeDayForecast: [
      {
        day: "TODAY (SAT)",
        condition: "Clear & Crisp",
        high: "26°C",
        low: "14°C",
        solarYield: "5.8 kWh/kWp (Peak 11:30–14:30)",
        wind: "NW 11 km/h",
      },
      {
        day: "SUN · OCT 18",
        condition: "Mostly Sunny",
        high: "25°C",
        low: "13°C",
        solarYield: "5.5 kWh/kWp (High Output)",
        wind: "NW 9 km/h",
      },
      {
        day: "MON · OCT 19",
        condition: "High Cirrus",
        high: "24°C",
        low: "13°C",
        solarYield: "4.9 kWh/kWp (Moderate-High)",
        wind: "NE 14 km/h",
      },
    ],
  },
  lahore: {
    id: "lahore",
    label: "Lahore",
    shortLabel: "LAHORE",
    temp: "28°C",
    high: "31°C",
    low: "19°C",
    sky: "Hazy Sun",
    aqi: "AQI 164 · Unhealthy (Smog Watch)",
    humidity: "46%",
    uvSolar: "UV 5 · Attenuated Solar Irradiation",
    commuterAdvisory:
      "Seasonal inversion layer forming over central Punjab; panel cleaning advised for rooftop arrays; reduced dawn visibility along Canal Bank Road and Ring Road.",
    threeDayForecast: [
      {
        day: "TODAY (SAT)",
        condition: "Hazy Sun",
        high: "31°C",
        low: "19°C",
        solarYield: "4.6 kWh/kWp (Soiling Loss -12%)",
        wind: "Calm 6 km/h",
      },
      {
        day: "SUN · OCT 18",
        condition: "Morning Mist",
        high: "30°C",
        low: "18°C",
        solarYield: "4.4 kWh/kWp (Moderate)",
        wind: "NW 8 km/h",
      },
      {
        day: "MON · OCT 19",
        condition: "Dry & Warm",
        high: "30°C",
        low: "18°C",
        solarYield: "4.8 kWh/kWp (Improving)",
        wind: "W 12 km/h",
      },
    ],
  },
  karachi: {
    id: "karachi",
    label: "Karachi",
    shortLabel: "KARACHI",
    temp: "30°C",
    high: "33°C",
    low: "24°C",
    sky: "Coastal Breeze",
    aqi: "AQI 74 · Moderate",
    humidity: "62%",
    uvSolar: "UV 8 · High Solar Irradiation",
    commuterAdvisory:
      "Steady Arabian Sea breeze across southern Sindh; strong midday rooftop generation; smooth port and industrial corridor flow along Shahrah-e-Faisal and M-9.",
    threeDayForecast: [
      {
        day: "TODAY (SAT)",
        condition: "Coastal Breeze",
        high: "33°C",
        low: "24°C",
        solarYield: "6.1 kWh/kWp (Optimal Peak)",
        wind: "SW 22 km/h",
      },
      {
        day: "SUN · OCT 18",
        condition: "Bright & Breezy",
        high: "32°C",
        low: "23°C",
        solarYield: "6.0 kWh/kWp (Optimal Peak)",
        wind: "SW 20 km/h",
      },
      {
        day: "MON · OCT 19",
        condition: "Scattered Clouds",
        high: "32°C",
        low: "24°C",
        solarYield: "5.4 kWh/kWp (High Output)",
        wind: "SW 18 km/h",
      },
    ],
  },
};

const CITY_ORDER: CityKey[] = ["islamabad", "lahore", "karachi"];

export function WeatherAlmanac() {
  const [selectedCity, setSelectedCity] = useState<CityKey>("islamabad");
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const city = CITY_ALMANAC[selectedCity];

  return (
    <div
      className="no-print relative font-mono text-xs text-[#2c2a26]"
      aria-label="Newspaper Weather and Commuter Almanac"
    >
      {/* Compact 1-Line Masthead Ear Strip */}
      <div className="bg-[#f4efe4] border border-[#2c2a26] px-2 py-1 flex flex-wrap items-center gap-x-2 gap-y-1 leading-tight">
        {/* City Switcher Pills */}
        <div
          className="inline-flex items-center gap-1"
          role="group"
          aria-label="Select Bureau City"
        >
          {CITY_ORDER.map((key) => {
            const item = CITY_ALMANAC[key];
            const active = key === selectedCity;
            return (
              <button
                key={key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCity(key);
                }}
                className={`px-1 py-0.2 text-[10px] uppercase tracking-wider cursor-pointer transition-colors ${
                  active
                    ? "bg-[#2c2a26] text-[#f4efe4] font-bold"
                    : "text-[#4a4742] hover:text-[#111111] underline decoration-dotted"
                }`}
                title={`Switch almanac to ${item.label}`}
              >
                {key === "islamabad" ? item.label : item.shortLabel}
              </button>
            );
          })}
        </div>

        <span className="text-[#4a4742]">·</span>

        {/* Clickable Summary Strip to Toggle Expanded Almanac */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-left text-[11px] text-[#2c2a26] hover:underline cursor-pointer"
          title="Click to toggle 3-day meteorological & commuter almanac"
        >
          <span className="font-bold">
            {city.sky} {city.temp}
          </span>
          <span className="text-[#4a4742]">
            (H:{city.high} / L:{city.low})
          </span>
          <span className="text-[#4a4742]">·</span>
          <span>{city.aqi}</span>
          <span className="hidden xl:inline text-[#4a4742]">·</span>
          <span className="hidden xl:inline">{city.uvSolar}</span>
          <span className="font-bold text-[10px] tracking-wider ml-1 underline underline-offset-2">
            {isExpanded ? "Almanac Details ▴" : "Almanac Details ▾"}
          </span>
        </button>
      </div>

      {/* Expanded Detailed 3-Day Meteorological & Transit Box */}
      {isExpanded && (
        <div
          role="region"
          aria-label={`${city.label} Detailed Meteorological and Commuter Almanac`}
          className="mt-1.5 sm:absolute sm:left-0 sm:top-full sm:z-40 sm:w-[640px] md:w-[720px] max-w-[94vw] font-mono text-xs text-[#2c2a26] bg-[#f4efe4] border border-[#2c2a26] p-2 shadow-lg normal-case tracking-normal"
        >
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 mb-2 border-b border-[#2c2a26] text-[10px] uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#111111]">
                ■ METEOROLOGICAL &amp; SOLAR ALMANAC · {city.label.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {CITY_ORDER.map((key) => {
                const item = CITY_ALMANAC[key];
                const active = key === selectedCity;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCity(key)}
                    className={`px-1.5 py-0.5 text-[10px] uppercase border cursor-pointer transition-colors ${
                      active
                        ? "bg-[#2c2a26] text-[#f4efe4] border-[#2c2a26] font-bold"
                        : "bg-transparent text-[#2c2a26] border-[#c8c2b6] hover:border-[#2c2a26]"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="ml-1 px-1.5 py-0.5 border border-[#2c2a26] text-[10px] uppercase hover:bg-[#2c2a26] hover:text-[#f4efe4] cursor-pointer"
              >
                [ ✕ ]
              </button>
            </div>
          </div>

          {/* Primary Atmospheric & Solar Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pb-2 mb-2 border-b border-[#c8c2b6] text-[11px]">
            <div className="border-r border-[#c8c2b6] pr-2">
              <div className="text-[9px] uppercase tracking-wider text-[#4a4742]">
                TEMP &amp; SKY
              </div>
              <div className="font-bold text-[#111111]">
                {city.temp} · {city.sky}
              </div>
              <div className="text-[10px] text-[#4a4742]">
                High {city.high} / Low {city.low}
              </div>
            </div>

            <div className="sm:border-r border-[#c8c2b6] sm:pr-2">
              <div className="text-[9px] uppercase tracking-wider text-[#4a4742]">
                AIR QUALITY
              </div>
              <div className="font-bold text-[#111111]">{city.aqi}</div>
              <div className="text-[10px] text-[#4a4742]">
                PM2.5 Urban Sensor
              </div>
            </div>

            <div className="border-r border-[#c8c2b6] pr-2">
              <div className="text-[9px] uppercase tracking-wider text-[#4a4742]">
                HUMIDITY
              </div>
              <div className="font-bold text-[#111111]">{city.humidity}</div>
              <div className="text-[10px] text-[#4a4742]">
                Relative Dew Point Stable
              </div>
            </div>

            <div>
              <div className="text-[9px] uppercase tracking-wider text-[#4a4742]">
                SOLAR HARVEST INDEX
              </div>
              <div className="font-bold text-[#111111]">{city.uvSolar}</div>
              <div className="text-[10px] text-[#4a4742]">
                Net-Billing Self-Use Window
              </div>
            </div>
          </div>

          {/* Commuter & Transit Advisory */}
          <div className="pb-2 mb-2 border-b border-[#c8c2b6] text-[11px] leading-snug">
            <span className="font-bold uppercase tracking-wider text-[10px] text-[#111111] mr-1.5">
              COMMUTER &amp; TRANSIT ADVISORY:
            </span>
            <span className="font-serif italic text-[#2c2a26]">
              &ldquo;{city.commuterAdvisory}&rdquo;
            </span>
          </div>

          {/* 3-Day Meteorological & Solar Harvest Table */}
          <div>
            <div className="text-[9px] uppercase tracking-wider text-[#4a4742] font-bold mb-1">
              3-DAY METEOROLOGICAL &amp; ROOFTOP SOLAR OUTLOOK
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
              {city.threeDayForecast.map((day) => (
                <div
                  key={day.day}
                  className="border border-[#c8c2b6] bg-[#f9f6ef] p-1.5"
                >
                  <div className="flex items-center justify-between font-bold text-[#111111] border-b border-[#c8c2b6] pb-0.5 mb-1">
                    <span>{day.day}</span>
                    <span>
                      {day.high} / {day.low}
                    </span>
                  </div>
                  <div className="text-[#2c2a26]">{day.condition}</div>
                  <div className="text-[#4a4742] mt-0.5">
                    Solar: {day.solarYield}
                  </div>
                  <div className="text-[#4a4742]">Wind: {day.wind}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

