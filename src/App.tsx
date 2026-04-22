import React, { useState } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { convertAdToJapaneseEra, getLifeStage } from './data';
import type { EraType } from './data';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [selectedEra, setSelectedEra] = useState<EraType>('西暦');
  const [birthDate, setBirthDate] = useState(() => localStorage.getItem('birthDate') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Historical Knowledge Base (Dynamic Generation by Year)
  const getHistoricalSnapshot = (year: number) => {
    // Basic Era Logic with Year-Specific Variations
    if (year < 1912) { // Meiji
      const item = year % 2 === 0 ? "文明開化の「牛鍋」" : "モダンな「アンパン」";
      return {
        scene: `${year}年、明治の空気が色濃く残る街角。人力車と路面電車が並走し、瓦屋根の向こうにレンガ造りの洋館が建ち並ぶ、和洋が混ざり合う熱気の中。`,
        memory: `アンパン1個が約1銭。${item}が流行し、新しい時代を誰もが五感で味わっていました。`,
        event: `${year}年、近代国家としての基盤を固めるための様々な挑戦が、日本中で続けられていました。`
      };
    }
    if (year < 1926) { // Taisho
      return {
        scene: `${year}年。カフェから流れる蓄音機の調べ。モダンガールが銀座を闊歩し、自由とロマンが街の空気に溶け込んでいた華やかな黄昏時です。`,
        memory: `カレーライスが1杯7銭。百貨店の上層階で楽しむ「お子様ランチ」が、子供たちの憧れの象徴でした。`,
        event: "大正デモクラシーの波が広まり、民主主義と自由な文化が花開きました。"
      };
    }
    if (year < 1945) { // Early Showa / War
      return {
        scene: `${year}年。ラジオから流れる慎ましい放送。質素な暮らしの中にあっても、人々は明日の平和と家族の安寧を静かに祈っていた時代です。`,
        memory: `配給制による制限がある中で、手作りの温もりが何よりも尊ばれていた厳しい冬の時代です。`,
        event: "歴史の荒波の中で、人々の忍耐と希望が試されていた重大な時期にあたります。"
      };
    }
    if (year < 1970) { // Post-war Recovery / Rapid Growth
      const price = Math.floor(year / 10) * 10 - 1930;
      return {
        scene: `${year}年、焼け跡から立ち上がった街並み。至る所で工事の槌音が響き、空には高度経済成長を象徴する白い雲がどこまでも広がっています。`,
        memory: `コロッケ1個が約${price}円。白黒テレビの前に近所中が集まり、新しい時代の到来を共に祝っていました。`,
        event: "日本が世界にその復活を印象づけ、驚異的な成長を成し遂げた誇らしい時期です。"
      };
    }
    if (year < 1980) { // 70s
      return {
        scene: `${year}年。ベルボトムのジーンズに身を包んだ若者たち。フォークソングの調べが街角の喫茶店から流れ、多様な価値観が芽生え始めた夕暮れ時。`,
        memory: `コーヒー1杯が約200円。「カップヌードル」の登場が、日本の食文化に革命を起こしていました。`,
        event: "オイルショック後の社会不安を乗り越え、より豊かな生活を求めて人々が模索した時代です。"
      };
    }
    if (year < 1990) { // 80s / Bubble
      const item = year === 1983 ? "ファミリーコンピュータ" : "ウォークマン";
      return {
        scene: `${year}年、ネオン瞬く真夜中の都会。ハイブランドを身に纏った人々が、タクシーを求めて華やかな夜の街へと消えていく熱狂の風景です。`,
        memory: `缶ジュース100円。誰もが「${item}」を手にし、新しい遊びの形に夢中になっていました。`,
        event: "日本経済が絶頂期を迎え、世界中の富と文化がこの国に集中した夢のような時代です。"
      };
    }
    if (year < 2000) { // 90s
      if (year === 1993) {
        return {
          scene: "1993年、Jリーグの開幕に日本中が沸いた年。渋谷の街にはルーズソックスの高校生が溢れ、ポケベルの数字でメッセージを伝え合う新しい文化の萌芽がありました。",
          memory: "ドーナツ化現象が語られ、ナタ・デ・ココが流行。誰もが「Windows 3.1」という新しい窓を開こうとしていました。",
          event: "細川連立政権の誕生など、政治の世界でも戦後最大の転換期を迎えていました。"
        };
      }
      return {
        scene: `${year}年、PHSを片手に歩く若者たち。ミリオンセラーのCDが次々と生まれ、音楽が街の一部となっていたノスタルジックなデジタル前夜。`,
        memory: `マクドナルドのハンバーガーが130円。女子高生たちが「たまごっち」の育成に一喜一憂していました。`,
        event: "バブル崩壊後の困難な状況下で、新しい文化や価値観が力強く育まれた時期です。"
      };
    }
    if (year < 2010) { // 2000s
      if (year === 2003) {
        return {
          scene: "2003年、iモード全盛期の駅のホーム。パカパカと開く二つ折り携帯の画面を見つめ、デコメールで自分の世界を表現していたデジタル・ネイティブの黎明。 ",
          memory: "アザラシのタマちゃんが話題となり、六本木ヒルズがオープン。街には「世界に一つだけの花」が流れていました。",
          event: "イラクへの自衛隊派遣など、日本の平和と国際貢献のあり方が改めて問われた年です。"
        };
      }
      return {
        scene: `${year}年。iモードの着信音が響く中、人々はブログという新しい広場で自分の言葉を綴り始めた、繋がりの多様化が始まった時代です。`,
        memory: `牛丼1杯380円。誰もが「iPod」に数千曲を詰め込み、音楽を自由に持ち歩く楽しさを知りました。`,
        event: "アナログからデジタルへ、生活の基盤が劇的に変化し、情報の速度が加速した過渡期です。"
      };
    }
    return { // 2010s - Present
      scene: `${year}年、ワイヤレスイヤホンで世界と繋がり、スマホを片手に静かな街を歩く。SNSを通じて瞬時に世界と共有する、透明で加速した時代の空気感。`,
      memory: `サブスクリプション。所有することよりも、体験を共有することに価値を見出す新しいライフスタイルが定着しました。`,
      event: "テクノロジーによる進化と、持続可能な未来への模索が日本中で続けられています。"
    };
  };

  // URL Persistence and Back Button Support
  React.useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const year = params.get('year');
      if (!year) {
        setActiveYear(null);
        setInputValue('');
      } else {
        setActiveYear(parseInt(year, 10));
        setInputValue(year);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isSubmitEnabled) return;

    let targetYear = parseInt(inputValue, 10);
    if (selectedEra !== '西暦') {
      if (selectedEra === '令和') targetYear += 2018;
      else if (selectedEra === '平成') targetYear += 1988;
      else if (selectedEra === '昭和') targetYear += 1925;
      else if (selectedEra === '大正') targetYear += 1911;
      else if (selectedEra === '明治') targetYear += 1867;
    }

    if (targetYear >= 1868 && targetYear <= new Date().getFullYear() + 5) {
      setBackgroundImageUrl('');
      setIsImageLoading(true);
      
      const fetchImage = async () => {
        const searchQuery = `${targetYear} Japan history`;
        try {
          const res = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchQuery)}&srnamespace=6&format=json&origin=*`);
          const d = await res.json();
          const results = d.query.search || [];
          
          if (results.length > 0) {
            const pageRes = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(results[0].title)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`);
            const pd = await pageRes.json();
            const pages = pd?.query?.pages;
            const pageId = Object.keys(pages)[0];
            const info = pages[pageId]?.imageinfo?.[0];
            setBackgroundImageUrl(info?.thumburl || info?.url || '');
          } else {
            setBackgroundImageUrl(`https://placehold.co/1200x800/f0f0f0/f0f0f0`);
          }
        } catch (e) {
          setBackgroundImageUrl(`https://placehold.co/1200x800/f0f0f0/f0f0f0`);
        }
      };

      fetchImage();
      setActiveYear(targetYear);

      const url = new URL(window.location.href);
      url.searchParams.set('year', targetYear.toString());
      url.searchParams.set('era', selectedEra);
      window.history.pushState({ year: targetYear }, '', url);
    }
  };

  const isSubmitEnabled = selectedEra === '西暦' ? inputValue.length === 4 : inputValue.length >= 1;

  if (activeYear) {
    const eraData = convertAdToJapaneseEra(activeYear);
    const eraText = `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年`;
    const lifeStage = getLifeStage(birthDate, activeYear);
    const snapshot = getHistoricalSnapshot(activeYear);

    return (
      <div className="min-h-screen bg-white text-black relative">
        <div className="h-[60vh] relative overflow-hidden flex items-center justify-center border-b border-black bg-[#f0f0f0]">
          {backgroundImageUrl && (
            <img
              src={backgroundImageUrl}
              alt={activeYear.toString()}
              onLoad={() => setIsImageLoading(false)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ objectPosition: 'center 20%' }}
            />
          )}
          <div className="absolute inset-0 bg-white/30 z-[5]"></div>
          <div className="relative z-10 w-full text-center px-4">
            <h1 className="text-8xl md:text-[10rem] font-black leading-none mb-4">{activeYear}</h1>
            <h2 className="text-3xl md:text-5xl font-bold opacity-40">{eraText}</h2>
          </div>
          <button
            onClick={() => {
              setActiveYear(null);
              setInputValue('');
              const url = new URL(window.location.href);
              url.search = '';
              window.history.pushState({}, '', url);
            }}
            className="absolute top-8 left-8 p-4 hover:bg-gray-100 bg-white/50 backdrop-blur-sm z-50 rounded-full"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        </div>

        <div className="py-16 md:py-24 px-8 bg-white">
          <div className="max-w-2xl mx-auto space-y-16">
            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">時代の情景</h3>
              <p className="text-2xl md:text-3xl font-medium leading-relaxed [transform:scaleX(0.95)] origin-left">
                {snapshot.scene}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">暮らしの記憶</h3>
              <p className="text-xl md:text-2xl font-medium leading-relaxed opacity-70">
                {snapshot.memory}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.6em] opacity-40">主な出来事</h3>
              <p className="text-xl md:text-2xl font-medium leading-relaxed opacity-70">
                {snapshot.event}
              </p>
            </div>

            <div className="pt-20 border-t border-black/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.6em] mb-12 opacity-40">あなたの歴史</h3>
              {lifeStage ? (
                <div className="flex items-baseline gap-10">
                  {lifeStage.age >= 0 ? (
                    <>
                      <span className="text-8xl md:text-9xl font-black leading-none">{lifeStage.age}</span>
                      <div className="pb-4">
                        <div className="text-3xl font-black">歳</div>
                        <div className="text-[10px] font-bold opacity-30 uppercase tracking-[0.3em] mt-3">{lifeStage.stage}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic opacity-10 py-8">{lifeStage.stage}</div>
                  )}
                </div>
              ) : (
                <button onClick={() => setShowSettings(true)} className="text-[10px] font-black uppercase tracking-[0.4em] border border-black/20 px-12 py-6 hover:bg-black hover:text-white transition-all opacity-30 hover:opacity-100">誕生日を設定する</button>
              )}
            </div>
          </div>
        </div>

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <div className="bg-white p-12 max-w-md w-full border border-black">
              <h2 className="text-2xl font-black uppercase mb-4">設定</h2>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full bg-white border border-black px-6 py-4 text-xl font-bold focus:outline-none mb-12" />
              <button onClick={() => {
                setBirthDate(birthDate);
                localStorage.setItem('birthDate', birthDate);
                setShowSettings(false);
              }} className="w-full py-6 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-gray-800">保存</button>
              <button onClick={() => setShowSettings(false)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest opacity-30 mt-4">キャンセル</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center p-6 bg-white text-black relative overflow-hidden">
      <button onClick={() => setShowSettings(true)} className="absolute top-8 right-8 p-4 opacity-10 hover:opacity-100 transition-opacity"><Settings className="w-6 h-6" /></button>
      <div className="w-full max-w-4xl px-4 py-8 space-y-8 text-center">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">Time Leap Cal</h1>
        <p className="text-[10px] tracking-[0.6em] uppercase opacity-20 font-medium">Chronological Transition System</p>
        <form onSubmit={handleSearch} className="space-y-16">
          <div className="relative">
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))} 
              onBlur={() => isSubmitEnabled && handleSearch()} 
              placeholder="2026" 
              className="w-full bg-transparent border-none text-8xl md:text-[10rem] font-black placeholder:text-gray-100 focus:outline-none text-center" 
            />
            <div className="absolute -bottom-20 left-0 right-0 flex flex-wrap justify-center gap-2 md:gap-4 px-4">
              {(['西暦', '明治', '大正', '昭和', '平成', '令和'] as EraType[]).map(era => (
                <label key={era} className="flex items-center cursor-pointer">
                  <input type="radio" checked={selectedEra === era} onChange={() => setSelectedEra(era)} className="sr-only" />
                  <span className={`px-3 py-2 text-[10px] md:text-sm font-bold border-2 transition-all whitespace-nowrap ${selectedEra === era ? 'bg-black text-white border-black' : 'border-transparent text-gray-300 hover:text-black'}`}>
                    {era}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="pt-12 hidden md:block">
            <button type="submit" disabled={!isSubmitEnabled} className={`w-full py-10 text-lg font-black uppercase tracking-[1em] ${isSubmitEnabled ? 'bg-black text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}>タイムリープ</button>
          </div>
        </form>
      </div>
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-white p-12 max-w-md w-full border border-black">
            <h2 className="text-2xl font-black uppercase mb-4">設定</h2>
            <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="w-full bg-white border border-black px-6 py-4 text-xl font-bold focus:outline-none mb-12" />
            <button onClick={() => {
              setBirthDate(birthDate);
              localStorage.setItem('birthDate', birthDate);
              setShowSettings(false);
            }} className="w-full py-6 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-gray-800">保存</button>
            <button onClick={() => setShowSettings(false)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest opacity-30 mt-4">キャンセル</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
