'use client';
import { useState, useRef, useEffect } from 'react';
import { Smile, Search } from 'lucide-react';

const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😌', '😔', '😑', '😐', '😶', '🤐', '😏', '😒', '🙁', '😲', '☹️', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  people: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🤜', '🤛', '👂', '👃', '🧠', '🦷', '🦴', '🫀', '🫁', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '👋🏻', '👋🏼', '👋🏽', '👋🏾', '👋🏿'],
  objects: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🥅', '🛼', '🛹', '🛷', '⛸️', '🥌', '🎣', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚴', '🚵', '🎯', '🪀', '🪃', '🎪', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🎲', '🧩', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🏪', '🏫', '🏬', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '💈', '💳', '💰', '💴', '💵', '💶', '💷', '💸', '💹', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📊', '📈', '📉', '📇', '📓', '📴', '📕', '📖', '📗', '📘', '📙', '📚', '📒', '📝', '📞', '📟', '📠', '🎥', '🎞️', '📽️', '🎬', '📺', '📷', '📸', '📹', '🎥', '📼', '🔍', '🔎', '🕯️', '💡', '🔦', '🏮', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📓', '📒', '📏', '📐', '📈', '📉', '📊', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🧷', '🪡', '🧵', '🧶', '🎀', '🎁', '🎈', '🎏', '🎎', '🏆', '🏅', '🥇', '🥈', '🥉', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔', '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥯', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🥓', '🥔', '🍖', '🍗', '🥩', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪', '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧', '🍨', '🍦', '🍰', '🎂', '🧁', '🍮', '🍭', '🍬', '🍫', '🍿', '🍩', '🍪', '🌰', '🍯', '🥛', '🍼', '☕', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋', '🧃', '🧉'],
  animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🏔️', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🧒', '👦', '👧', '👨', '👩', '👴', '👵', '👶', '👼', '🧒', '🎄', '🎃', '⭐', '🌟', '✨', '🔔', '🔕', '🎄', '🎅', '🤶', '🎁', '🎂', '🎈', '🎉', '🎊', '🎀', '🎏', '🎎', '🏆', '🏅', '🥇', '🥈', '🥉', '⚽', '⚾', '🥎', '🎾', '🏐', '🏀', '🏈', '🏉', '🎱', '🎳', '🏓', '🏸', '🏒', '🏑', '🥍', '🥅', '⛳', '⛸️', '🎣', '🎽', '🎿', '🛷', '🛹', '🛼', '🛻', '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🏎️', '🛵', '🦯', '🔦', '🕯️'],
  nature: ['🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌺', '🌻', '🌸', '🌼', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '💧', '💦', '☔']
};

