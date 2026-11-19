import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  description: string;
  steps?: string[];
  actions?: string[];
};

export function InfoMenu({ title, description, steps = [], actions = [] }: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Faahfaahin dheeraad ah: ${title}`}
        onPress={() => setVisible(true)}
        hitSlop={10}
        style={styles.trigger}
      >
        <Text style={styles.dots}>⋮</Text>
      </Pressable>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} accessibilityLabel="Xir faahfaahinta" />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headingCopy}>
                <Text style={styles.kicker}>GURMAD 24 · FAHFAAHIN</Text>
                <Text style={styles.title}>{title}</Text>
              </View>
              <Pressable onPress={() => setVisible(false)} accessibilityRole="button" accessibilityLabel="Xir">
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>WAA MAXAY?</Text>
              <Text style={styles.body}>{description}</Text>
              {steps.length > 0 ? <>
                <Text style={styles.label}>SIDA LOO ISTICMAALO</Text>
                {steps.map((step, index) => <View style={styles.row} key={index}><Text style={styles.number}>{index + 1}</Text><Text style={styles.rowText}>{step}</Text></View>)}
              </> : null}
              {actions.length > 0 ? <>
                <Text style={styles.label}>WAXA LAGA QABAN KARO</Text>
                {actions.map((action, index) => <View style={styles.actionRow} key={index}><Text style={styles.check}>✓</Text><Text style={styles.rowText}>{action}</Text></View>)}
              </> : null}
            </ScrollView>
            <Pressable style={styles.done} onPress={() => setVisible(false)} accessibilityRole="button">
              <Text style={styles.doneText}>Waan fahmay</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center' },
  dots: { color: '#183653', fontSize: 23, lineHeight: 26, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: 'rgba(5, 18, 34, 0.58)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '82%', backgroundColor: '#FFFFFF', borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  handle: { width: 42, height: 4, borderRadius: 4, backgroundColor: '#D6DEE7', alignSelf: 'center', marginBottom: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  headingCopy: { flex: 1, paddingRight: 12 },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1, color: '#19864B', marginBottom: 6 },
  title: { color: '#102A43', fontSize: 21, lineHeight: 27, fontWeight: '900' },
  close: { color: '#526579', fontSize: 29, lineHeight: 31, paddingHorizontal: 4 },
  label: { color: '#718096', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 17, marginBottom: 8 },
  body: { color: '#263B50', fontSize: 13, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 11 },
  number: { width: 23, height: 23, borderRadius: 8, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', backgroundColor: '#E8F3ED', color: '#167342', fontSize: 11, fontWeight: '900', marginRight: 10 },
  rowText: { flex: 1, color: '#263B50', fontSize: 12, lineHeight: 19 },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 9 },
  check: { color: '#16834A', fontSize: 14, fontWeight: '900', marginRight: 10 },
  done: { backgroundColor: '#102A43', borderRadius: 13, paddingVertical: 14, alignItems: 'center', marginTop: 18 },
  doneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});
