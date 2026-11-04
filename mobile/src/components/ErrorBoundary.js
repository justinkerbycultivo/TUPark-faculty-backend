import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// Catches render-time errors in the subtree so a bad API response or a
// drawing error shows a recoverable message instead of closing the app.
// It does not fix the underlying bug: the message is shown so it can be
// reported, and the error is logged for debugging.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Screen error:', error, info?.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#F7F5F6' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#201C1E', marginBottom: 8 }}>
          {this.props.title || 'Something went wrong'}
        </Text>
        <Text style={{ fontSize: 13, color: '#6B6468', textAlign: 'center', marginBottom: 16 }}>
          This screen hit an unexpected error. You can try again or go back.
        </Text>
        <Text selectable style={{ fontSize: 11, color: '#C62828', textAlign: 'center', marginBottom: 20 }}>
          {String(this.state.error?.message || this.state.error)}
        </Text>
        <TouchableOpacity
          onPress={this.reset}
          accessibilityRole="button"
          style={{ backgroundColor: '#8B1538', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 12 }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

export function withErrorBoundary(Component, title) {
  function Wrapped(props) {
    return (
      <ErrorBoundary title={title}>
        <Component {...props} />
      </ErrorBoundary>
    );
  }
  Wrapped.displayName = `WithBoundary(${Component.displayName || Component.name || 'Screen'})`;
  return Wrapped;
}
