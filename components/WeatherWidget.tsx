import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import * as Location from 'expo-location';
import * as Animatable from 'react-native-animatable';

const API_KEY = '303bca7bac259bfb873f3bb41afa8ba1';

interface WeatherData {
  temp: number;
  description: string;
  icon: string;
  city: string;
  feelsLike: number;
  condition: string;
}

interface DailyForecast {
  day: string;
  min: number;
  max: number;
  icon: string;
}

export default function WeatherWidget() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchWeather();
  }, []);

  const fetchWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission not granted');
        setLoading(false);
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Get location details using reverse geocoding
      const locationDetails = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });

      const cityName = locationDetails[0]?.city || locationDetails[0]?.subregion || locationDetails[0]?.district || 'Unknown Location';

      // Fetch current weather
      const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`;

      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(currentWeatherUrl),
        fetch(forecastUrl)
      ]);

      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();

      if (currentResponse.status === 401 || forecastResponse.status === 401) {
        throw new Error('API key not activated yet. Please wait up to 2 hours after creating the key.');
      }

      if (!currentResponse.ok || !forecastResponse.ok) {
        throw new Error('Failed to fetch weather data');
      }

      // Process current weather
      if (currentData.main && currentData.weather && currentData.weather[0]) {
        setWeather({
          temp: Math.round(currentData.main.temp),
          description: currentData.weather[0].description,
          icon: currentData.weather[0].icon,
          city: cityName, // Use the more accurate city name from reverse geocoding
          feelsLike: Math.round(currentData.main.feels_like),
          condition: currentData.weather[0].main
        });
        setError(null);
      }

      // Process daily forecast
      if (forecastData.list) {
        // Group forecast by day
        const dailyMap: { [day: string]: { temps: number[]; icons: string[] } } = {};
        forecastData.list.forEach((item: any) => {
          const date = new Date(item.dt * 1000);
          const day = date.toLocaleDateString('en-US', { weekday: 'short' });
          if (!dailyMap[day]) dailyMap[day] = { temps: [], icons: [] };
          dailyMap[day].temps.push(item.main.temp);
          dailyMap[day].icons.push(item.weather[0].icon);
        });
        // Build daily forecast array (skip today, show next 5 days)
        const today = new Date().toLocaleDateString('en-US', { weekday: 'short' });
        const dailyArr: DailyForecast[] = Object.entries(dailyMap)
          .filter(([day]) => day !== today)
          .slice(0, 7)
          .map(([day, { temps, icons }]) => ({
            day,
            min: Math.round(Math.min(...temps)),
            max: Math.round(Math.max(...temps)),
            icon: icons[Math.floor(icons.length / 2)] // pick a middle icon as representative
          }));
        setDailyForecast(dailyArr);
      }

    } catch (err) {
      console.error('Weather fetch error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error fetching weather data';
      setError(errorMessage);
      
      if (errorMessage.includes('API key not activated')) {
        setRetryCount(0);
      } else if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(fetchWeather, 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const getWeatherEmoji = (icon: string) => {
    const iconMap: { [key: string]: string } = {
      '01d': '☀️',
      '01n': '🌙',
      '02d': '⛅',
      '02n': '☁️',
      '03d': '☁️',
      '03n': '☁️',
      '04d': '☁️',
      '04n': '☁️',
      '09d': '🌧️',
      '09n': '🌧️',
      '10d': '🌦️',
      '10n': '🌧️',
      '11d': '⛈️',
      '11n': '⛈️',
      '13d': '🌨️',
      '13n': '🌨️',
      '50d': '🌫️',
      '50n': '🌫️',
    };
    return iconMap[icon] || '🌡️';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#fff" />
        <Text style={styles.loadingText}>Loading weather data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>⚠️ {error}</Text>
        {error.includes('API key not activated') ? (
          <Text style={styles.helpText}>
            The weather API key is still being activated.{'\n'}
            This can take up to 2 hours after creation.{'\n'}
            Please check back later.
          </Text>
        ) : (
          <Text style={styles.retryText} onPress={fetchWeather}>
            Tap to retry
          </Text>
        )}
      </View>
    );
  }

  if (!weather) return null;

  return (
    <Animatable.View animation="fadeIn" style={styles.container}>
      {/* Location and Current Weather */}
      <View style={styles.header}>
        <Text style={styles.location}>📍 {weather.city}</Text>
        <Text style={styles.updateTime}>
          {new Date().toLocaleString('en-US', { 
            hour: 'numeric',
            minute: 'numeric',
            hour12: true 
          })}
        </Text>
      </View>

      {/* Current Temperature */}
      <View style={styles.currentWeather}>
        <View style={styles.tempContainer}>
          <Text style={styles.temperature}>{weather.temp}°</Text>
          <Text style={styles.condition}>{weather.condition}</Text>
          <Text style={styles.feelsLike}>Feels like {weather.feelsLike}°</Text>
        </View>
      </View>

      {/* Daily Forecast */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.hourlyContainer}
      >
        {dailyForecast.map((day, index) => (
          <View key={index} style={styles.hourlyItem}>
            <Text style={styles.hourlyTime}>{day.day}</Text>
            <Text style={styles.hourlyEmoji}>{getWeatherEmoji(day.icon)}</Text>
            <Text style={styles.hourlyTemp}>{day.min}° / {day.max}°</Text>
          </View>
        ))}
      </ScrollView>

      
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#8DC63F',  // Zong green color
    borderRadius: 12,
    padding: 8,
    width: '100%',
    minHeight: 100,  // Further decreased from 120
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,  // Further decreased from 8
  },
  location: {
    color: '#fff',
    fontSize: 13,  // Further decreased from 14
    fontWeight: '600',
  },
  updateTime: {
    color: '#fff',
    fontSize: 11,  // Further decreased from 12
    opacity: 0.8,
  },
  currentWeather: {
    alignItems: 'center',
    marginBottom: 4,
  },
  tempContainer: {
    alignItems: 'center',
  },
  temperature: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
    textAlign: 'center',
  },
  condition: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  feelsLike: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.8,
    textAlign: 'center',
  },
  hourlyContainer: {
    marginTop: 4,  // Further decreased from 8
  },
  hourlyItem: {
    alignItems: 'center',
    marginRight: 8,  // Further decreased from 10
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 4,  // Further decreased from 6
    borderRadius: 4,  // Further decreased from 6
    minWidth: 50,  // Further decreased from 60
  },
  hourlyTime: {
    color: '#fff',
    fontSize: 11,  // Further decreased from 12
    marginBottom: 2,  // Further decreased from 4
  },
  hourlyTemp: {
    color: '#fff',
    fontSize: 12,  // Further decreased from 14
    fontWeight: '600',
  },
  hourlyEmoji: {
    fontSize: 16,  // Further decreased from 20
    marginBottom: 2,  // Further decreased from 4
  },
  moreButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  moreButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  helpText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
    opacity: 0.8,
  },
  retryText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
}); 