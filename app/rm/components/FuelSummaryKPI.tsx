import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../lib/supabase';

type C1Site = {
  'Site ID': string;
  Grid: string;
}

interface FuelSummaryStats {
  totalFuelConsumed: number;
  totalSitesFueled: number;
  avgFuelPerSite: number;
  activeDGs: number;
  totalDGRunningHours: number;
  avgFuelEfficiency: number;
  fuelChangePercentage: number;
  sitesChangePercentage: number;
  dgHoursChangePercentage: number;
  c1FuelDispersed: number;
  c6FuelDispersed: number;
}

export default function FuelSummaryKPI() {
  const [stats, setStats] = useState<FuelSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFuelSummary();
  }, []);

  const fetchFuelSummary = async () => {
    try {
      console.log('Fetching fuel summary data...');
      
      // Get date ranges
      const today = new Date();
      
      // Format dates to match DD-MMM-YY format
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth() as number];
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      };

      const todayStr = formatDate(today);
      const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const currentMonthStr = formatDate(currentMonth);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthStr = formatDate(lastMonth);

      console.log('Date ranges:', { todayStr, currentMonthStr, lastMonthStr });

      // Fetch C1 sites
      const { data: c1Sites, error: c1Error } = await supabase
        .from('c1')
        .select('*');

      if (c1Error) {
        console.error('C1 sites fetch error:', c1Error);
        throw c1Error;
      }

      // Fetch C6 sites
      const { data: c6Sites, error: c6Error } = await supabase
        .from('c6')
        .select('*');

      if (c6Error) {
        console.error('C6 sites fetch error:', c6Error);
        throw c6Error;
      }

      // Get array of C1 and C6 site IDs
      const c1SiteIds = c1Sites?.map(site => site['Site ID']) || [];
      const c6SiteIds = c6Sites?.map(site => site['Site ID']) || [];
      

      // Fetch current month's fueling data
      const { data: currentData, error: currentError } = await supabase
        .from('fueling_history')
        .select('*')
        .gte('Date', currentMonthStr)
        .lte('Date', todayStr);

      if (currentError) {
        console.error('Current month data error:', currentError);
        throw currentError;
      }

      

      // Calculate C1 and C6 fuel dispersed
      const c1FuelDispersed = currentData
        ?.filter(record => c1SiteIds.includes(record['Site ID Name']))
        ?.reduce((sum, record) => sum + (Number(record['Fuel Quantity Filled']) || 0), 0) || 0;

      const c6FuelDispersed = currentData
        ?.filter(record => c6SiteIds.includes(record['Site ID Name']))
        ?.reduce((sum, record) => sum + (Number(record['Fuel Quantity Filled']) || 0), 0) || 0;

      

      // Rest of the calculations...
      const currentFuel = currentData?.reduce((sum, record) => {
        const fuel = Number(record['Fuel Quantity Filled']) || 0;
        return sum + fuel;
      }, 0) || 0;

      const currentSites = new Set(currentData?.map(record => record['Site ID Name'])).size;

      const currentHours = currentData?.reduce((sum, record) => {
        const before = Number(record['DG Hour Meter Reading (Before)']) || 0;
        const after = Number(record['DG Hour Meter Reading']) || 0;
        return sum + (after - before);
      }, 0) || 0;

      // Fetch last month's fueling data
      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from('fueling_history')
        .select('*')
        .gte('Date', lastMonthStr)
        .lt('Date', currentMonthStr);

      if (lastMonthError) {
        console.error('Last month data error:', lastMonthError);
        throw lastMonthError;
      }

      // Calculate last month stats
      const lastMonthFuel = lastMonthData?.reduce((sum, record) => {
        const fuel = Number(record['Fuel Quantity Filled']) || 0;
        return sum + fuel;
      }, 0) || 0;

      const lastMonthSites = new Set(lastMonthData?.map(record => record['Site ID Name'])).size;

      const lastMonthHours = lastMonthData?.reduce((sum, record) => {
        const before = Number(record['DG Hour Meter Reading (Before)']) || 0;
        const after = Number(record['DG Hour Meter Reading']) || 0;
        return sum + (after - before);
      }, 0) || 0;

      // Fetch active DGs
      const { data: dgData, error: dgError } = await supabase
        .from('DG BM')
        .select('*')
        .eq('OPERATIONAL STATUS', 'Active');

      if (dgError) {
        console.error('DG data error:', dgError);
        throw dgError;
      }

      // Calculate percentage changes
      const fuelChange = lastMonthFuel ? ((currentFuel - lastMonthFuel) / lastMonthFuel) * 100 : 0;
      const sitesChange = lastMonthSites ? ((currentSites - lastMonthSites) / lastMonthSites) * 100 : 0;
      const hoursChange = lastMonthHours ? ((currentHours - lastMonthHours) / lastMonthHours) * 100 : 0;

      setStats({
        totalFuelConsumed: currentFuel,
        totalSitesFueled: currentSites,
        avgFuelPerSite: currentSites > 0 ? Math.round(currentFuel / currentSites) : 0,
        activeDGs: dgData?.length || 0,
        totalDGRunningHours: Math.round(currentHours),
        avgFuelEfficiency: currentHours > 0 ? Math.round((currentFuel / currentHours) * 100) / 100 : 0,
        fuelChangePercentage: Math.round(fuelChange * 10) / 10,
        sitesChangePercentage: Math.round(sitesChange * 10) / 10,
        dgHoursChangePercentage: Math.round(hoursChange * 10) / 10,
        c1FuelDispersed: c1FuelDispersed,
        c6FuelDispersed: c6FuelDispersed
      });

    } catch (error) {
      console.error('Error in fetchFuelSummary:', error);
      setError('Failed to fetch fuel summary data');
    } finally {
      setLoading(false);
    }
  };

  const renderPercentageIndicator = (percentage: number) => {
    const isPositive = percentage > 0;
    return (
      <View style={styles.percentageContainer}>
        <Text style={[
          styles.percentageText,
          { color: isPositive ? '#4CAF50' : '#FF5252' }
        ]}>
          {isPositive ? '↑' : '↓'} {Math.abs(percentage)}%
        </Text>
      </View>
    );
  };

  const renderProgressBar = (percentage: number) => {
    // Ensure percentage is between 0 and 100
    const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
    
    return (
      <View style={styles.progressContainer}>
        <Text style={styles.percentageText}>{clampedPercentage}%</Text>
        <View style={styles.progressBarContainer}>
          <LinearGradient
            colors={['#FF4B4B', '#FFA500', '#FFFF00', '#90EE90', '#4CAF50']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressBarBackground}
          />
          <View 
            style={[
              styles.progressBarSlider,
              { left: `${clampedPercentage}%` }
            ]}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.titleIcon}>📈</Text>
        <Text style={styles.title}>Key Performance Indicators</Text>
      </View>
      <View style={styles.cardContainer}>
        <View style={styles.cardRow}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>C1</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.label}>Target Fuel</Text>
              <Text style={styles.value}>38,210</Text>
              <Text style={[styles.label, { marginTop: 12 }]}>Dispersed Fuel</Text>
              <Text style={styles.value}>{stats?.c1FuelDispersed || 0}</Text>
              <Text style={[styles.label, { marginTop: 12 }]}>Consumption</Text>
              <View style={styles.progressContainer}>
                {renderProgressBar(Math.round(((stats?.c1FuelDispersed || 0) / 38210) * 100))}
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>C6</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.label}>Target Fuel</Text>
              <Text style={styles.value}>37,500</Text>
              <Text style={[styles.label, { marginTop: 12 }]}>Dispersed Fuel</Text>
              <Text style={styles.value}>{stats?.c6FuelDispersed || 0}</Text>
              <Text style={[styles.label, { marginTop: 12 }]}>Consumption</Text>
              <View style={styles.progressContainer}>
                {renderProgressBar(Math.round(((stats?.c6FuelDispersed || 0) / 37500) * 100))}
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  cardContainer: {
    gap: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  cardContent: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  mainValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subValue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  barContainer: {
    height: 6,
    backgroundColor: '#f5f5f5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#8DC63F',
    borderRadius: 3,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
  },
  progressContainer: {
    width: '100%',
    marginVertical: 4,
  },
  progressBarContainer: {
    position: 'relative',
    width: '100%',
    height: 12,
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    overflow: 'visible',
  },
  progressBarBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  progressBarSlider: {
    position: 'absolute',
    width: 4,
    height: 20,
    backgroundColor: '#333',
    borderRadius: 2,
    top: -4,
    transform: [{ translateX: -2 }],
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    lineHeight: 20,
    color: '#000',
    fontSize: 12,
    fontWeight: '600'
  }
}); 