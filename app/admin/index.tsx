import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth';
import WeatherWidget from '../../components/WeatherWidget';
import FuelingHistoryGraph from '../../components/FuelingHistoryGraph';
import FuelSummaryKPI from '../rm/components/FuelSummaryKPI';
import GridwiseSummary from '../rm/components/GridwiseSummary';
import MapsScreen from '../rm/maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 48 = padding (16) * 2 + gap (16)

interface UserView {
  title: string;
  route: string;
  color: string;
  description: string;
  role: UserRole;
  icon: {
    type: 'MaterialCommunityIcons' | 'FontAwesome5';
    name: string;
  };
  image: any;
}

const userViews: UserView[] = [
  {
    title: 'Regional Manager',
    route: '/rm/todo',
    color: '#2196F3',
    description: '',
    role: 'rm',
    icon: {
      type: 'MaterialCommunityIcons',
      name: 'account-network'
    },
    image: require('../../assets/images/rm-img.jpeg')
  },
  {
    title: 'GTL',
    route: '/gtl/(tabs)',
    color: '#607D8B',
    description: '',
    role: 'gtl',
    icon: {
      type: 'MaterialCommunityIcons',
      name: 'view-dashboard'
    },
    image: require('../../assets/images/gtl3.jpeg')
  },
  {
    title: 'Security',
    route: '/security',
    color: '#9C27B0',
    description: '',
    role: 'security',
    icon: {
      type: 'MaterialCommunityIcons',
      name: 'security'
    },
    image: require('../../assets/images/security-img.jpeg')
  },
  {
    title: 'Coordinator',
    route: '/coordinator/coordinator',
    color: '#4CAF50',
    description: '',
    role: 'coordinator',
    icon: {
      type: 'MaterialCommunityIcons',
      name: 'account-tie'
    },
    image: require('../../assets/images/coordinator-img.jpeg')
  },
  {
    title: 'Fueler',
    route: '/fueler',
    color: '#FF9800',
    description: '',
    role: 'fueler',
    icon: {
      type: 'FontAwesome5',
      name: 'gas-pump'
    },
    image: require('../../assets/images/fueler.jpeg')
  },
];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    router.replace('/auth/login');
    return null;
  }

  const renderUserCard = (view: UserView) => (
    <TouchableOpacity
      key={view.title}
      style={[styles.card, { backgroundColor: view.color }]}
      onPress={() => {
        const route = view.route.startsWith('/') ? view.route.slice(1) : view.route;
        router.push(route as any);
      }}
    >
      <View style={styles.cardContent}>
        <Image source={view.image} style={styles.cardImage} />
        <View style={styles.titleContainer}>
          <View style={styles.iconContainer}>
            {view.icon.type === 'MaterialCommunityIcons' ? (
              <MaterialCommunityIcons name={view.icon.name as any} size={24} color="#fff" />
            ) : (
              <FontAwesome5 name={view.icon.name} size={24} color="#fff" />
            )}
          </View>
          <Text style={styles.cardTitle}>{view.title}</Text>
        </View>
        <Text style={styles.cardDescription}>{view.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      

      {/* Weather Widget */}
      <View style={[styles.section, styles.weatherSection]}>
        <WeatherWidget />
      </View>

      {/* User Views */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Views</Text>
        <View style={styles.viewsGrid}>
          {userViews.map(renderUserCard)}
        </View>
      </View>

      {/* KPI Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fuel Summary KPIs</Text>
        <FuelSummaryKPI />
      </View>

      {/* Fueling History Graph */}
      <View style={[styles.section, styles.graphSection]}>
        <Text style={styles.sectionTitle}>Fueling History</Text>
        <FuelingHistoryGraph />
      </View>

      {/* Gridwise Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gridwise Summary</Text>
        <GridwiseSummary />
      </View>

      {/* Maps Section */}
      <View style={[styles.section, styles.mapSection]}>
        <Text style={styles.sectionTitle}>Site Locations</Text>
        <View style={styles.mapContainer}>
          <MapsScreen />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  weatherSection: {
    marginTop: 16,
  },
  viewsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  card: {
    width: cardWidth,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardContent: {
    alignItems: 'center',
    padding: 12,
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
    paddingHorizontal: 8,
  },
  iconContainer: {
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  cardImage: {
    width: cardWidth * 0.5,
    height: cardWidth * 0.5,
    borderRadius: (cardWidth * 0.5) / 2,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#ffffff50',
  },
  cardDescription: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    width: '100%',
  },
  graphSection: {
    paddingVertical: 16,
  },
  mapSection: {
    padding: 16,
  },
  mapContainer: {
    height: 400,
    borderRadius: 12,
    overflow: 'hidden',
  },
}); 