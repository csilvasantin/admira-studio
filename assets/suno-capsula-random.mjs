const root = document.getElementById('sunoCapsula');
const prompt = root.querySelector('#sunoPrompt');
const button = root.querySelector('#sunoRandom');
const result = root.querySelector('#sunoRandomResult');
const en = document.documentElement.lang === 'en';
const styles = en
  ? ['disco funk', 'analog electropop', 'retro soul', 'acoustic pop', 'latin jazz', 'afrobeat']
  : ['funk disco', 'electropop analógico', 'soul retro', 'pop acústico', 'jazz latino', 'afrobeat'];
const voices = en
  ? ['male lead vocal', 'female lead vocal', 'male–female duet', 'mixed choir']
  : ['voz masculina', 'voz femenina', 'dúo de mujer y hombre', 'coro mixto'];
const prefix = en ? 'Arrangement: ' : 'Arreglo: ';
let lastStyle, lastVoice;

function pick(pool, previous) {
  const options = pool.filter(value => value !== previous);
  return options[Math.floor(Math.random() * options.length)];
}

button.addEventListener('click', () => {
  lastStyle = pick(styles, lastStyle);
  lastVoice = pick(voices, lastVoice);
  const arrangement = prefix + lastStyle + ' · ' + lastVoice;
  const lines = prompt.value.split('\n');
  if (lines[0].startsWith(prefix)) lines.shift();
  const brief = lines.join('\n').trim();
  prompt.value = brief ? arrangement + '\n' + brief : arrangement;
  prompt.dispatchEvent(new Event('input', {bubbles: true}));
  result.textContent = lastStyle + ' · ' + lastVoice;
});
