import {StyleSheet} from 'react-native';
import {Button, SafeAreaView, Text, View} from '@/components/Themed';
import {useAuth} from '@/hooks/useAuth';

export default function TabTwoScreen() {
  const {logout} = useAuth();

  return (
    <SafeAreaView style={{flex: 1}}>
      <View>
        <Button title='Logout' onPress={logout} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
