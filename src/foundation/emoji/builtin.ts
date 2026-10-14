import type { EmojiCategory, EmojiData, EmojiRecord } from './types.js';

// Compact English subset: per category, entries "emoji|name|keywords|version" joined by ";".
// Keywords are space separated; a missing version is Emoji 1.0.
const TABLE: readonly (readonly [id: string, label: string, entries: string])[] = [
  [
    'smileys-emotion',
    'Smileys & emotion',
    '😀|grinning face|smile happy;😃|grinning face with big eyes|smile;😄|grinning face with smiling eyes|smile;😁|beaming face with smiling eyes|grin;😆|grinning squinting face|laugh;😅|grinning face with sweat|relief;🤣|rolling on the floor laughing|lol|3;😂|face with tears of joy|lol laugh;🙂|slightly smiling face|smile;🙃|upside-down face|silly;😉|winking face|wink;😊|smiling face with smiling eyes|blush;😇|smiling face with halo|angel;🥰|smiling face with hearts|love|11;😍|smiling face with heart-eyes|love;🤩|star-struck|wow|5;😘|face blowing a kiss|kiss;😋|face savoring food|yum;😜|winking face with tongue|silly;🤪|zany face|crazy|5;🤗|smiling face with open hands|hug;🤭|face with hand over mouth|oops|5;🤫|shushing face|quiet|5;🤔|thinking face|hmm;🤐|zipper-mouth face|secret;😐|neutral face|meh;😏|smirking face|smirk;😒|unamused face|meh;🙄|face with rolling eyes|eyeroll;😬|grimacing face|awkward;😌|relieved face|calm;😔|pensive face|sad;😴|sleeping face|zzz;😷|face with medical mask|sick;🥵|hot face|heat|11;🥶|cold face|freezing|11;🤯|exploding head|shocked|5;🥳|partying face|party|11;😎|smiling face with sunglasses|cool;🤓|nerd face|geek;🥺|pleading face|please|11;😢|crying face|sad tear;😭|loudly crying face|sob;😱|face screaming in fear|scared;😡|enraged face|angry;🥲|smiling face with tear|grateful|13;🫠|melting face|melt|14;💀|skull|dead;💩|pile of poo|poop;🤡|clown face|clown|3;👻|ghost|boo;👽|alien|ufo;🤖|robot|bot;😺|grinning cat|cat;❤️|red heart|love;🧡|orange heart|love|5;💛|yellow heart|love;💚|green heart|love;💙|blue heart|love;💜|purple heart|love;🖤|black heart|love|3;💔|broken heart|sad;💯|hundred points|score;💥|collision|boom;💬|speech balloon|chat',
  ],
  [
    'people-body',
    'People & body',
    '👋|waving hand|hello bye;✋|raised hand|stop;🖖|vulcan salute|spock;👌|ok hand|okay;🤌|pinched fingers|italian|13;✌️|victory hand|peace;🤞|crossed fingers|luck|3;🤟|love-you gesture|ily|5;🤘|sign of the horns|rock;🤙|call me hand|call|3;👈|backhand index pointing left|left;👉|backhand index pointing right|right;👆|backhand index pointing up|up;👇|backhand index pointing down|down;👍|thumbs up|yes like;👎|thumbs down|no dislike;✊|raised fist|power;👊|oncoming fist|punch;👏|clapping hands|applause;🙌|raising hands|hooray;🫶|heart hands|love|14;🤝|handshake|deal|3;🙏|folded hands|please thanks;✍️|writing hand|write;💪|flexed biceps|strong;👀|eyes|look;👶|baby|child;🧑|person|adult|5;🧓|older person|elder|5;🙋|person raising hand|question;🤷|person shrugging|shrug|3;🤦|person facepalming|facepalm|3',
  ],
  [
    'animals-nature',
    'Animals & nature',
    '🐶|dog face|puppy;🐱|cat face|kitten;🐭|mouse face|mouse;🐰|rabbit face|bunny;🦊|fox|fox|3;🐻|bear|bear;🐼|panda|panda;🐨|koala|koala;🐯|tiger face|tiger;🦁|lion|lion;🐮|cow face|cow;🐷|pig face|pig;🐸|frog|frog;🐵|monkey face|monkey;🐧|penguin|bird;🦉|owl|bird|3;🐝|honeybee|bee;🦋|butterfly|insect|3;🐢|turtle|slow;🐙|octopus|sea;🐬|dolphin|sea;🐳|spouting whale|sea;🌸|cherry blossom|flower;🌻|sunflower|flower;🌲|evergreen tree|tree;🌵|cactus|desert;🍀|four leaf clover|luck;🍁|maple leaf|autumn;🍄|mushroom|fungus',
  ],
  [
    'food-drink',
    'Food & drink',
    '🍎|red apple|fruit;🍐|pear|fruit;🍊|tangerine|orange;🍋|lemon|sour;🍌|banana|fruit;🍉|watermelon|fruit;🍇|grapes|fruit;🍓|strawberry|berry;🍒|cherries|fruit;🍑|peach|fruit;🥭|mango|fruit|11;🍍|pineapple|fruit;🥑|avocado|fruit|3;🍅|tomato|vegetable;🥕|carrot|vegetable|3;🌽|ear of corn|maize;🌶️|hot pepper|spicy;🥦|broccoli|vegetable|5;🍞|bread|loaf;🧀|cheese wedge|cheese;🍔|hamburger|burger;🍟|french fries|chips;🍕|pizza|slice;🌮|taco|mexican;🍣|sushi|japanese;🍜|steaming bowl|noodles ramen;🍦|soft ice cream|dessert;🍩|doughnut|donut;🍪|cookie|dessert;🎂|birthday cake|cake;🍫|chocolate bar|sweet;☕|hot beverage|coffee tea;🍺|beer mug|beer;🍷|wine glass|wine;🥂|clinking glasses|cheers|3',
  ],
  [
    'travel-places',
    'Travel & places',
    '🚗|automobile|car;🚕|taxi|cab;🚌|bus|transit;🚲|bicycle|bike;🚂|locomotive|train;✈️|airplane|flight;🚀|rocket|launch;🛸|flying saucer|ufo|5;🚢|ship|boat;🏠|house|home;🏢|office building|work;🏰|castle|palace;🏖️|beach with umbrella|beach;🏝️|desert island|island;🌍|globe showing Europe-Africa|earth world;🌙|crescent moon|night;☀️|sun|sunny;⭐|star|night;🌈|rainbow|weather;☁️|cloud|weather;⚡|high voltage|lightning;❄️|snowflake|cold;🔥|fire|flame hot;💧|droplet|water;🌊|water wave|ocean',
  ],
  [
    'activities',
    'Activities',
    '⚽|soccer ball|football;🏀|basketball|ball;🏈|american football|ball;⚾|baseball|ball;🎾|tennis|ball;🏓|ping pong|table tennis|3;🏆|trophy|win;🥇|1st place medal|gold|3;🎮|video game|gaming;🎲|game die|dice;🧩|puzzle piece|jigsaw|11;🎯|bullseye|target;🎨|artist palette|art;🎉|party popper|tada celebrate;🎈|balloon|party;🎁|wrapped gift|present;🎄|Christmas tree|holiday;🎃|jack-o-lantern|halloween;✨|sparkles|shiny',
  ],
  [
    'objects',
    'Objects',
    '👓|glasses|eyewear;👕|t-shirt|shirt;👟|running shoe|sneaker;👑|crown|king queen;🎒|backpack|school;💍|ring|wedding;📱|mobile phone|phone;💻|laptop|computer;⌨️|keyboard|computer;📷|camera|photo;🎧|headphone|music;🎵|musical note|music;📚|books|read;✏️|pencil|write;📌|pushpin|pin;📎|paperclip|attach;🔒|locked|lock;🔑|key|unlock;🔨|hammer|tool;💡|light bulb|idea;🔔|bell|notification;📅|calendar|date;💰|money bag|cash;🧲|magnet|attract|11;⏰|alarm clock|time',
  ],
  [
    'symbols',
    'Symbols',
    '✅|check mark button|done yes;❌|cross mark|no;❗|red exclamation mark|important;❓|red question mark|question;⚠️|warning|caution;🚫|prohibited|forbidden;♻️|recycling symbol|recycle;➕|plus|add;➖|minus|subtract;✔️|check mark|done;🔴|red circle|red;🟢|green circle|green|12;🔵|blue circle|blue;⬆️|up arrow|up;⬇️|down arrow|down;➡️|right arrow|right;⬅️|left arrow|left;🔁|repeat button|loop;▶️|play button|play;⏸️|pause button|pause;🆗|OK button|okay;🆕|NEW button|new',
  ],
  [
    'flags',
    'Flags',
    '🏁|chequered flag|finish race;🚩|triangular flag|flag;🏳️|white flag|surrender;🏴|black flag|flag;🏳️‍🌈|rainbow flag|pride|4;🏴‍☠️|pirate flag|pirate|11;🇺🇳|flag: United Nations|un|4',
  ],
];

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
// Pairs of regional indicators are country flags.
const COUNTRY_FLAG = /^[\u{1F1E6}-\u{1F1FF}]{2}$/u;

let parsed: EmojiData | undefined;

/** The built-in English dataset: a small selection of common emoji in every standard group. */
export function builtinEmojiData(): EmojiData {
  if (parsed) return parsed;
  const categories: EmojiCategory[] = [];
  const emojis: EmojiRecord[] = [];
  for (const [id, label, entries] of TABLE) {
    categories.push({ id, label });
    for (const entry of entries.split(';')) {
      const [emoji = '', name = '', keywords = '', version] = entry.split('|');
      emojis.push({
        emoji,
        label: capitalize(name),
        keywords: keywords ? keywords.split(' ') : [],
        category: id,
        version: version ? Number(version) : 1,
        ...(COUNTRY_FLAG.test(emoji) ? { flag: true } : {}),
      });
    }
  }
  return (parsed = { locale: 'en', categories, emojis });
}
