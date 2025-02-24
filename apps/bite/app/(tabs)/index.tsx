// app/(tabs)/index.tsx
// Simple home screen example
import {View, Text, Button, SafeAreaView} from '@/components/Themed';
import {useFoodLogs, useLogFood} from '@/hooks/useFoodLogs';
import {useRouter} from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const {mutate: logFood} = useLogFood();
  const {data: logs = [], isLoading} = useFoodLogs();

  if (isLoading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <Text>Loading food logs...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{flex: 1}}>
      <View style={{padding: 20}}>
        <Text>Today's Food Logs:</Text>
        <Button title='Log Food' onPress={() => router.push('/log-food')} />
        {logs.map((log: any) => (
          <Text key={log.id}>
            {log.food_name} - {log.quantity}
          </Text>
        ))}
      </View>
    </SafeAreaView>
  );
}
