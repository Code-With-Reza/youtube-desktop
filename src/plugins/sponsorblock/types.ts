export type Segment = [number, number];

export interface SortableSegment {
  segment: Segment;
  category: string;
}

export interface SkipSegment extends SortableSegment {
  // Array of this object
  UUID: string;
  videoDuration: number; // Duration of video when submission occurred (to be used to determine when a submission is out of date). 0 when unknown. +- 1 second
  actionType: string; // [3]
  locked: number; // if submission is locked
  votes: number; // Votes on segment
  description: string; // title for chapters, empty string for other segments
}

export type SponsorBlockPluginConfig = {
  enabled: boolean;
  apiURL: string;
  categories: (
    | 'sponsor'
    | 'intro'
    | 'outro'
    | 'interaction'
    | 'selfpromo'
    | 'music_offtopic'
  )[];
};
