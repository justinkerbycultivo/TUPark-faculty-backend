import React, { useState, useCallback } from 'react';
import { View, Modal, TouchableOpacity, Switch, Alert } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useThemeColors } from '../../context/ThemeContext';
import { getAreas, createArea, updateArea, deleteArea } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusBadge from '../../components/ui/StatusBadge';
import SectionHeading from '../../components/ui/SectionHeading';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const emptyForm = { name: '', code: '', location: '', capacity: '', isActive: true };

export default function ParkingAreasScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();

  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingArea, setEditingArea] = useState(null); // null = creating
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAreas();
      setAreas(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load parking areas.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function openCreate() {
    setEditingArea(null);
    setForm(emptyForm);
    setFormError('');
    setModalVisible(true);
  }

  function openEdit(area) {
    setEditingArea(area);
    setForm({
      name: area.name,
      code: area.code,
      location: area.location || '',
      capacity: String(area.capacity),
      isActive: area.isActive,
    });
    setFormError('');
    setModalVisible(true);
  }

  async function handleSave() {
    setFormError('');
    if (!form.name.trim() || !form.code.trim() || !form.capacity) {
      setFormError('Name, code, and capacity are required.');
      return;
    }
    const capacityNum = Number(form.capacity);
    if (Number.isNaN(capacityNum) || capacityNum < 0) {
      setFormError('Capacity must be a non-negative number.');
      return;
    }

    setSaving(true);
    try {
      if (editingArea) {
        await updateArea(editingArea._id, {
          name: form.name.trim(),
          location: form.location.trim(),
          capacity: capacityNum,
          isActive: form.isActive,
        });
      } else {
        await createArea({
          name: form.name.trim(),
          code: form.code.trim(),
          location: form.location.trim(),
          capacity: capacityNum,
        });
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not save this parking area.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(area) {
    try {
      await updateArea(area._id, { isActive: !area.isActive });
      await load();
    } catch (err) {
      Alert.alert('Could not update', extractErrorMessage(err, 'Please try again.'));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteArea(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      Alert.alert('Could not delete', extractErrorMessage(err, 'Please try again.'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState message="Loading parking areas..." />;

  return (
    <ScreenContainer>
      <SectionHeading
        title="Parking Areas"
        subtitle={`${areas.length} area(s)`}
        right={
          <TouchableOpacity onPress={openCreate} accessibilityLabel="Add parking area">
            <MaterialCommunityIcons name="plus-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {!!error && (
        <Card style={{ backgroundColor: colors.errorBg, borderColor: colors.errorBg, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{error}</Text>
        </Card>
      )}

      {areas.length === 0 ? (
        <EmptyState icon="office-building-outline" title="No parking areas yet" message="Tap + to create one." />
      ) : (
        areas.map((area) => (
          <Card key={area._id} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: fontWeights.bold }}>
                  {area.name} ({area.code})
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 }}>
                  {area.location || 'No location set'}
                </Text>
                <Text style={{ color: colors.text, fontSize: fontSizes.sm, marginTop: spacing.xs }}>
                  {area.occupied}/{area.capacity} occupied · {area.remaining} remaining
                </Text>
              </View>
              <StatusBadge label={area.isActive ? 'Active' : 'Inactive'} tone={area.isActive ? 'success' : 'neutral'} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => openEdit(area)} style={{ marginRight: spacing.md }}>
                  <Text style={{ color: colors.primary, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDeleteTarget(area)}>
                  <Text style={{ color: colors.error, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>Delete</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginRight: spacing.xs }}>Active</Text>
                <Switch
                  value={area.isActive}
                  onValueChange={() => handleToggleActive(area)}
                  trackColor={{ false: colors.grayLight, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </Card>
        ))
      )}

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete this parking area?"
        message={deleteTarget ? `This permanently deletes "${deleteTarget.name}" and all of its spaces.` : ''}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />

      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <ScreenContainer>
          <Text style={{ color: colors.text, fontSize: fontSizes.xl, fontWeight: fontWeights.bold, marginBottom: spacing.md }}>
            {editingArea ? 'Edit Parking Area' : 'New Parking Area'}
          </Text>

          {!!formError && (
            <View style={{ backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
              <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{formError}</Text>
            </View>
          )}

          <Input label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Main Gate Lot" />
          <Input
            label="Code"
            value={form.code}
            onChangeText={(v) => setForm((f) => ({ ...f, code: v }))}
            placeholder="MGL"
            autoCapitalize="characters"
            editable={!editingArea}
          />
          <Input label="Location (optional)" value={form.location} onChangeText={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Beside the main gate" />
          <Input
            label="Capacity (motorcycle-equivalent slots)"
            value={form.capacity}
            onChangeText={(v) => setForm((f) => ({ ...f, capacity: v.replace(/[^0-9]/g, '') }))}
            placeholder="50"
            keyboardType="number-pad"
          />

          {editingArea && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, flex: 1 }}>Active</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                trackColor={{ false: colors.grayLight, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          )}

          <Button title="Save" onPress={handleSave} loading={saving} />
          <Button title="Cancel" variant="ghost" onPress={() => setModalVisible(false)} style={{ marginTop: spacing.sm }} />
        </ScreenContainer>
      </Modal>
    </ScreenContainer>
  );
}