export default function EmojiPicker({ onEmojiSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('smileys');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
  const filteredEmojis = search.length > 0
    ? allEmojis.filter((emoji) => {
        const nameMap = {
          '😀': 'smile grin happy', '😃': 'smile happy', '😄': 'smile happy', '😁': 'grin happy',
          '😆': 'laugh happy', '😅': 'happy sweat', '🤣': 'laugh happy', '😂': 'joy tears laugh',
          '🙂': 'face smile', '🙃': 'smile upside', '😉': 'wink flirt', '😊': 'smile blush',
          '😇': 'angel halo happy', '🥰': 'love heart happy', '😍': 'heart eyes love', '🤩': 'star eyes wow',
          '😘': 'kiss love', '😗': 'kiss mouth', '😚': 'kiss eye', '😙': 'kiss cheek',
          '🥲': 'smile happy', '😋': 'yum tongue happy', '😛': 'tongue playful', '😜': 'wink tongue',
          '🤪': 'wild goofy', '😌': 'content satisfied', '😔': 'sad pensive', '😑': 'expressionless',
          '😐': 'neutral face', '😶': 'shy quiet', '🤐': 'secret quiet', '😏': 'smirk', '😒': 'unamused',
          '🙁': 'sad frown', '😲': 'gasp shocked', '☹️': 'sad frown angry', '🥺': 'sad puppy eyes',
          '😦': 'open mouth surprised', '😧': 'anguish', '😨': 'scared fear', '😰': 'anxious worried',
          '😥': 'disappointed sad', '😢': 'sad cry', '😭': 'cry tears sad', '😱': 'horror scary',
          '😖': 'confounded sad', '😣': 'persevere strain', '😞': 'sad pensive', '😓': 'sweat tired',
          '😩': 'weary tired', '😫': 'tired exhausted', '🥱': 'yawn tired', '😤': 'frustrated angry',
          '😡': 'angry pouting', '😠': 'angry rage', '🤬': 'cursing angry', '😈': 'devil evil',
          '👿': 'angry devil', '💀': 'skull death', '☠️': 'poison skull', '💩': 'poop funny',
          '🤡': 'clown silly', '👹': 'ogre demon', '👺': 'goblin', '👻': 'ghost', '👽': 'alien',
          '👾': 'space invader game', '🤖': 'robot', '😺': 'cat smile', '😸': 'cat grin',
          '😹': 'cat tears laugh', '😻': 'cat heart eyes', '😼': 'cat smirk', '😽': 'cat kiss',
          '🙀': 'weary cat', '😿': 'sad cat crying', '😾': 'angry cat pouting', '❤️': 'heart love',
          '🧡': 'orange heart', '💛': 'yellow heart', '💚': 'green heart', '💙': 'blue heart',
          '💜': 'purple heart', '🖤': 'black heart', '🤍': 'white heart', '🤎': 'brown heart',
          '💔': 'broken heart', '💕': 'double heart love', '💞': 'revolving hearts', '💓': 'beating heart',
          '💗': 'growing heart love', '💖': 'sparkling heart', '💘': 'cupid arrow', '💝': 'heart gift',
          '💟': 'diamond heart', '👍': 'thumbs up like', '👎': 'thumbs down dislike', '✌️': 'peace victory',
          '🤞': 'fingers crossed luck', '🫰': 'hand gesture', '🤟': 'love you gesture', '🤘': 'rock horns',
          '🙌': 'raised hands celebrate', '👐': 'open hands hug', '🤲': 'open palms', '🤝': 'handshake deal',
        };
        const emojiName = nameMap[emoji] || '';
        return emojiName.toLowerCase().includes(search.toLowerCase());
      })
    : EMOJI_CATEGORIES[selectedCategory];

  const categoryEmojis = {
    smileys: EMOJI_CATEGORIES.smileys[0],
    people: EMOJI_CATEGORIES.people[0],
    objects: EMOJI_CATEGORIES.objects[0],
    animals: EMOJI_CATEGORIES.animals[0],
    nature: EMOJI_CATEGORIES.nature[0],
  };

  return (
    <div ref={ref} className="absolute bottom-full mb-2 bg-[#1a1a2e] border border-[#2a2a45] rounded-2xl shadow-2xl p-3 z-50 w-80">
      {/* Search */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[#2a2a45]">
        <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
        <input
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[#111128] border border-[#2a2a45] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Emoji Grid */}
      <div className="mb-3 max-h-64 overflow-y-auto pr-2">
        <div className="grid grid-cols-6 gap-1 w-full">
          {filteredEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onEmojiSelect(emoji);
                setSearch('');
                onClose?.();
              }}
              className="text-2xl hover:bg-[#2a2a45] p-2 rounded transition active:scale-110 w-full h-full flex items-center justify-center"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      {search.length === 0 && (
        <div className="flex gap-1 pt-3 border-t border-[#2a2a45] justify-center">
          {['smileys', 'people', 'objects', 'animals', 'nature'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-lg p-1.5 rounded transition ${
                selectedCategory === cat
                  ? 'bg-purple-600/30 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title={cat}
            >
              {categoryEmojis[cat]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
