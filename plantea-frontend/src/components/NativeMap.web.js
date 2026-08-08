import React, { useEffect } from 'react';
import { View } from 'react-native';

export const Marker = ({ coordinate, title, description, children }) => {
  return null; // Handled by MapView children parsing if we were doing custom leaflet parsing
};

export const Polyline = ({ coordinates }) => {
  return null;
};

// Extremely basic OpenStreetMap rendering via Leaflet for Expo Web
// Warning: This is a hacky polyfill since true native react-native-maps doesn't support web easily without Google Maps keys
export default function MapView({ children, style, initialRegion, region }) {
  const position = region || initialRegion || { latitude: 31.5204, longitude: 74.3587 }; // Default Lahore

  return (
    <View style={[style, { overflow: 'hidden' }]}>
      <iframe
        width="100%"
        height="100%"
        frameBorder="0"
        scrolling="no"
        marginHeight="0"
        marginWidth="0"
        src={`https://www.openstreetmap.org/export/embed.html?bbox=${position.longitude - 0.05}%2C${position.latitude - 0.05}%2C${position.longitude + 0.05}%2C${position.latitude + 0.05}&layer=mapnik&marker=${position.latitude}%2C${position.longitude}`}
        style={{ border: 0 }}
      />
    </View>
  );
}
