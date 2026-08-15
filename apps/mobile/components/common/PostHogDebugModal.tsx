import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { captureFrontendException } from '../../lib/posthog';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function PostHogDebugModal({ visible, onClose }: Props) {
  const posthog = usePostHog();
  const [shouldCrash, setShouldCrash] = useState(false);

  if (shouldCrash) {
    throw new Error('Simulated React Error Boundary render crash for PostHog verification');
  }

  const handleManualException = () => {
    try {
      throw new Error('Test manual JS exception captured by PostHog mobile SDK');
    } catch (err) {
      captureFrontendException(err, {
        component: 'PostHogDebugModal',
        action: 'handleManualException',
        extra: { manualTrigger: true, timestamp: new Date().toISOString() },
      });
      alert('Manual exception dispatched to PostHog!');
    }
  };

  const handleTrackCustomEvent = () => {
    if (posthog) {
      posthog.capture('posthog_debug_test_event', {
        test_category: 'telemetry_verification',
        timestamp: new Date().toISOString(),
      });
      alert('Custom telemetry event tracked in PostHog!');
    } else {
      alert('PostHog instance not initialized (missing API key or disabled).');
    }
  };

  const handleTestRenderCrash = () => {
    setShouldCrash(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>🦔 PostHog Telemetry & Debug</Text>
          <Text style={styles.subtitle}>
            Test frontend error tracking, session replays, and custom events.
          </Text>

          <ScrollView style={styles.content}>
            <TouchableOpacity style={styles.cardButton} onPress={handleManualException}>
              <Text style={styles.cardTitle}>⚡ Capture JS Exception</Text>
              <Text style={styles.cardDesc}>
                Triggers a handled try-catch error sent to PostHog.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cardButton} onPress={handleTrackCustomEvent}>
              <Text style={styles.cardTitle}>📊 Dispatch Test Event</Text>
              <Text style={styles.cardDesc}>
                Tracks a custom event to test PostHog event pipeline.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cardButton, styles.dangerCard]}
              onPress={handleTestRenderCrash}
            >
              <Text style={[styles.cardTitle, styles.dangerText]}>💥 Trigger React Crash</Text>
              <Text style={styles.cardDesc}>
                Triggers component render failure caught by ErrorBoundary.
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close Debugger</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  content: {
    marginVertical: 8,
  },
  cardButton: {
    backgroundColor: '#334155',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  dangerCard: {
    backgroundColor: '#451A1A',
    borderColor: '#7F1D1D',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#38BDF8',
    marginBottom: 4,
  },
  dangerText: {
    color: '#F87171',
  },
  cardDesc: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: '#475569',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
