// app/(tabs)/index.tsx
// Simple home screen example
import {View, Text, Button} from 'react-native';
import {useFoodLogs, useLogFood} from '@/hooks/useFoodLogs';
import {useAuth} from '@/hooks/useAuth';

export default function HomeScreen() {
  const {data: logs = [], isLoading} = useFoodLogs();
  const {mutate: logFood} = useLogFood();
  const {logout} = useAuth();

  if (isLoading) {
    return (
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        <Text>Loading food logs...</Text>
      </View>
    );
  }

  return (
    <View style={{padding: 20}}>
      <Text>Today's Food Logs:</Text>
      {logs.map((log: any) => (
        <Text key={log.id}>
          {log.food_name} - {log.quantity}
        </Text>
      ))}

      <Button
        title='Log Food'
        onPress={() => logFood({foodId: 1, quantity: 2})}
      />
      <Button title='Logout' onPress={logout} color='red' />
    </View>
  );
}
