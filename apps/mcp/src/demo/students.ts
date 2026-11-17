import type { Day, Slot } from './schedule.js'
import {
  FAKBARS,
  LIBRARIES,
  RESTAURANTS,
  type MapArea,
  type PlaceKind,
} from './world.js'

const cls = (
  day: Day,
  start: string,
  end: string,
  title: string,
  room: string,
  teacher?: string
): Slot => ({ day, start, end, title, room, teacher, kind: 'class' })

const busy = (day: Day, start: string, end: string, title: string): Slot => ({
  day,
  start,
  end,
  title,
  kind: 'busy',
})

export type Gender = 'woman' | 'man' | 'non-binary'

export type DemoStudent = {
  id: string
  firstName: string
  age: number
  gender: Gender
  lookingFor: string
  programme: string
  year: string
  courses: string[]
  timetable: Slot[]
  favouriteDishes: string[]
  /** Dietary choice, if any. */
  diet?: 'vegetarian' | 'vegan'
  favouriteRestaurantId: string
  favouriteLibraryId: string
  favouriteFakbarId?: string
  usualSpot: { kind: PlaceKind; id: string }
  interests: string[]
  bio: string
  icebreaker: string
  vibe: string
  funFacts: {
    coffeeOrder: string
    examSnack: string
    hotTake: string
    greenFlag: string
    karaokeSong: string
  }
  mutualFriends: number
  /** What they answer to an invite. `{when}` and `{where}` are filled in. */
  reply: string
}

/**
 * The logged-in student in our fictional world. Their lessons are written into
 * `fixtures/MySchedule.json` by `scripts/fake-schedule.ts`, so `get_my_schedule`
 * and the matching tools see the same timetable.
 */
export const demoMe = {
  programme: 'Computer Science',
  year: 'Master 1',
  area: 'arenberg' as MapArea,
  areaLabel: 'Arenberg',
  courses: [
    'Databases',
    'Software Engineering',
    'Operating Systems',
    'Algorithms and Data Structures',
    'Computer Networks',
  ],
  favouriteDishes: [
    'Tiramisu',
    'Greek bowl with pasta',
    'Creamy tomato soup (B)',
  ],
  favouriteRestaurantId: '6',
  favouriteLibraryId: '2',
  interests: ['board games', 'running', 'live music', 'cooking'],
  timetable: [
    cls(
      1,
      '10:30',
      '12:30',
      'Databases',
      'Arenberg 200A 00.02',
      'Prof. Vandenberghe'
    ),
    cls(
      1,
      '14:00',
      '16:00',
      'Software Engineering',
      'Arenberg 200N 00.08',
      'Prof. Claes'
    ),
    cls(
      2,
      '08:30',
      '10:30',
      'Algorithms and Data Structures',
      'Arenberg 200A 01.12',
      'Prof. Maes'
    ),
    cls(
      2,
      '13:00',
      '15:00',
      'Databases',
      'Arenberg 200A 00.02',
      'Prof. Vandenberghe'
    ),
    cls(
      3,
      '10:30',
      '12:30',
      'Operating Systems',
      'Arenberg 200B 00.05',
      'Prof. Peeters'
    ),
    cls(
      3,
      '15:00',
      '17:00',
      'Computer Networks',
      'Arenberg 200A 00.04',
      'Prof. Jacobs'
    ),
    cls(
      4,
      '14:00',
      '17:00',
      'Software Engineering',
      'Arenberg 200N 00.08',
      'Prof. Claes'
    ),
    cls(
      5,
      '09:00',
      '11:00',
      'Computer Networks',
      'Arenberg 200A 00.04',
      'Prof. Jacobs'
    ),
  ] satisfies Slot[],
}

