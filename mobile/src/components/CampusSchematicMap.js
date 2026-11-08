import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/Typography';
import Svg, { Line, Circle, Text as SvgText } from 'react-native-svg';
import { useThemeColors } from '../context/ThemeContext';

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;
const PADDING = 28;

// Draws a simple schematic (NOT GPS-accurate) layout of the route's nodes,
// positioned by their arbitrary backend x/y, connected by lines in route
// order. The origin is marked "You are here" and the destination is marked
// distinctly. This is illustrative guidance only.
export default function CampusSchematicMap({ steps = [] }) {
  const { colors, spacing, radius, fontSizes } = useThemeColors();

  // Only draw nodes with finite coordinates; NaN/undefined values make
  // react-native-svg throw on Android. Incomplete route data = no map, not a crash.
  const drawable = Array.isArray(steps)
    ? steps.filter((s) => s && s.node && Number.isFinite(s.node.x) && Number.isFinite(s.node.y))
    : [];
  if (drawable.length < 2) return null;
  steps = drawable;

  const xs = steps.map((s) => s.node.x);
  const ys = steps.map((s) => s.node.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);

  function project(x, y) {
    const px = PADDING + ((x - minX) / spanX) * (CANVAS_WIDTH - PADDING * 2);
    const py = PADDING + ((y - minY) / spanY) * (CANVAS_HEIGHT - PADDING * 2);
    return { px, py };
  }

  const points = steps.map((s) => ({ ...project(s.node.x, s.node.y), step: s }));

  return (
    <View
      style={{
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.sm,
        alignItems: 'center',
      }}
    >
      <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
        {points.slice(1).map((pt, i) => (
          <Line
            key={`line-${i}`}
            x1={points[i].px}
            y1={points[i].py}
            x2={pt.px}
            y2={pt.py}
            stroke={colors.primary}
            strokeWidth={3}
          />
        ))}

        {points.map((pt, i) => {
          const isFirst = i === 0;
          const isLast = i === points.length - 1;
          const fill = isLast ? colors.mine : isFirst ? colors.navy : colors.accentGold;
          return (
            <React.Fragment key={`node-${i}`}>
              <Circle cx={pt.px} cy={pt.py} r={isFirst || isLast ? 8 : 5} fill={fill} stroke={colors.surface} strokeWidth={2} />
              <SvgText
                x={pt.px}
                y={pt.py - 12}
                fontSize="9"
                fill={colors.text}
                textAnchor="middle"
                fontWeight={isFirst || isLast ? 'bold' : 'normal'}
              >
                {isFirst ? 'Start' : isLast ? String(pt.step.node.label || 'Destination') : ' '}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, marginTop: spacing.xs, textAlign: 'center' }}>
        Schematic layout for guidance only — not an exact campus map.
      </Text>
    </View>
  );
}
