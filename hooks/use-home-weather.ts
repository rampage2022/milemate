import { useEffect, useState } from 'react';

type HomeWeatherState =
  | { status: 'idle' | 'loading' }
  | { status: 'ready'; conditionLabel: string; temperatureF: number }
  | { status: 'unavailable' };

function weatherCodeLabel(code: number): string {
  if (code === 0) {
    return 'Clear';
  }

  if (code <= 3) {
    return 'Cloudy';
  }

  if (code <= 48) {
    return 'Foggy';
  }

  if (code <= 67) {
    return 'Rainy';
  }

  if (code <= 77) {
    return 'Snowy';
  }

  if (code <= 82) {
    return 'Showers';
  }

  return 'Stormy';
}
export function useHomeWeather(
  latitude: number | null,
  longitude: number | null,
): HomeWeatherState {
  const [state, setState] = useState<HomeWeatherState>({ status: 'idle' });

  useEffect(() => {
    if (latitude === null || longitude === null) {
      setState({ status: 'unavailable' });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}` +
      `&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;

    void fetch(url)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`weather HTTP ${response.status}`);
        }

        return response.json() as Promise<{
          current?: { temperature_2m?: number; weather_code?: number };
        }>;
      })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const temp = payload.current?.temperature_2m;
        const code = payload.current?.weather_code;

        if (typeof temp !== 'number' || typeof code !== 'number') {
          setState({ status: 'unavailable' });
          return;
        }

        const temperatureF = Math.round(temp);

        setState({
          status: 'ready',
          conditionLabel: weatherCodeLabel(code),
          temperatureF,
        });
      })
      .catch((error: unknown) => {
        console.error('[useHomeWeather] fetch failed:', error);

        if (!cancelled) {
          setState({ status: 'unavailable' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return state;
}
