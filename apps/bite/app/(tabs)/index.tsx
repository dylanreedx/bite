import React, {useMemo} from 'react';
import {useRouter} from 'expo-router';
import {FlatList, Pressable, StyleSheet} from 'react-native';
import {
  SafeAreaView,
  Text,
  View,
  Button,
  useThemeColor,
} from '@/components/Themed';
import {useFoodLogs} from '@/hooks/useFoodLogs';
import DailyMacros from '@/components/daily-macros';

function parseNumberFromString(str: string) {
  const match = str.match(/[\d.]+/);
  if (!match) return 0;
  return parseFloat(match[0]) || 0;
}

export default function HomeScreen() {
  const router = useRouter();

  // 1) Always call your hooks top-level, not inside conditionals
  const {data: logs = [], isLoading} = useFoodLogs();

  // 2) Precompute daily totals with useMemo, *outside* any condition
  const {totalCalories, totalCarbs, totalFat, totalProtein} = useMemo(() => {
    return logs.reduce(
      (
        acc: {
          totalCalories: number;
          totalCarbs: number;
          totalFat: number;
          totalProtein: number;
        },
        log: {
          calories: string;
          carbohydrate: string;
          fat: string;
          protein: string;
          quantity: number;
        }
      ) => {
        const cals = parseNumberFromString(log.calories);
        const carbs = parseNumberFromString(log.carbohydrate);
        const fat = parseNumberFromString(log.fat);
        const protein = parseNumberFromString(log.protein);

        acc.totalCalories += cals * log.quantity;
        acc.totalCarbs += carbs * log.quantity;
        acc.totalFat += fat * log.quantity;
        acc.totalProtein += protein * log.quantity;
        return acc;
      },
      {totalCalories: 0, totalCarbs: 0, totalFat: 0, totalProtein: 0}
    );
  }, [logs]);

  // 3) Define any other hooks or helpers
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  // 4) If still loading, show a spinner *after* all hooks are defined
  if (isLoading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Loading food logs...</Text>
      </SafeAreaView>
    );
  }

  // 5) Render function for each log item
  function renderLogItem({item}: {item: any}) {
    // e.g. item = { id, food_name, quantity, serving_description, calories, fat, ... }
    const cals = parseNumberFromString(item.calories) * item.quantity;
    return (
      <Pressable
        onPress={() => {
          // maybe open a detail screen
        }}
        style={({pressed}) => [
          styles.logRow,
          {
            borderColor,
            backgroundColor: pressed ? '#ddd' : 'transparent',
          },
        ]}
      >
        <Text style={[styles.logTitle, {color: textColor}]}>
          {item.food_name}
        </Text>
        <Text style={{color: textColor, marginBottom: 4}}>
          {item.serving_description} x {item.quantity} → {cals.toFixed(2)} kcal
        </Text>
        <Text style={{color: textColor, opacity: 0.8}}>
          Protein: {item.protein} | Carbs: {item.carbohydrate} | Fat: {item.fat}
        </Text>
      </Pressable>
    );
  }

  // 6) Otherwise, render totals + the list of logs
  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={styles.container}>
        {/* Header row */}
        <View style={styles.header}>
          <Text style={styles.title}>Today's Food Logs</Text>
          <Button title='Log Food' onPress={() => router.push('/log-food')} />
        </View>

        {/* Daily Totals Card */}
        <DailyMacros
          totalCalories={totalCalories}
          totalCarbs={totalCarbs}
          totalFat={totalFat}
          totalProtein={totalProtein}
        />

        {/* Logs List */}
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLogItem}
          style={{marginTop: 10}}
          ListEmptyComponent={<Text>No foods logged yet.</Text>}
        />
      </View>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: 20,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalsCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  totalsTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  logRow: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
});
