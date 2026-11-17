import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius, spacing } from './src/theme/tokens';

const quickLinks = [
  { title: 'Isbitaallada', detail: 'Raadi xarumaha caafimaadka' },
  { title: 'Adeegyada', detail: 'Eeg adeegyada la heli karo' },
  { title: 'Khariidadda', detail: 'Goobaha iyo adeegyada' },
];

export default function App() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoHeart}>♥</Text>
          </View>
          <Text style={styles.brand}>Gurmad</Text>
          <Text style={styles.tagline}>Gargaar degdeg ah, meel kasta.</Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Nooca tijaabada</Text>
          <Text style={styles.noticeText}>
            Adeegyada gurmadka hadda waa jilitaan. App-kan looma adeegsan karo
            xaalad degdeg ah oo dhab ah.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Adeegyada GURMAD 24</Text>
        {quickLinks.map((item) => (
          <View key={item.title} style={styles.card}>
            <View style={styles.cardIcon}>
              <Text style={styles.cardDot}>●</Text>
            </View>
            <View style={styles.cardCopy}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetail}>{item.detail}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        ))}
        <Text style={styles.footer}>
          GURMAD 24 · Tijaabo hay'adeed · Gaalkacyo
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  header: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.xl },
  logoMark: {
    width: 76, height: 76, borderRadius: 24, backgroundColor: colors.paleBlue,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  logoHeart: { color: colors.green, fontSize: 42, fontWeight: '800' },
  brand: { color: colors.navy, fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: colors.muted, fontSize: 15, marginTop: spacing.xs },
  notice: {
    backgroundColor: '#FFF8E8', borderColor: '#F2D9A6', borderWidth: 1,
    borderRadius: radius.card, padding: spacing.md, marginBottom: spacing.xl,
  },
  noticeTitle: { color: '#805B13', fontWeight: '800', marginBottom: spacing.xs },
  noticeText: { color: '#6B571F', lineHeight: 21 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: spacing.md },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderColor: colors.border, borderWidth: 1, borderRadius: radius.card,
    padding: spacing.md, marginBottom: spacing.md,
  },
  cardIcon: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: colors.paleBlue,
    alignItems: 'center', justifyContent: 'center',
  },
  cardDot: { color: colors.green, fontSize: 18 },
  cardCopy: { flex: 1, marginLeft: spacing.md },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  cardDetail: { color: colors.muted, marginTop: 3, fontSize: 13 },
  chevron: { color: colors.navy, fontSize: 28, paddingLeft: spacing.sm },
  footer: { color: colors.muted, textAlign: 'center', fontSize: 12, marginTop: spacing.xl },
});
