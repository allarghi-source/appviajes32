import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';

export default function PassportCover() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
      
      <Text style={{ color: '#e8d5a3', fontSize: 24, marginBottom: 20 }}>
        Passport Cover
      </Text>

      <TouchableOpacity
        onPress={() => router.push('/passportinside')}
        style={{ backgroundColor: '#e8d5a3', padding: 15, borderRadius: 5 }}
      >
        <Text style={{ color: '#0a0a0a' }}>Abrir pasaporte</Text>
      </TouchableOpacity>

    </View>
  );
}