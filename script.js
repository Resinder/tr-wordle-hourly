document.addEventListener('DOMContentLoaded', () => {
    const WORD_LENGTH = 5;
    const MAX_GUESSES = 6;
    const gizliKelimeURL = 'gizli-kelime.json';
    const kelimelerGistURL = 'https://gist.githubusercontent.com/Resinder/b2897fd639006e34a1bf54252d730f7b/raw/b29034e404094142bfeb896e7e8e5aa50b6db46f/tdk-5-harfli-kelimeler.json';

    let kelimeler = [], hedefKelime = '', mevcutSatir = 0, mevcutKaro = 0, oyunBitti = false, guesses = [];

    const trNormalize = (t, type='upper') => {
        if(type==='upper') return t.replace(/i/g,'İ').replace(/ı/g,'I').toUpperCase().trim();
        return t.replace(/İ/g,'i').replace(/I/g,'ı').toLowerCase().trim();
    };

    async function init() {
        oyunTahtasiniOlustur();
        try {
            const data = await (await fetch(`${gizliKelimeURL}?t=${Date.now()}`)).json();
            hedefKelime = trNormalize(data.kelime);
            const list = await (await fetch(kelimelerGistURL)).json();
            kelimeler = list.map(k => trNormalize(k, 'lower'));
            geriSayimiBaslat();
            await loadGameState(new Date(data.saat).getHours());
        } catch (e) { console.log(e); }
        klavyeDinle();
    }

    function geriSayimiBaslat() {
        setInterval(() => {
            const now = new Date();
            const next = new Date(now).setHours(now.getHours() + 1, 0, 0, 0);
            const diff = next - now;
            if (diff <= 3000) { document.getElementById('wait-overlay').classList.add('active'); setTimeout(()=>location.reload(), 20000); }
            const m = Math.floor((diff/60000)%60), s = Math.floor((diff/1000)%60);
            document.querySelector('#timer span').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }, 1000);
    }

    async function tahminiGonder(isLoading = false) {
        if (oyunBitti || mevcutKaro !== WORD_LENGTH) return;
        const tahmin = Array.from({length:5}, (_,i)=>document.getElementById(`tile-${mevcutSatir}-${i}`).textContent).join('');
        const tUpper = trNormalize(tahmin);
        if(!isLoading) {
            if (tUpper !== hedefKelime && !kelimeler.includes(trNormalize(tahmin,'lower'))) {
                mesajGoster("Sözlükte yok 🙀", "nyan"); return;
            }
            guesses.push(tUpper); saveGameState();
        }
        await tahminiIsle(tUpper, isLoading);
        if (tUpper === hedefKelime) { oyunBitti = true; if(!isLoading) mesajGoster("TEBRİKLER! 🎉"); }
        else if (mevcutSatir >= 5) { oyunBitti = true; if(!isLoading) mesajGoster(hedefKelime); }
        else { mevcutSatir++; mevcutKaro = 0; }
    }

    async function tahminiIsle(tahmin, isLoading) {
        const tiles = document.getElementById(`row-${mevcutSatir}`).children;
        const havuz = {}; [...hedefKelime].forEach(h => havuz[h] = (havuz[h] || 0) + 1);
        const sonuc = new Array(5).fill('absent');
        [...tahmin].forEach((h,i) => { if(h===hedefKelime[i]) { sonuc[i]='correct'; havuz[h]--; }});
        [...tahmin].forEach((h,i) => { if(sonuc[i]!=='correct' && havuz[h]>0 && hedefKelime.includes(h)) { sonuc[i]='present'; havuz[h]--; }});
        for (let i=0; i<5; i++) {
            if(!isLoading) await new Promise(r=>setTimeout(r,150));
            tiles[i].classList.add('flip');
            setTimeout(() => {
                tiles[i].className = `tile filled ${sonuc[i]}`;
                const key = document.querySelector(`[data-key="${tahmin[i]}"]`);
                if(key && !key.classList.contains('correct')) key.className = `key ${sonuc[i]}`;
            }, 250);
        }
    }

    function klavyeDinle() {
        document.addEventListener('keydown', e => {
            if(oyunBitti) return;
            if(e.key==='Enter') tahminiGonder();
            else if(e.key==='Backspace') { if(mevcutKaro>0) { mevcutKaro--; const t=document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`); t.textContent=''; t.classList.remove('filled'); }}
            else if(/^[a-zA-ZçğİıöşüÇĞÖŞÜ]$/.test(e.key)) { if(mevcutKaro<5) { const t=document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`); t.textContent=trNormalize(e.key); t.classList.add('filled'); mevcutKaro++; }}
        });
        document.getElementById('keyboard').addEventListener('click', e => {
            const k = e.target.closest('button')?.dataset.key;
            if(!k || oyunBitti) return;
            if(k==='ENTER') tahminiGonder();
            else if(k==='BACKSPACE') { if(mevcutKaro>0) { mevcutKaro--; const t=document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`); t.textContent=''; t.classList.remove('filled'); }}
            else { if(mevcutKaro<5) { const t=document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`); t.textContent=trNormalize(k); t.classList.add('filled'); mevcutKaro++; }}
        });
    }

    function saveGameState() { localStorage.setItem('tr-wordle-state', JSON.stringify({target:hedefKelime, guesses, saat:new Date().getHours()})); }
    async function loadGameState(s) {
        const saved = JSON.parse(localStorage.getItem('tr-wordle-state'));
        if(saved && saved.saat === s && saved.target === hedefKelime) {
            for(const g of saved.guesses) { [...g].forEach(h => { const t=document.getElementById(`tile-${mevcutSatir}-${mevcutKaro}`); t.textContent=h; t.classList.add('filled'); mevcutKaro++; }); await tahminiGonder(true); }
        } else localStorage.removeItem('tr-wordle-state');
    }
    function mesajGoster(t, type) {
        const m = document.createElement('div'); m.className = `message ${type==='nyan'?'nyan':''}`;
        m.innerHTML = type==='nyan'?`<img src="https://media.giphy.com/media/sIIhZUs2lzdzq/giphy.gif" width="30">${t}`:t;
        document.getElementById('message-container').appendChild(m); setTimeout(()=>m.remove(), 2500);
    }
    function oyunTahtasiniOlustur() {
        for(let i=0; i<6; i++) {
            const r = document.createElement('div'); r.className='row'; r.id=`row-${i}`;
            for(let j=0; j<5; j++) { const t=document.createElement('div'); t.className='tile'; t.id=`tile-${i}-${j}`; r.appendChild(t); }
            gameBoard.appendChild(r);
        }
    }
    init();
});
