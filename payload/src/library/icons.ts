// Curated folder icon set: moods, genres, activities, places, seasons. Lucide (ISC), normalised to the 'line' pack
// look: 24 viewBox, currentColor stroke, width 1.75, round caps/joins. Ids are stored in ArtworkStyle.icon, so never
// rename one; add new ids instead.
import {
  AudioLines, Baby, Bed, Bike, BookOpen, Brain, Briefcase, Cake, Car, Clapperboard, CloudRain, Coffee, Crown, Disc3,
  Drum, Dumbbell, Feather, Flame, Flower2, Footprints, Gamepad2, Gem, Ghost, Globe, Guitar, Headphones, Heart, Laptop,
  Leaf, MicVocal, Moon, Mountain, Music, PartyPopper, Piano, Plane, Radio, Rocket, Skull, Smile, Snowflake, Sparkles,
  Star, Sun, Tent, TreePalm, Waves, Wine, Zap,
} from 'lucide-static'

export interface ArtworkIcon {
  id: string
  label: string
  svg: string
}

/** Lucide's raw markup → compact, class-free, stroke 1.75. */
export function normaliseIcon(svg: string): string {
  return svg
    .replace(/\s*class="[^"]*"/, '')
    .replace(/stroke-width="[^"]*"/, 'stroke-width="1.75"')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s*\/>/g, '/>')
    .replace(/\s+>/g, '>')
    .replace(/>\s+</g, '><')
    .trim()
}

const SOURCE: [id: string, label: string, svg: string][] = [
  // Music
  ['headphones', 'Headphones', Headphones],
  ['music', 'Note', Music],
  ['disc', 'Vinyl', Disc3],
  ['mic', 'Vocals', MicVocal],
  ['guitar', 'Guitar', Guitar],
  ['piano', 'Piano', Piano],
  ['drum', 'Drums', Drum],
  ['radio', 'Radio', Radio],
  ['waveform', 'Waveform', AudioLines],
  // Moods
  ['heart', 'Love', Heart],
  ['star', 'Favourites', Star],
  ['flame', 'Hot', Flame],
  ['zap', 'Energy', Zap],
  ['sparkles', 'Magic', Sparkles],
  ['smile', 'Happy', Smile],
  ['party', 'Party', PartyPopper],
  ['crown', 'Royalty', Crown],
  ['gem', 'Gems', Gem],
  ['ghost', 'Spooky', Ghost],
  ['skull', 'Heavy', Skull],
  ['brain', 'Focus', Brain],
  ['feather', 'Soft', Feather],
  // Time & weather
  ['sun', 'Sunny', Sun],
  ['moon', 'Night', Moon],
  ['rain', 'Rainy', CloudRain],
  ['snow', 'Winter', Snowflake],
  ['leaf', 'Autumn', Leaf],
  ['flower', 'Spring', Flower2],
  // Places
  ['waves', 'Sea', Waves],
  ['mountain', 'Mountains', Mountain],
  ['palm', 'Holiday', TreePalm],
  ['tent', 'Camping', Tent],
  ['globe', 'World', Globe],
  // Activities
  ['coffee', 'Coffee', Coffee],
  ['workout', 'Workout', Dumbbell],
  ['run', 'Running', Footprints],
  ['bike', 'Cycling', Bike],
  ['car', 'Driving', Car],
  ['plane', 'Travel', Plane],
  ['work', 'Work', Briefcase],
  ['code', 'Coding', Laptop],
  ['study', 'Study', BookOpen],
  ['game', 'Gaming', Gamepad2],
  ['film', 'Soundtracks', Clapperboard],
  ['sleep', 'Sleep', Bed],
  ['kids', 'Kids', Baby],
  ['wine', 'Dinner', Wine],
  ['cake', 'Celebration', Cake],
  ['rocket', 'Launch', Rocket],
]

export const ARTWORK_ICONS: ArtworkIcon[] = SOURCE.map(([id, label, svg]) => ({ id, label, svg: normaliseIcon(svg) }))

const BY_ID = new Map(ARTWORK_ICONS.map(icon => [icon.id, icon.svg]))

export function artworkIconSvg(id: string): string | undefined {
  return BY_ID.get(id)
}
