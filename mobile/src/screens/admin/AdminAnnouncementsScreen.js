import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '../../components/ui/Typography';
import { useThemeColors } from '../../context/ThemeContext';
import { getAnnouncements, createAnnouncement, getAreas } from '../../api/api';
import { extractErrorMessage } from '../../utils/validators';
import ScreenContainer from '../../components/ScreenContainer';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import SectionHeading from '../../components/ui/SectionHeading';
import EmptyState from '../../components/ui/EmptyState';

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminAnnouncementsScreen() {
  const { colors, spacing, radius, fontSizes, fontWeights } = useThemeColors();

  const [areas, setAreas] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [areaId, setAreaId] = useState(null);
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [requiredAction, setRequiredAction] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [areaList, announcementList] = await Promise.all([getAreas(), getAnnouncements()]);
      setAreas(areaList);
      setAnnouncements(announcementList);
      setAreaId((prev) => prev || areaList[0]?._id || null);
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not load announcements.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function validate() {
    const next = {};
    if (!title.trim()) next.title = 'Title is required.';
    if (!areaId) next.areaId = 'Select an area.';
    if (!reason.trim()) next.reason = 'Reason is required.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleCreate() {
    setFormError('');
    setSuccessMessage('');
    if (!validate()) return;
    setSaving(true);
    try {
      await createAnnouncement({
        title: title.trim(),
        area: areaId,
        reason: reason.trim(),
        requiredAction: requiredAction.trim(),
      });
      setTitle('');
      setReason('');
      setRequiredAction('');
      setSuccessMessage('Announcement posted.');
      await load();
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Could not post this announcement.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer>
      <SectionHeading title="Post an Announcement" subtitle="Notify everyone currently parked in an area" />

      {!!formError && (
        <View style={{ backgroundColor: colors.errorBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
          <Text style={{ color: colors.error, fontSize: fontSizes.sm }}>{formError}</Text>
        </View>
      )}
      {!!successMessage && (
        <View style={{ backgroundColor: colors.successBg, borderRadius: radius.md, padding: spacing.sm, marginBottom: spacing.md }}>
          <Text style={{ color: colors.success, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold }}>{successMessage}</Text>
        </View>
      )}

      <Card style={{ marginBottom: spacing.lg }}>
        <Input label="Title" value={title} onChangeText={setTitle} placeholder="Scheduled maintenance" error={errors.title} />

        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, marginBottom: spacing.xs }}>
          Affected Area
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: spacing.md }}>
          {areas.map((area) => {
            const selected = area._id === areaId;
            return (
              <TouchableOpacity
                key={area._id}
                onPress={() => setAreaId(area._id)}
                style={{
                  margin: 4,
                  paddingVertical: spacing.xs,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                }}
              >
                <Text style={{ color: selected ? colors.primary : colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.medium }}>
                  {area.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        {!!errors.areaId && (
          <Text style={{ color: colors.error, fontSize: fontSizes.xs, marginTop: -spacing.sm, marginBottom: spacing.sm }}>{errors.areaId}</Text>
        )}

        <Input label="Reason" value={reason} onChangeText={setReason} placeholder="Why this announcement is being posted" multiline error={errors.reason} />
        <Input label="Required Action (optional)" value={requiredAction} onChangeText={setRequiredAction} placeholder="e.g. Move your vehicle by 5PM" multiline />

        <Button title="Post Announcement" onPress={handleCreate} loading={saving} />
      </Card>

      <SectionHeading title="Posted Announcements" />
      {announcements.length === 0 ? (
        <Card>
          <EmptyState icon="bullhorn-outline" title="No announcements yet" />
        </Card>
      ) : (
        announcements.map((a) => (
          <Card key={a._id} style={{ marginBottom: spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: fontWeights.bold, flex: 1 }}>{a.title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{formatDate(a.createdAt)}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: fontSizes.xs, fontWeight: fontWeights.semibold, marginTop: 2 }}>
              {a.area?.name}
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSizes.sm, marginTop: spacing.xs }}>{a.reason}</Text>
            {!!a.affectedPlateNumbers?.length && (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.xs }}>
                Notified {a.affectedPlateNumbers.length} vehicle(s)
              </Text>
            )}
          </Card>
        ))
      )}
    </ScreenContainer>
  );
}
