import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Alert } from 'react-native';

// Screens
import Home from './src/screens/Home';
import Recording from './src/screens/Recording';
import Transcript from './src/screens/Transcript';
import Summary from './src/screens/Summary';

// Services
import StorageService from './src/services/StorageService';
import STTService from './src/services/STTService';
import LLMService from './src/services/LLMService';
import PrinterService from './src/services/PrinterService';

const Stack = createNativeStackNavigator();

const App = () => {
  useEffect(() => {
    initializeServices();
  }, []);

  const initializeServices = async () => {
    try {
      // Initialize database
      await StorageService.initialize();
      console.log('✅ Database initialized');

      // Initialize Printer service
      await PrinterService.initialize();
      console.log('✅ Printer service initialized');

      // Note: STT and LLM services are initialized lazily when first needed
      // This is because model loading can be slow and should only happen when required

    } catch (error) {
      console.error('Service initialization error:', error);
      Alert.alert(
        'Initialization Error',
        'Some services failed to initialize. The app may not work correctly.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Recording" component={Recording} />
        <Stack.Screen name="Transcript" component={Transcript} />
        <Stack.Screen name="Summary" component={Summary} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
