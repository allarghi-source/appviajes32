import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Profile() {
  const router = useRouter();

  const [name, setName] = useState('');

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 20 }}>

      <Text style={{ color: '#e8d5a3', fontSize: 24, marginBottom: 20 }}>
        Tu nombre
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Escribí tu nombre"
        placeholderTextColor="#777"
        style={{
          borderBottomWidth: 1,
          borderBottomColor: '#e8d5a3',
          color: '#fff',
          width: '100%',
          marginBottom: 30,
          padding: 10
        }}
      />

      <TouchableOpacity
        onPress={() => router.push({ pathname: '/passportcover', params: { name } })}
        style={{ backgroundColor: '#e8d5a3', padding: 15, borderRadius: 5 }}
      >
        <Text style={{ color: '#0a0a0a' }}>Continuar</Text>
      </TouchableOpacity>

    </View>
  );
}