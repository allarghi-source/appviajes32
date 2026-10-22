import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Encabezado de la hoja que se abre al tocar un pin. Lo usan el mapa propio
// (app/mapa.tsx) y el mapa de otra persona (OtherWorldMap): solo presenta
// ciudad, país y el botón de cerrar; cada vista conserva su propia lógica.
// `children` va centrado debajo del país (p. ej. "restablecer posición").

const CLOSE_SIZE = 28;
const SIDE_PADDING = 16;
// Reserva el mismo ancho a ambos lados para que el texto quede centrado
// respecto de la tarjeta y nunca pase por debajo del botón de cerrar.
const TEXT_INSET = SIDE_PADDING + CLOSE_SIZE + 8;

type Props = {
  city: string;
  country: string;
  onClose: () => void;
  children?: ReactNode;
};

export default function PinSheetHeader({ city, country, onClose, children }: Props) {
  return (
    <View style={styles.header}>
      <Text style={styles.city} numberOfLines={3}>{city}</Text>
      {!!country && <Text style={styles.country} numberOfLines={2}>{country}</Text>}
      {children}
      <TouchableOpacity
        style={styles.closeBtn}
        onPress={onClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingHorizontal: TEXT_INSET,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(212,175,55,0.12)',
  },
  // iOS: SF Pro Rounded (fuente del sistema, ya usada en Fonts.rounded).
  // Android: Roboto en su peso más grueso; ninguna requiere cargar archivos.
  city: {
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
    fontSize: 23,
    lineHeight: 28,
    fontWeight: '800',
    color: '#e8e0d0',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  country: {
    fontFamily: Platform.OS === 'ios' ? 'ui-rounded' : undefined,
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '600',
    color: '#7f8ea0',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginTop: 3,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: SIDE_PADDING,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    borderRadius: CLOSE_SIZE / 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 12,
    color: '#6b7a8d',
    fontWeight: '700',
  },
});
