/*
 * Song library for Piano Lessons.
 *
 * Each song is a sequence of steps. A step is either:
 *   { note: "C4", beats: 1 }   -> play one note for `beats` beats
 *   { rest: true, beats: 1 }   -> silence for `beats` beats
 *
 * Note names use scientific pitch notation (C4 = middle C).
 * `tempo` is in beats per minute.
 */

const SONG_LIBRARY = [
  {
    id: "beginner",
    name: "Beginner Basics",
    icon: "🌱",
    songs: [
      {
        id: "twinkle",
        title: "Twinkle Twinkle Little Star",
        difficulty: "Easy",
        tempo: 108,
        steps: notes(
          ["C4", "C4", "G4", "G4", "A4", "A4", "G4", 2],
          ["F4", "F4", "E4", "E4", "D4", "D4", "C4", 2],
          ["G4", "G4", "F4", "F4", "E4", "E4", "D4", 2],
          ["G4", "G4", "F4", "F4", "E4", "E4", "D4", 2],
          ["C4", "C4", "G4", "G4", "A4", "A4", "G4", 2],
          ["F4", "F4", "E4", "E4", "D4", "D4", "C4", 2]
        ),
      },
      {
        id: "mary",
        title: "Mary Had a Little Lamb",
        difficulty: "Easy",
        tempo: 112,
        steps: notes(
          ["E4", "D4", "C4", "D4", "E4", "E4", "E4", 2],
          ["D4", "D4", "D4", 2, "E4", "G4", "G4", 2],
          ["E4", "D4", "C4", "D4", "E4", "E4", "E4", "E4"],
          ["D4", "D4", "E4", "D4", "C4", 4]
        ),
      },
      {
        id: "hotcross",
        title: "Hot Cross Buns",
        difficulty: "Easy",
        tempo: 100,
        steps: notes(
          ["E4", "D4", "C4", 2],
          ["E4", "D4", "C4", 2],
          ["C4", "C4", "C4", "C4", "D4", "D4", "D4", "D4"],
          ["E4", "D4", "C4", 2]
        ),
      },
    ],
  },
  {
    id: "classical",
    name: "Classical",
    icon: "🎻",
    songs: [
      {
        id: "ode",
        title: "Ode to Joy",
        difficulty: "Medium",
        tempo: 120,
        steps: notes(
          ["E4", "E4", "F4", "G4", "G4", "F4", "E4", "D4"],
          ["C4", "C4", "D4", "E4", "E4", 1.5, "D4", 0.5, "D4", 2],
          ["E4", "E4", "F4", "G4", "G4", "F4", "E4", "D4"],
          ["C4", "C4", "D4", "E4", "D4", 1.5, "C4", 0.5, "C4", 2]
        ),
      },
      {
        id: "furelise",
        title: "Für Elise (Theme)",
        difficulty: "Hard",
        tempo: 90,
        steps: notes(
          ["E5", 0.5, "D#5", 0.5, "E5", 0.5, "D#5", 0.5, "E5", 0.5, "B4", 0.5, "D5", 0.5, "C5", 0.5],
          ["A4", 1, "C4", 0.5, "E4", 0.5, "A4", 0.5, "B4", 1],
          ["E4", 0.5, "G#4", 0.5, "B4", 0.5, "C5", 1]
        ),
      },
      {
        id: "canon",
        title: "Canon in D (Motif)",
        difficulty: "Medium",
        tempo: 100,
        steps: notes(
          ["F#5", "E5", "D5", "C#5", "B4", "A4", "B4", "C#5"],
          ["D5", "C#5", "B4", "A4", "G4", "F#4", "G4", "E4"]
        ),
      },
    ],
  },
  {
    id: "holiday",
    name: "Holiday",
    icon: "🎄",
    songs: [
      {
        id: "jingle",
        title: "Jingle Bells",
        difficulty: "Easy",
        tempo: 120,
        steps: notes(
          ["E4", "E4", "E4", 2],
          ["E4", "E4", "E4", 2],
          ["E4", "G4", "C4", "D4", "E4", 4],
          ["F4", "F4", "F4", 1.5, "F4", 0.5, "F4", "E4", "E4", "E4", 0.5, "E4", 0.5],
          ["E4", "D4", "D4", "E4", "D4", 2, "G4", 2]
        ),
      },
      {
        id: "joytoworld",
        title: "Joy to the World",
        difficulty: "Medium",
        tempo: 112,
        steps: notes(
          ["C5", 1.5, "B4", 0.5, "A4", 1, "G4", 1.5, "F4", 0.5],
          ["E4", 1, "D4", 1, "C4", 2, "G4", 1.5, "A4", 0.5],
          ["B4", 1.5, "B4", 0.5, "C5", 2]
        ),
      },
    ],
  },
  {
    id: "pop",
    name: "Pop & Fun",
    icon: "🎤",
    songs: [
      {
        id: "happybirthday",
        title: "Happy Birthday",
        difficulty: "Easy",
        tempo: 120,
        steps: notes(
          ["C4", 0.75, "C4", 0.25, "D4", 1, "C4", 1, "F4", 1, "E4", 2],
          ["C4", 0.75, "C4", 0.25, "D4", 1, "C4", 1, "G4", 1, "F4", 2],
          ["C4", 0.75, "C4", 0.25, "C5", 1, "A4", 1, "F4", 1, "E4", 1, "D4", 2],
          ["A#4", 0.75, "A#4", 0.25, "A4", 1, "F4", 1, "G4", 1, "F4", 2]
        ),
      },
      {
        id: "scale",
        title: "C Major Scale",
        difficulty: "Easy",
        tempo: 100,
        steps: notes(
          ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5"],
          ["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"]
        ),
      },
      {
        id: "allofme",
        title: "All of Me (John Legend)",
        difficulty: "Medium",
        tempo: 63,
        steps: notes(
          ["C4", 1, "E4", 1, "F4", 1, "G4", 1],
          ["A4", 1.5, "G4", 0.5, "F4", 1, "E4", 1],
          ["D4", 1, "E4", 1, "F4", 1, "D4", 1],
          ["C4", 4]
        ),
      },
      {
        id: "marryyou",
        title: "Marry You (Bruno Mars)",
        difficulty: "Easy",
        tempo: 95,
        steps: notes(
          ["G4", 0.5, "G4", 0.5, "A4", 0.5, "G4", 0.5, "E4", 1, "D4", 1],
          ["G4", 0.5, "G4", 0.5, "A4", 0.5, "G4", 0.5, "E4", 1, "D4", 1],
          ["C4", 1, "D4", 1, "E4", 1, "G4", 2]
        ),
      },
      {
        id: "faded",
        title: "Faded (Alan Walker)",
        difficulty: "Medium",
        tempo: 90,
        steps: notes(
          ["E4", 0.5, "G4", 0.5, "A4", 1, "E4", 0.5, "G4", 0.5, "A4", 1],
          ["E4", 0.5, "G4", 0.5, "A4", 1, "B4", 0.5, "A4", 0.5, "G4", 1],
          ["E4", 0.5, "D4", 0.5, "C4", 1, "D4", 1, "E4", 2]
        ),
      },
    ],
  },
];

/*
 * Helper that turns compact rows into step objects.
 * A row is a flat list of note names and optional numeric durations.
 * A number immediately following a note sets that note's duration (in beats);
 * notes without a trailing number default to 1 beat.
 * e.g. notes(["C4", "G4", 2, "E4"]) -> C4(1 beat), G4(2 beats), E4(1 beat)
 */
function notes(...rows) {
  const out = [];
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const token = row[i];
      if (typeof token === "string") {
        let beats = 1;
        if (typeof row[i + 1] === "number") {
          beats = row[i + 1];
          i++;
        }
        out.push({ note: token, beats });
      }
    }
  }
  return out;
}
