import React from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../context/ThemeContext';

// Shared screen wrapper: respects safe-area insets, backs every screen with
// the theme's background color, and is keyboard-aware for forms. Scrollable
// by default; pass scroll={false} for screens that manage their own
// scrolling (e.g. a FlatList-based list screen).
export default function ScreenContainer({
  children,
  scroll = true,
  padded = true,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
}) {
  const { colors, spacing } = useThemeColors();
  const insets = useSafeAreaInsets();

  const content = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          padding: padded ? spacing.md : 0,
          paddingBottom: padded ? spacing.xxl : 0,
        },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1, padding: padded ? spacing.md : 0 }, contentContainerStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top > 0 ? 0 : spacing.sm }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      {content}
    </KeyboardAvoidingView>
  );
}
