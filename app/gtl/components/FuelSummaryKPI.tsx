import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

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

export default function GTLFuelSummaryKPI() {
  const [stats, setStats] = useState<FuelSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFuelSummary();
  }, []);

  const fetchFuelSummary = async () => {
    try {
      console.log('Fetching GTL fuel summary data for Mohammad Irfan...');
      // Get all site IDs for Mohammad Irfan
      const { data: irfanSites, error: irfanError } = await supabase
        .from('Location')
        .select('NAME')
        .eq('CMPAK GTL', 'Mohammad Irfan');
      const irfanSiteIds = irfanSites?.map(site => site.NAME?.toString()) || [];

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

      // Get array of C1 and C6 site IDs, filtered for Mohammad Irfan
      const c1SiteIds = c1Sites?.map(site => site['Site ID']).filter(id => irfanSiteIds.includes(id)) || [];
      const c6SiteIds = c6Sites?.map(site => site['Site ID']).filter(id => irfanSiteIds.includes(id)) || [];

      // Get date ranges
      const now = new Date();
      // Previous month
      const lastMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      // Month before last
      const prevMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      };
      const lastMonthFirstStr = formatDate(lastMonthFirstDay);
      const lastMonthLastStr = formatDate(lastMonthLastDay);
      const prevMonthFirstStr = formatDate(prevMonthFirstDay);
      const prevMonthLastStr = formatDate(prevMonthLastDay);

      // Fetch last month's fueling data
      const { data: lastMonthData, error: lastMonthError } = await supabase
        .from('fueling_history')
        .select('*')
        .gte('Date', lastMonthFirstStr)
        .lte('Date', lastMonthLastStr);

      if (lastMonthError) {
        console.error('Last month data error:', lastMonthError);
        throw lastMonthError;
      }

      // Filter lastMonthData for Mohammad Irfan's sites
      const filteredLastMonthData = lastMonthData?.filter(record => irfanSiteIds.includes(record['Site ID Name'])) || [];

      // Calculate C1 and C6 fuel dispersed for last month
      const c1FuelDispersed = filteredLastMonthData
        ?.filter(record => c1SiteIds.includes(record['Site ID Name']))
        ?.reduce((sum, record) => sum + (Number(record['Fuel Quantity Filled']) || 0), 0) || 0;

      const c6FuelDispersed = filteredLastMonthData
        ?.filter(record => c6SiteIds.includes(record['Site ID Name']))
        ?.reduce((sum, record) => sum + (Number(record['Fuel Quantity Filled']) || 0), 0) || 0;

      // Rest of the calculations for last month
      const lastMonthFuel = filteredLastMonthData?.reduce((sum, record) => {
        const fuel = Number(record['Fuel Quantity Filled']) || 0;
        return sum + fuel;
      }, 0) || 0;

      const lastMonthSites = new Set(filteredLastMonthData?.map(record => record['Site ID Name'])).size;

      const lastMonthHours = filteredLastMonthData?.reduce((sum, record) => {
        const before = Number(record['DG Hour Meter Reading (Before)']) || 0;
        const after = Number(record['DG Hour Meter Reading']) || 0;
        return sum + (after - before);
      }, 0) || 0;

      // Fetch previous month's fueling data (for percentage change)
      const { data: prevMonthData, error: prevMonthError } = await supabase
        .from('fueling_history')
        .select('*')
        .gte('Date', prevMonthFirstStr)
        .lte('Date', prevMonthLastStr);

      if (prevMonthError) {
        console.error('Previous month data error:', prevMonthError);
        throw prevMonthError;
      }

      // Filter prevMonthData for Mohammad Irfan's sites
      const filteredPrevMonthData = prevMonthData?.filter(record => irfanSiteIds.includes(record['Site ID Name'])) || [];

      // Calculate previous month stats
      const prevMonthFuel = filteredPrevMonthData?.reduce((sum, record) => {
        const fuel = Number(record['Fuel Quantity Filled']) || 0;
        return sum + fuel;
      }, 0) || 0;

      const prevMonthSites = new Set(filteredPrevMonthData?.map(record => record['Site ID Name'])).size;

      const prevMonthHours = filteredPrevMonthData?.reduce((sum, record) => {
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

      // Calculate percentage changes (last month vs previous month)
      const fuelChange = prevMonthFuel ? ((lastMonthFuel - prevMonthFuel) / prevMonthFuel) * 100 : 0;
      const sitesChange = prevMonthSites ? ((lastMonthSites - prevMonthSites) / prevMonthSites) * 100 : 0;
      const hoursChange = prevMonthHours ? ((lastMonthHours - prevMonthHours) / prevMonthHours) * 100 : 0;

      setStats({
        totalFuelConsumed: lastMonthFuel,
        totalSitesFueled: lastMonthSites,
        avgFuelPerSite: lastMonthSites > 0 ? Math.round(lastMonthFuel / lastMonthSites) : 0,
        activeDGs: dgData?.length || 0,
        totalDGRunningHours: Math.round(lastMonthHours),
        avgFuelEfficiency: lastMonthHours > 0 ? Math.round((lastMonthFuel / lastMonthHours) * 100) / 100 : 0,
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
        <ActivityIndicator size="large" color="#607D8B" />
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

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* KPI Card (C1 and C6) */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleIcon}>📈</Text>
        <Text style={styles.title}>Key Performance Indicators</Text>
      </View>
      <View style={styles.cardContainer}>
        <View style={styles.cardRow}>
          <View style={styles.kpiCard}>
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
          <View style={styles.kpiCard}>
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    minWidth: '45%',
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  percentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '600',
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
    color: '#dc3545',
    fontSize: 14,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: 8,
  },
  cardContainer: {
    gap: 16,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  kpiCard: {
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
  progressContainer: {
    marginTop: 12,
  },
  progressBarContainer: {
    position: 'relative',
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
  },
  progressBarSlider: {
    position: 'absolute',
    top: -4,
    width: 2,
    height: 16,
    backgroundColor: '#333',
    borderRadius: 1,
  },
}); 