import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../../lib/supabase';

interface GridSummary {
  grid: string;
  totalFuel: number;
  totalSites: number;
  avgFuelPerSite: number;
  fuelPercentage: number;
  lsAvg: number;
  hasLSData: boolean;
  hasDGRecords: boolean;
}

export default function GridwiseSummary() {
  const [gridData, setGridData] = useState<GridSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGridSummary();
  }, []);

  const fetchGridSummary = async () => {
    try {
      console.log('Fetching grid summary...');
      
      // First, get all site IDs and their grids
      const { data: siteData, error: siteError } = await supabase
        .from('site_id2')
        .select('*');

      if (siteError) {
        console.error('Site data error:', siteError);
        throw siteError;
      }

      console.log('Site data count:', siteData?.length);

      // Get current month's date range
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // Format dates to match DD-MMM-YY format
      const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
      };

      const todayStr = formatDate(today);
      const firstDayStr = formatDate(firstDay);

      console.log('Using date range:', {
        firstDay: firstDayStr,
        today: todayStr
      });

      // Get fueling history
      const { data: fuelData, error: fuelError } = await supabase
        .from('fueling_history')
        .select('*')
        .gte('Date', firstDayStr)
        .lte('Date', todayStr);

      if (fuelError) {
        console.error('Fuel data error:', fuelError);
        throw fuelError;
      }

      // Get DG Running Alarm data for current month
      const { data: dgData, error: dgError } = await supabase
        .from('DG Running Alarm')
        .select('*')
        .gte('Date', firstDayStr)
        .lte('Date', todayStr);

      if (dgError) {
        console.error('DG Running Alarm data error:', dgError);
        throw dgError;
      }

      // Create a map of site IDs to their grids and collect all grids
      const siteGridMap = new Map();
      const allGrids = new Set<string>();
      siteData?.forEach(site => {
        const grid = site['Grid'];
        // Skip sites with no grid or invalid grid values
        if (grid && grid !== '-' && grid.trim() !== '') {
          siteGridMap.set(site['Site ID'], grid);
          allGrids.add(grid);
        }
      });

      console.log('Site grid mapping created. Total sites with valid grids:', siteGridMap.size);
      console.log('Available grids:', Array.from(allGrids));

      // Calculate average LS per grid
      const gridLS: Record<string, number[]> = {};
      const gridDGRecords: Record<string, number> = {};
      dgData?.forEach(row => {
        // Ensure siteId is a string for consistent mapping
        const siteId = row['Site name'] ? row['Site name'].toString() : undefined;
        const grid = siteGridMap.get(siteId);
        if (!grid) return;
        if (!gridDGRecords[grid]) gridDGRecords[grid] = 0;
        gridDGRecords[grid]++;
        // Parse LS as float (may be null or string)
        const lsVal = row['Load Shedding'] ? parseFloat(row['Load Shedding']) : null;
        if (lsVal !== null && !isNaN(lsVal)) {
          if (!gridLS[grid]) gridLS[grid] = [];
          gridLS[grid].push(lsVal);
        }
      });

      // Process data by grid
      const gridSummaries = new Map<string, {
        totalFuel: number;
        sites: Set<string>;
        lsAvg: number;
        hasLSData: boolean;
        hasDGRecords: boolean;
      }>();

      // Initialize all grids with zero values
      allGrids.forEach(grid => {
        const lsArr = gridLS[grid] || [];
        const lsAvg = lsArr.length > 0 ? lsArr.reduce((a, b) => a + b, 0) / lsArr.length : 0;
        const hasDGRecords = !!gridDGRecords[grid];
        gridSummaries.set(grid, {
          totalFuel: 0,
          sites: new Set(),
          lsAvg,
          hasLSData: lsArr.length > 0,
          hasDGRecords,
        });
      });

      fuelData?.forEach(record => {
        const siteId = record['Site ID Name'];
        const grid = siteGridMap.get(siteId);
        // Skip records for sites without a valid grid
        if (!grid) return;
        
        const fuel = Number(record['Fuel Quantity Filled']) || 0;

        const summary = gridSummaries.get(grid);
        if (summary) {
          summary.totalFuel += fuel;
          summary.sites.add(siteId);
        }
      });

      console.log('Grid summaries created. Grids with data:', Array.from(gridSummaries.keys()));

      // Calculate total fuel for percentage calculations
      const totalFuelAll = Array.from(gridSummaries.values())
        .reduce((sum, { totalFuel }) => sum + totalFuel, 0);

      // Convert to array and calculate additional metrics
      const summaryArray = Array.from(gridSummaries.entries())
        .map(([grid, summary]) => ({
          grid,
          totalFuel: summary.totalFuel,
          totalSites: summary.sites.size,
          avgFuelPerSite: summary.sites.size > 0 
            ? Math.round(summary.totalFuel / summary.sites.size) 
            : 0,
          fuelPercentage: totalFuelAll > 0 
            ? (summary.totalFuel / totalFuelAll) * 100 
            : 0,
          lsAvg: summary.lsAvg,
          hasLSData: summary.hasLSData,
          hasDGRecords: summary.hasDGRecords,
        }))
        .filter(summary => summary.grid !== 'Unassigned') // Filter out unassigned grids
        .sort((a, b) => {
          // Custom sorting: C1 first, then C6, then others alphabetically
          if (a.grid === 'C1' && b.grid !== 'C1') return -1;
          if (b.grid === 'C1' && a.grid !== 'C1') return 1;
          if (a.grid === 'C6' && b.grid !== 'C6') return -1;
          if (b.grid === 'C6' && a.grid !== 'C6') return 1;
          return a.grid.localeCompare(b.grid); // Alphabetical for other grids
        });

      setGridData(summaryArray);

    } catch (error) {
      console.error('Error in fetchGridSummary:', error);
      setError('Failed to fetch grid summary data');
    } finally {
      setLoading(false);
    }
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
      <Text style={styles.title}>Gridwise Summary</Text>
      
      {gridData.length === 0 ? (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available for the current month</Text>
        </View>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.gridCell]}>Grid</Text>
            <Text style={[styles.headerCell, styles.numberCell]}>Sites</Text>
            <Text style={[styles.headerCell, styles.numberCell]}>Total Fuel (L)</Text>
            <Text style={[styles.headerCell, styles.numberCell]}>Avg/Site</Text>
            <Text style={[styles.headerCell, styles.numberCell]}>%</Text>
            <Text style={[styles.headerCell, styles.numberCell]}>LS</Text>
          </View>

          <View style={styles.tableContainer}>
            {gridData.map((grid, index) => (
              <View 
                key={grid.grid} 
                style={[
                  styles.row,
                  index % 2 === 0 ? styles.evenRow : styles.oddRow
                ]}
              >
                <Text style={[styles.cell, styles.gridCell]} numberOfLines={1} ellipsizeMode="tail">
                  {grid.grid}
                </Text>
                <Text style={[styles.cell, styles.numberCell]} numberOfLines={1}>
                  {grid.totalSites}
                </Text>
                <Text style={[styles.cell, styles.numberCell]} numberOfLines={1}>
                  {grid.totalFuel.toLocaleString()}
                </Text>
                <Text style={[styles.cell, styles.numberCell]} numberOfLines={1}>
                  {grid.avgFuelPerSite.toLocaleString()}
                </Text>
                <Text style={[styles.cell, styles.numberCell]} numberOfLines={1}>
                  {grid.fuelPercentage.toFixed(1)}%
                </Text>
                <Text style={[styles.cell, styles.numberCell]} numberOfLines={1}>
                  {grid.hasDGRecords ? grid.lsAvg.toFixed(1) : '-'}
                </Text>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${Math.min(grid.fuelPercentage, 100)}%` }
                  ]} 
                />
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  tableContainer: {
    // Remove maxHeight to show all grids
  },
  headerRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
    overflow: 'hidden',
  },
  evenRow: {
    backgroundColor: '#fff',
  },
  oddRow: {
    backgroundColor: '#f9f9f9',
  },
  headerCell: {
    fontWeight: 'bold',
    color: '#666',
  },
  cell: {
    color: '#333',
  },
  gridCell: {
    flex: 0.7,
    paddingHorizontal: 4,
  },
  numberCell: {
    flex: 1,
    textAlign: 'right',
    paddingHorizontal: 4,
  },
  progressBar: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    left: 0,
    top: 0,
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
  noDataContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
}); 