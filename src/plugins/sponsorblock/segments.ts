// Segments are an array [ [start, end], … ]
import type { SortableSegment } from './types';

export const sortSegments = (segments: SortableSegment[]) => {
  segments.sort((segment1, segment2) =>
    segment1.segment[0] === segment2.segment[0]
      ? segment1.segment[1] - segment2.segment[1]
      : segment1.segment[0] - segment2.segment[0],
  );

  const compiledSegments: SortableSegment[] = [];
  let currentSegment: SortableSegment | undefined;

  for (const segment of segments) {
    if (!currentSegment) {
      currentSegment = segment;
      continue;
    }

    // Check if the segments overlap or are adjacent AND belong to the same category
    if (
      currentSegment.segment[1] >= segment.segment[0] && // Overlapping or adjacent
      currentSegment.category === segment.category // Same category
    ) {
      // Merge the segments
      currentSegment.segment[1] = Math.max(
        currentSegment.segment[1],
        segment.segment[1]
      );
    } else {
      // Push the current segment and start a new one
      compiledSegments.push(currentSegment);
      currentSegment = segment;
    }
  }

  // Push the last segment if it exists
  if (currentSegment) {
    compiledSegments.push(currentSegment);
  }

  return compiledSegments;
};