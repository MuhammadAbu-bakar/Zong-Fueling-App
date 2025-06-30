import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { LineChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';

interface FuelingData {
  "Site ID Name": string;
  "Date": string;
  "Refueling Time": string;
  "DG Label No.": string;
  "DG Capacity (KVA)": number;
  "DG Hour Meter Reading": number;
  "DG Hour Meter Reading (Before)": number;
  "Before Filling Fuel Quantity": string;
  "Fuel Quantity Filled": number;
  "Total": number;
}

interface ChartData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export default function FuelingHistoryGraph() {
  const [loading, setLoading] = useState(true);
  const [fuelingData, setFuelingData] = useState<FuelingData[]>([]);
  const [selectedSite, setSelectedSite] = useState<string>('all');
  const [sites, setSites] = useState<string[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    labels: [],
    datasets: [{ data: [] }]
  });

  useEffect(() => {
    fetchFuelingHistory();
  }, []);

  useEffect(() => {
    processDataForChart();
  }, [selectedSite, fuelingData]);

  const fetchFuelingHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('fueling_history')
        .select('*')
        .order('Date', { ascending: true });

      if (error) throw error;

      const validData = data.filter(item => 
        item["Site ID Name"] && 
        item["Date"] && 
        item["Fuel Quantity Filled"] !== null
      );

      setFuelingData(validData);

      // Extract unique sites
      const uniqueSites = [...new Set(validData.map(item => item["Site ID Name"]))];
      setSites(uniqueSites);

    } catch (error) {
      console.error('Error fetching fueling history:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDataForChart = () => {
    if (!fuelingData.length) return;

    let filteredData = fuelingData;
    if (selectedSite !== 'all') {
      filteredData = fuelingData.filter(item => item["Site ID Name"] === selectedSite);
    }

    // Group by month and sum fuel quantities
    const groupedData = filteredData.reduce((acc, curr) => {
      // Parse date components
      const [day, monthStr, yearStr] = curr.Date.split('-');
      
      // Convert month abbreviation to number (e.g., 'Jan' to '01')
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
        'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      // Create a sortable key (YYYY-MM format)
      const monthNum = monthMap[monthStr];
      const fullYear = '20' + yearStr; // Convert YY to YYYY
      const sortKey = `${fullYear}-${monthNum}`;
      
      // Keep the display key in MMM-YY format
      const displayKey = `${monthStr}-${yearStr}`;
      
      if (!acc[sortKey]) {
        acc[sortKey] = {
          displayKey,
          value: 0
        };
      }
      acc[sortKey].value += curr["Fuel Quantity Filled"] || 0;
      return acc;
    }, {} as { [key: string]: { displayKey: string, value: number } });

    // Sort by date and get last 6 months
    const sortedMonths = Object.keys(groupedData)
      .sort() // This will sort chronologically since we're using YYYY-MM format
      .slice(-6);

    // Map the sorted keys to their display values
    const months = sortedMonths.map(key => groupedData[key].displayKey);
    const fuelQuantities = sortedMonths.map(key => groupedData[key].value);

    setChartData({
      labels: months,
      datasets: [{
        data: fuelQuantities,
        color: (opacity = 1) => `rgba(141, 198, 63, ${opacity})`, // Zong green color
        strokeWidth: 2
      }]
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8DC63F" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fueling History</Text>
      
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedSite}
          style={styles.picker}
          onValueChange={(itemValue) => setSelectedSite(itemValue)}
        >
          <Picker.Item label="All Sites" value="all" />
          {sites.map((site) => (
            <Picker.Item key={site} label={site} value={site} />
          ))}
        </Picker>
      </View>

      {chartData.labels.length > 0 ? (
        <LineChart
          data={chartData}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#8DC63F'
            }
          }}
          bezier
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix="L"
          fromZero
        />
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    height: 300,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  pickerContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
  }
}); 