export const students: DemoStudent[] = [
  {
    id: 'lotte',
    firstName: 'Lotte',
    age: 21,
    gender: 'woman',
    lookingFor: 'something real, slowly',
    programme: 'Computer Science',
    year: 'Master 1',
    courses: [
      'Databases',
      'Software Engineering',
      'Computer Networks',
      'Cryptography',
    ],
    timetable: [
      cls(1, '10:30', '12:30', 'Databases', 'Arenberg 200A 00.02'),
      cls(1, '14:00', '16:00', 'Software Engineering', 'Arenberg 200N 00.08'),
      cls(2, '09:00', '11:00', 'Cryptography', 'Arenberg 200A 01.12'),
      cls(2, '13:00', '15:00', 'Databases', 'Arenberg 200A 00.02'),
      cls(3, '15:00', '17:00', 'Computer Networks', 'Arenberg 200A 00.04'),
      cls(4, '10:00', '12:00', 'Cryptography', 'Arenberg 200A 01.12'),
      busy(3, '19:00', '21:00', 'Bouldering'),
      busy(6, '10:00', '13:00', 'Shift at the board game café'),
    ],
    favouriteDishes: ['Tiramisu', 'Greek bowl with pasta'],
    favouriteRestaurantId: '6',
    favouriteLibraryId: '2',
    favouriteFakbarId: 'bernoulli',
    usualSpot: { kind: 'library', id: '2' },
    interests: ['climbing', 'board games', 'cooking'],
    bio: 'Spends weekends on the boulder wall and loses at Catan on purpose.',
    icebreaker: 'Settle it: does pineapple belong on lasagne?',
    vibe: 'napping on a beanbag in 2Bergen',
    funFacts: {
      coffeeOrder: 'Oat flat white, extra foam',
      examSnack: 'Gummy bears sorted by colour',
      hotTake: 'Spaghetti is just a very long soup',
      greenFlag: 'Returns library books before the deadline',
      karaokeSong: 'Dancing Queen',
    },
    mutualFriends: 3,
    reply:
      "Haha yes!! {when} at {where} works for me. I'll bring a deck of cards 🃏",
  },
  {
    id: 'mathias',
    firstName: 'Mathias',
    age: 21,
    gender: 'man',
    lookingFor: 'a gym buddy who also likes pasta',
    programme: 'Computer Science',
    year: 'Bachelor 3',
    courses: [
      'Algorithms and Data Structures',
      'Operating Systems',
      'Databases',
    ],
    timetable: [
      cls(1, '10:30', '12:30', 'Databases', 'Arenberg 200A 00.02'),
      cls(
        2,
        '08:30',
        '10:30',
        'Algorithms and Data Structures',
        'Arenberg 200A 01.12'
      ),
      cls(3, '10:30', '12:30', 'Operating Systems', 'Arenberg 200B 00.05'),
      cls(
        4,
        '08:30',
        '10:30',
        'Algorithms and Data Structures',
        'Arenberg 200A 01.12'
      ),
      busy(4, '19:00', '21:00', 'Five-a-side football'),
    ],
    favouriteDishes: ['Spaghetti bolognese', 'Tiramisu'],
    favouriteRestaurantId: '5',
    favouriteLibraryId: '8',
    favouriteFakbarId: 'bernoulli',
    usualSpot: { kind: 'restaurant', id: '5' },
    interests: ['football', 'cooking', 'travel'],
    bio: 'Five-a-side on Thursdays, pasta on Fridays, bug fixes never.',
    icebreaker: 'Quick: best Alma dish, and no cheating with dessert.',
    vibe: 'queueing at Alma 3 with a very full tray',
    funFacts: {
      coffeeOrder: 'Double espresso, no sugar, zero personality',
      examSnack: 'Cold pasta in a tupperware',
      hotTake: 'Tabs are fine and so is the 8:30 lecture',
      greenFlag: 'Always carries a spare charger',
      karaokeSong: 'Mr. Brightside',
    },
    mutualFriends: 5,
    reply: '{when} at {where}? Deal. First round of tiramisu is on me.',
  },
  {
    id: 'camille',
    firstName: 'Camille',
    age: 22,
    gender: 'woman',
    lookingFor: 'a plus-one for concerts',
    programme: 'Electronics-ICT (Engineering Technology)',
    year: 'Bachelor 3',
    courses: [
      'Operating Systems',
      'Embedded Systems',
      'Algorithms and Data Structures',
      'Statistics',
    ],
    timetable: [
      cls(1, '08:30', '10:30', 'Embedded Systems', 'Groep T 0.01'),
      cls(
        2,
        '08:30',
        '10:30',
        'Algorithms and Data Structures',
        'Groep T 1.12'
      ),
      cls(3, '10:30', '12:30', 'Operating Systems', 'Groep T 0.07'),
      cls(4, '13:00', '15:00', 'Statistics', 'Groep T 0.03'),
      cls(5, '09:00', '11:00', 'Embedded Systems', 'Groep T 0.01'),
      busy(2, '18:00', '20:00', 'Running club'),
    ],
    favouriteDishes: ['Bowl caesar salad', 'Creamy tomato soup (B)'],
    favouriteRestaurantId: '3',
    favouriteLibraryId: '22',
    favouriteFakbarId: 'bernoulli',
    usualSpot: { kind: 'restaurant', id: '3' },
    interests: ['running', 'photography', 'live music'],
    bio: 'Debugging by day, concert photographer by night.',
    icebreaker: 'What was the last gig where you lost your voice?',
    vibe: 'photographing the soup',
    funFacts: {
      coffeeOrder: 'Cappuccino, but make it a personality',
      examSnack: 'Dark chocolate and spite',
      hotTake: 'Earplugs are a green flag',
      greenFlag: 'Knows every opening act by name',
      karaokeSong: 'Valerie',
    },
    mutualFriends: 2,
    reply:
      'Ooh {when} at {where}, yes. I will probably bring my camera, sorry in advance.',
  },
  {
    id: 'noor',
    firstName: 'Noor',
    age: 20,
    gender: 'woman',
    lookingFor: 'new friends first, who knows after',
    programme: 'Psychology',
    year: 'Bachelor 2',
    courses: [
      'Cognitive Psychology',
      'Statistics',
      'Research Methods',
      'Developmental Psychology',
    ],
    timetable: [
      cls(1, '09:00', '11:00', 'Cognitive Psychology', 'Dekenstraat 2.01'),
      cls(2, '10:30', '12:30', 'Statistics', 'Dekenstraat 1.04'),
      cls(3, '13:00', '15:00', 'Research Methods', 'Dekenstraat 2.01'),
      cls(4, '09:00', '11:00', 'Developmental Psychology', 'Dekenstraat 2.03'),
      cls(5, '10:00', '12:00', 'Statistics', 'Dekenstraat 1.04'),
      busy(1, '18:00', '19:30', 'Yoga'),
    ],
    favouriteDishes: ['Vegan raspberry crumble', 'Bowl falafel'],
    diet: 'vegan',
    favouriteRestaurantId: '4',
    favouriteLibraryId: '26',
    usualSpot: { kind: 'library', id: '26' },
    interests: ['yoga', 'cooking', 'travel'],
    bio: 'Always has a new recipe to try and a train ticket to somewhere.',
    icebreaker: 'If you could live in any city for a year, which one?',
    vibe: 'the only person in the whole library',
    funFacts: {
      coffeeOrder: 'Chai latte, extra cinnamon',
      examSnack: 'Dates stuffed with peanut butter',
      hotTake: 'Raisins belong in nothing, ever',
      greenFlag: 'Reads the whole menu before ordering',
      karaokeSong: 'Rolling in the Deep',
    },
    mutualFriends: 4,
    reply:
      '{when} at {where} sounds lovely. I will bring snacks that are vegan, you are welcome.',
  },
  {
    id: 'femke',
    firstName: 'Femke',
    age: 23,
    gender: 'woman',
    lookingFor: 'someone who argues politely',
    programme: 'Law',
    year: 'Master 1',
    courses: ['Criminal Law', 'European Law', 'Legal Philosophy'],
    timetable: [
      cls(1, '14:00', '16:00', 'European Law', 'Tiensestraat 41 A'),
      cls(2, '10:00', '12:00', 'Criminal Law', 'Tiensestraat 41 B'),
      cls(3, '14:00', '16:00', 'Legal Philosophy', 'Tiensestraat 41 A'),
      cls(4, '09:00', '11:00', 'European Law', 'Tiensestraat 41 A'),
      cls(5, '10:00', '12:00', 'Criminal Law', 'Tiensestraat 41 B'),
      busy(2, '19:30', '21:30', 'Theatre rehearsal'),
    ],
    favouriteDishes: [
      'Chocolate mousse tart',
      'Chicken stew with salad and french fries',
    ],
    favouriteRestaurantId: '1',
    favouriteLibraryId: '27',
    favouriteFakbarId: 'lex',
    usualSpot: { kind: 'restaurant', id: '1' },
    interests: ['board games', 'theatre', 'running'],
    bio: 'Studies law, argues about film endings for fun.',
    icebreaker: 'Defend your worst movie opinion. You have two minutes.',
    vibe: 'highlighting the whole page again',
    funFacts: {
      coffeeOrder: 'Black filter coffee, thermos refilled twice',
      examSnack: 'Clementines and legal pads',
      hotTake: 'Die Hard is a Christmas movie, case closed',
      greenFlag: 'Always reads the terms and conditions',
      karaokeSong: 'Bohemian Rhapsody',
    },
    mutualFriends: 1,
    reply:
      'I accept your invitation: {when} at {where}. Objections will be overruled.',
  },
  {
    id: 'jules',
    firstName: 'Jules',
    age: 22,
    gender: 'non-binary',
    lookingFor: 'good company, no labels',
    programme: 'Business Economics',
    year: 'Bachelor 3',
    courses: ['Microeconomics', 'Statistics', 'Corporate Finance', 'Marketing'],
    timetable: [
      cls(1, '08:30', '10:30', 'Microeconomics', 'Naamsestraat 69 1.01'),
      cls(2, '13:00', '15:00', 'Corporate Finance', 'Naamsestraat 69 0.12'),
      cls(3, '08:30', '10:30', 'Marketing', 'Naamsestraat 69 1.01'),
      cls(4, '10:30', '12:30', 'Statistics', 'Naamsestraat 69 0.04'),
      cls(5, '13:00', '15:00', 'Microeconomics', 'Naamsestraat 69 1.01'),
      busy(3, '19:00', '21:00', 'Open mic rehearsal'),
    ],
    favouriteDishes: ['Classic carrot cake', 'Bowl with penne and mozzarella'],
    favouriteRestaurantId: '2',
    favouriteLibraryId: '19',
    favouriteFakbarId: 'kapitaal',
    usualSpot: { kind: 'fakbar', id: 'kapitaal' },
    interests: ['live music', 'photography', 'climbing'],
    bio: 'Sketches buildings on napkins and knows every cheap concert in town.',
    icebreaker: 'Name one song you are ashamed to love.',
    vibe: 'DJ-ing the Alma queue in their head',
    funFacts: {
      coffeeOrder: 'Iced americano, even in December',
      examSnack: 'Carrot cake, obviously',
      hotTake: 'Pineapple on pizza is a personality test, and you pass',
      greenFlag: 'Texts back within the hour',
      karaokeSong: 'Africa',
    },
    mutualFriends: 6,
    reply: 'Yes! {when}, {where}. I will make a playlist for the walk there.',
  },
  {
    id: 'elias',
    firstName: 'Elias',
    age: 24,
    gender: 'man',
    lookingFor: 'deep talks over cheap soup',
    programme: 'Philosophy',
    year: 'Master 2',
    courses: ['Ethics', 'Logic', 'Philosophy of Mind'],
    timetable: [
      cls(1, '16:00', '18:00', 'Ethics', 'Kardinaal Mercierplein 2 A'),
      cls(2, '10:00', '12:00', 'Logic', 'Kardinaal Mercierplein 2 B'),
      cls(
        4,
        '14:00',
        '16:00',
        'Philosophy of Mind',
        'Kardinaal Mercierplein 2 A'
      ),
      busy(3, '12:00', '14:00', 'Chess club'),
    ],
    favouriteDishes: ['Cinnamon swirl', 'Creamy tomato soup (B)'],
    favouriteRestaurantId: '4',
    favouriteLibraryId: '21',
    favouriteFakbarId: 'cogito',
    usualSpot: { kind: 'library', id: '21' },
    interests: ['chess', 'hiking', 'cooking'],
    bio: 'Quotes Kant at breakfast and loses at chess to first-years.',
    icebreaker: 'Is a hot dog a sandwich? Show your work.',
    vibe: 'staring thoughtfully at a cinnamon swirl',
    funFacts: {
      coffeeOrder: 'Lungo, drunk slowly and philosophically',
      examSnack: 'Almonds and existential dread',
      hotTake: 'Free will is overrated, the Alma queue proves it',
      greenFlag: 'Listens more than he talks',
      karaokeSong: 'Hallelujah',
    },
    mutualFriends: 2,
    reply: '{when} at {where}. Bring a theory, I will bring the chess set.',
  },
  {
    id: 'amira',
    firstName: 'Amira',
    age: 22,
    gender: 'woman',
    lookingFor: 'adventures that fit between lab sessions',
    programme: 'Biomedical Sciences',
    year: 'Bachelor 3',
    courses: ['Anatomy', 'Biochemistry', 'Physiology'],
    timetable: [
      cls(1, '08:30', '12:30', 'Anatomy', 'Gasthuisberg ON1 lab'),
      cls(2, '13:00', '17:00', 'Biochemistry', 'Gasthuisberg ON2 lab'),
      cls(3, '09:00', '11:00', 'Physiology', 'Gasthuisberg ON1 0.04'),
      cls(5, '08:30', '10:30', 'Anatomy', 'Gasthuisberg ON1 lab'),
      busy(4, '19:00', '21:00', 'Salsa class'),
    ],
    favouriteDishes: ['Bowl falafel', 'Fresh Liege waffle'],
    favouriteRestaurantId: '8',
    favouriteLibraryId: '22',
    favouriteFakbarId: 'pipet',
    usualSpot: { kind: 'restaurant', id: '8' },
    interests: ['dancing', 'hiking', 'cooking'],
    bio: 'Knows every bone by name and every salsa step by heart.',
    icebreaker: 'Which bone would you say is the funniest?',
    vibe: 'waffle break, lab coat still on',
    funFacts: {
      coffeeOrder: 'Cortado, taken standing up',
      examSnack: 'Pistachios and a banana',
      hotTake: 'The humerus is not funny, but it is fine',
      greenFlag: 'Brings a spare pen to every exam',
      karaokeSong: 'Hips Don’t Lie',
    },
    mutualFriends: 0,
    reply: 'Okay, {when} at {where}! I will not bring a skeleton. Probably.',
  },
  {
    id: 'thomas',
    firstName: 'Thomas',
    age: 25,
    gender: 'man',
    lookingFor: 'a cycling partner and a coffee partner',
    programme: 'Mechanical Engineering',
    year: 'Master 1',
    courses: ['Thermodynamics', 'Control Systems', 'Statistics'],
    timetable: [
      cls(1, '10:00', '12:00', 'Thermodynamics', 'Arenberg 200D 01.02'),
      cls(2, '13:00', '15:00', 'Control Systems', 'Arenberg 200D 00.05'),
      cls(4, '10:30', '12:30', 'Statistics', 'Arenberg 200B 00.10'),
      cls(5, '13:00', '16:00', 'Thermodynamics', 'Arenberg 200D 01.02'),
      busy(3, '17:30', '19:30', 'Group ride'),
    ],
    favouriteDishes: ['Mini beignets', 'Bowl melon and bacon'],
    favouriteRestaurantId: '7',
    favouriteLibraryId: '2',
    favouriteFakbarId: 'bernoulli',
    usualSpot: { kind: 'fakbar', id: 'bernoulli' },
    interests: ['cycling', 'climbing', 'photography'],
    bio: 'Will explain heat transfer to you whether you ask or not.',
    icebreaker: 'Flat or hilly: pick a side.',
    vibe: 'adjusting his saddle again',
    funFacts: {
      coffeeOrder: 'Flat white and a second flat white',
      examSnack: 'Energy gels, but ironically',
      hotTake: 'Headwinds build character',
      greenFlag: 'Always has a spare inner tube',
      karaokeSong: 'Bicycle Race',
    },
    mutualFriends: 2,
    reply:
      '{when} at {where}. I will arrive early, with a ridiculous amount of tyre pressure.',
  },
  {
    id: 'sofia',
    firstName: 'Sofia',
    age: 21,
    gender: 'woman',
    lookingFor: 'a language exchange, romance optional',
    programme: 'Linguistics',
    year: 'Bachelor 3',
    courses: ['Linguistics', 'Literary Theory', 'Italian'],
    timetable: [
      cls(1, '13:00', '15:00', 'Literary Theory', 'Erasmushuis 02.10'),
      cls(2, '09:00', '11:00', 'Italian', 'Erasmushuis 01.04'),
      cls(3, '09:00', '11:00', 'Linguistics', 'Erasmushuis 02.10'),
      cls(5, '09:00', '11:00', 'Italian', 'Erasmushuis 01.04'),
      busy(2, '19:00', '21:00', 'Theatre workshop'),
    ],
    favouriteDishes: ['Chocolate mousse tart', 'Cinnamon swirl'],
    favouriteRestaurantId: '1',
    favouriteLibraryId: '13',
    usualSpot: { kind: 'library', id: '13' },
    interests: ['theatre', 'travel', 'live music'],
    bio: 'Will correct your grammar lovingly and swear in four languages.',
    icebreaker: 'Teach me one word in your favourite language.',
    vibe: 'reading a very thick novel on a very small chair',
    funFacts: {
      coffeeOrder: 'Caffè latte, any language',
      examSnack: 'Biscotti, dunked with commitment',
      hotTake: 'Subtitles are better than dubbing',
      greenFlag: 'Keeps a notebook of new words',
      karaokeSong: 'Volare',
    },
    mutualFriends: 3,
    reply: 'Sì, {when} at {where}! Bring a new word to teach me.',
  },
  {
    id: 'yara',
    firstName: 'Yara',
    age: 20,
    gender: 'woman',
    lookingFor: 'a study buddy who becomes a friend',
    programme: 'Mathematics',
    year: 'Bachelor 3',
    courses: ['Linear Algebra', 'Algorithms and Data Structures', 'Statistics'],
    timetable: [
      cls(1, '09:00', '11:00', 'Linear Algebra', 'Arenberg 200B 00.02'),
      cls(
        2,
        '08:30',
        '10:30',
        'Algorithms and Data Structures',
        'Arenberg 200A 01.12'
      ),
      cls(3, '13:00', '15:00', 'Statistics', 'Arenberg 200B 00.10'),
      cls(4, '10:30', '12:30', 'Linear Algebra', 'Arenberg 200B 00.02'),
      busy(5, '14:00', '16:00', 'Chess club'),
    ],
    favouriteDishes: ['Greek bowl with pasta', 'Tiramisu'],
    favouriteRestaurantId: '7',
    favouriteLibraryId: '2',
    usualSpot: { kind: 'library', id: '2' },
    interests: ['chess', 'running', 'board games'],
    bio: 'Counts everything. Seats in the library, steps to the Alma, your pizza slices.',
    icebreaker: 'Pick a number between 1 and 10 (it will be 7).',
    vibe: 'proving something on a whiteboard in 2Bergen',
    funFacts: {
      coffeeOrder: 'Tea, in a mug that says "Proof by coffee"',
      examSnack: 'Rice cakes and pure logic',
      hotTake: 'Nine is the most underrated number',
      greenFlag: 'Never says "it is obvious"',
      karaokeSong: 'Pi (Kate Bush)',
    },
    mutualFriends: 2,
    reply: '{when} at {where}: scheduled. I even put it in two calendars.',
  },
  {
    id: 'daan',
    firstName: 'Daan',
    age: 23,
    gender: 'man',
    lookingFor: 'someone to debate me and then forgive me',
    programme: 'Political Science',
    year: 'Bachelor 3',
    courses: ['Political Theory', 'Statistics', 'Sociology'],
    timetable: [
      cls(1, '14:00', '16:00', 'Political Theory', 'Parkstraat 45 0.02'),
      cls(2, '10:30', '12:30', 'Sociology', 'Parkstraat 45 1.01'),
      cls(4, '10:30', '12:30', 'Statistics', 'Naamsestraat 69 0.04'),
      cls(5, '09:00', '11:00', 'Political Theory', 'Parkstraat 45 0.02'),
      busy(3, '20:00', '22:00', 'Debate society'),
    ],
    favouriteDishes: ['Spaghetti bolognese', 'Classic carrot cake'],
    favouriteRestaurantId: '2',
    favouriteLibraryId: '28',
    favouriteFakbarId: 'kapitaal',
    usualSpot: { kind: 'fakbar', id: 'kapitaal' },
    interests: ['football', 'live music', 'debating'],
    bio: 'Has opinions about everything, including this bio.',
    icebreaker: 'Pineapple, lasagne, politics: pick one to fight about.',
    vibe: 'winning an argument nobody started',
    funFacts: {
      coffeeOrder: 'Cortado with strong opinions',
      examSnack: 'Peanuts and the front page',
      hotTake: 'The best seat in the lecture hall is the third row',
      greenFlag: 'Says sorry first',
      karaokeSong: 'Livin’ on a Prayer',
    },
    mutualFriends: 4,
    reply:
      '{when} at {where}. Prepare your arguments, I will prepare mine and a lot of grace.',
  },
]

export const findStudent = (query: string): DemoStudent | undefined => {
  const wanted = query.trim().toLowerCase()
  return students.find(
    student =>
      student.id === wanted || student.firstName.toLowerCase() === wanted
  )
}

export type Place = {
  name: string
  kind: PlaceKind
  area: MapArea
}

export const placeOf = (spot: { kind: PlaceKind; id: string }): Place => {
  if (spot.kind === 'restaurant') {
    const restaurant = RESTAURANTS[spot.id]
    return {
      name: restaurant?.name ?? 'Alma',
      kind: 'restaurant',
      area: restaurant?.area ?? 'centrum',
    }
  }
  if (spot.kind === 'library') {
    const library = LIBRARIES[spot.id]
    return {
      name: library?.name ?? 'the library',
      kind: 'library',
      area: library?.area ?? 'centrum',
    }
  }
  const bar = FAKBARS.find(candidate => candidate.id === spot.id)
  return {
    name: bar?.name ?? 'a fakbar',
    kind: 'fakbar',
    area: bar?.area ?? 'centrum',
  }
}
