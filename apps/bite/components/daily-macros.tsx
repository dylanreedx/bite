import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useThemeColor} from './Themed';

/**
 * Example usage:
 * <DailyMacroProgress
 *   totalCalories={220}
 *   calorieGoal={3000}
 *   totalProtein={45}
 *   proteinGoal={190}
 *   totalCarbs={110}
 *   carbsGoal={220}
 *   totalFat={10}
 *   fatGoal={50}
 * />
 */

type DailyMacroProgressProps = {
  totalCalories: number;
  calorieGoal?: number;
  totalProtein: number;
  proteinGoal?: number;
  totalCarbs: number;
  carbsGoal?: number;
  totalFat: number;
  fatGoal?: number;
};

export default function DailyMacroProgress({
  totalCalories,
  calorieGoal = 3000,
  totalProtein,
  proteinGoal = 190,
  totalCarbs,
  carbsGoal = 220,
  totalFat,
  fatGoal = 50,
}: DailyMacroProgressProps) {
  const textColor = useThemeColor({}, 'text');
  const proteinColor = useThemeColor({}, 'protein');
  const carbsColor = useThemeColor({}, 'carbs');
  const fatColor = useThemeColor({}, 'fat');

  const calorieRatio = Math.min(totalCalories / calorieGoal, 1);
  const proteinRatio = Math.min(totalProtein / proteinGoal, 1);
  const carbsRatio = Math.min(totalCarbs / carbsGoal, 1);
  const fatRatio = Math.min(totalFat / fatGoal, 1);

  return (
    <View style={styles.container}>
      {/* Left column: Big Calorie info */}
      <View style={styles.calorieContainer}>
        <Text style={[styles.bigCalorieText, {color: textColor}]}>
          {totalCalories}
        </Text>
        <Text style={[styles.subLabel, {color: textColor}]}>
          Calories consumed
        </Text>
        <View style={styles.calorieProgressBackground}>
          <View
            style={[
              styles.calorieProgressFill,
              {width: `${calorieRatio * 100}%`},
            ]}
          />
        </View>
        <Text style={[styles.goalLabel, {color: textColor}]}>
          {Math.round(calorieRatio * 100)}% of {calorieGoal}
        </Text>
      </View>

      {/* Right column: Macros */}
      <View style={styles.macrosContainer}>
        {/* Protein */}
        <View style={styles.macroItem}>
          <Text style={[styles.macroLabel, {color: textColor}]}>
            Protein {totalProtein}/{proteinGoal}g
          </Text>
          <View style={styles.macroProgressBackground}>
            <View
              style={[
                styles.macroProgressFill,
                {
                  width: `${proteinRatio * 100}%`,
                  backgroundColor: proteinColor,
                },
              ]}
            />
          </View>
        </View>
        {/* Carbs */}
        <View style={styles.macroItem}>
          <Text style={[styles.macroLabel, {color: textColor}]}>
            Carbs {totalCarbs}/{carbsGoal}g
          </Text>
          <View style={styles.macroProgressBackground}>
            <View
              style={[
                styles.macroProgressFill,
                {width: `${carbsRatio * 100}%`, backgroundColor: carbsColor},
              ]}
            />
          </View>
        </View>
        {/* Fat */}
        <View style={styles.macroItem}>
          <Text style={[styles.macroLabel, {color: textColor}]}>
            Fat {totalFat}/{fatGoal}g
          </Text>
          <View style={styles.macroProgressBackground}>
            <View
              style={[
                styles.macroProgressFill,
                {width: `${fatRatio * 100}%`, backgroundColor: fatColor},
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  /* Left column (calories) */
  calorieContainer: {
    flex: 1,
    marginRight: 16,
    alignItems: 'center',
  },
  bigCalorieText: {
    fontSize: 36,
    fontWeight: '700',
  },
  subLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  calorieProgressBackground: {
    width: '80%',
    height: 8,
    backgroundColor: '#444',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  calorieProgressFill: {
    height: '100%',
    backgroundColor: '#888',
  },
  goalLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  /* Right column (macros) */
  macrosContainer: {
    flex: 1,
    justifyContent: 'space-around',
  },
  macroItem: {
    marginVertical: 4,
  },
  macroLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  macroProgressBackground: {
    width: '100%',
    height: 6,
    backgroundColor: '#444',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
