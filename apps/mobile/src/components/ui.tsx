import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '../lib/theme';

export function Button({
  label,
  onPress,
  busy,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.button, styles[variant], (pressed || off) && styles.pressed]}
    >
      {busy ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.accent : '#fff'} />
      ) : (
        <Text style={[styles.buttonText, variant === 'secondary' && { color: colors.accent }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.ink3}
        accessibilityLabel={label}
        {...input}
        style={[styles.input, input.multiline && styles.multiline, !!error && styles.inputError]}
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export function Banner({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'info' }) {
  return (
    <View accessibilityRole="alert" style={[styles.banner, tone === 'info' && styles.bannerInfo]}>
      <Text style={[styles.bannerText, tone === 'info' && { color: colors.accent }]}>{children}</Text>
    </View>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ now: percent, min: 0, max: 100 }}>
      <View style={[styles.fill, { width: `${percent}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 46 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.accentSoft },
  danger: { backgroundColor: colors.danger },
  pressed: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    color: colors.ink,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  error: { fontSize: 12.5, color: colors.danger },
  banner: { backgroundColor: colors.dangerSoft, borderRadius: 10, padding: 12 },
  bannerInfo: { backgroundColor: colors.accentSoft },
  bannerText: { color: colors.danger, fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.ok },
});
