import React, { useState, useEffect } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { convertAdToJapaneseEra, getLifeStage } from './data';
import type { EraType } from './data';
import { GoogleGenerativeAI } from '@google/generative-ai';

function App() {
  const [inputValue, setInputValue] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [selectedEra, setSelectedEra] = useState<EraType>('西暦');
  const [birthDate, setBirthDate] = useState(() => localStorage.getItem('birthDate') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [historicalText, setHistoricalText] = useState('');
  const [isTextLoading, setIsTextLoading] = useState(false);

  // Scroll to top on page transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeYear]);

  // URL Persistence and Back Button Support
  useEffect(() => {
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

  const fetchHistoricalNarrative = async (year: number) => {
    setIsTextLoading(true);
    setHistoricalText('');
    
    try {
      // Fetch data from Wikipedia
      const wikiRes = await fetch(`https://ja.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${year}年&format=json&origin=*`);
      const wikiData = await wikiRes.json();
      const pages = wikiData.query.pages;
      const pageId = Object.keys(pages)[0];
      
      let wikiText = "";
      if (pageId !== "-1") {
        wikiText = pages[pageId].extract;
      }

      if (!wikiText) {
        setHistoricalText(`${year}年。過ぎ去った時間の中に、数え切れない人々の営みが静かに刻まれています。`);
        setIsTextLoading(false);
        return;
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setHistoricalText("※ VITE_GEMINI_API_KEY が設定されていないため、物語を生成できませんでした。");
        setIsTextLoading(false);
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      // Select random chunks if text is too long to add more randomness
      const textChunks = wikiText.split('。').filter(s => s.length > 5);
      const shuffled = [...textChunks].sort(() => 0.5 - Math.random());
      const selectedText = shuffled.slice(0, 20).join('。') + '。';

      const prompt = `あなたは歴史の語り部です。以下のWikipediaから抽出された${year}年の出来事などのテキスト素材を元に、150〜200文字程度の客観的かつ情景を感じさせる情緒的なひと続きの文章を作成してください。
箇条書き、事務的なリスト、そして「時代の情景」「暮らしの記憶」「主な出来事」「あなたの歴史」などの見出し（ラベル）は【絶対に】出力しないでください。プレーンなテキストのみで、訪れるたびに異なる断片に出会えるような自然なパラグラフに再構成してください。

素材:
${selectedText.substring(0, 3000)}
`;
      
      const result = await model.generateContent(prompt);
      setHistoricalText(result.response.text());
    } catch (error) {
      console.error("Error generating narrative:", error);
      setHistoricalText("歴史の記憶を読み解くことができませんでした。");
    } finally {
      setIsTextLoading(false);
    }
  };

  const handleSearch = (e?: React.FormEvent, overrideValue?: string) => {
    if (e) e.preventDefault();
    const val = overrideValue ?? inputValue;
    const isEnabled = selectedEra === '西暦' ? val.length === 4 : val.length >= 1;
    if (!isEnabled) return;

    let targetYear = parseInt(val, 10);
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
      fetchHistoricalNarrative(targetYear);
      setActiveYear(targetYear);

      const url = new URL(window.location.href);
      url.searchParams.set('year', targetYear.toString());
      url.searchParams.set('era', selectedEra);
      window.history.pushState({ year: targetYear }, '', url);
    }
  };

  const isSubmitEnabled = selectedEra === '西暦' ? inputValue.length === 4 : inputValue.length >= 1;

  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* Hero Section */}
      <div className={`h-[100dvh] md:h-screen relative flex flex-col items-center justify-start pt-[20vh] md:pt-[12vh] ${activeYear ? 'border-b border-black bg-[#f0f0f0]' : 'bg-white'}`}>
        {activeYear && backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt={activeYear.toString()}
            onLoad={() => setIsImageLoading(false)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            style={{ objectPosition: 'center 20%' }}
          />
        )}
        {activeYear && <div className="absolute inset-0 bg-white/30 z-[5]"></div>}
        
        {/* Credit Display */}
        {activeYear && (
          <div className="absolute bottom-6 right-8 text-[10px] font-bold tracking-widest opacity-30 z-50 text-black">
            Text: Wikipedia / CC BY-SA
          </div>
        )}

        <button 
          onClick={() => setShowSettings(true)} 
          className={`absolute top-4 right-4 p-4 hover:opacity-100 transition-opacity z-50 ${activeYear ? 'opacity-30' : 'opacity-10'}`}
        >
          <Settings className="w-6 h-6" />
        </button>

        {activeYear && (
          <button
            onClick={() => {
              setActiveYear(null);
              setInputValue('');
              const url = new URL(window.location.href);
              url.search = '';
              window.history.pushState({}, '', url);
            }}
            className="absolute top-4 left-4 p-4 hover:bg-gray-100 bg-white/50 backdrop-blur-sm z-50 rounded-full"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        <div className="relative z-10 w-full max-w-4xl text-center">
          <div className="flex flex-col items-center">
            {/* Header Area - Fixed height to guarantee absolute stability */}
            <div className="h-[100px] md:h-[140px] flex flex-col justify-center mb-4 md:mb-8">
              <div className={`transition-opacity duration-500 ${activeYear ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">Time Leap Cal</h1>
                <p className="text-[10px] tracking-[0.6em] uppercase opacity-20 font-medium leading-none mt-4">Chronological Transition System</p>
              </div>
            </div>

            {/* Year Area - Fixed height to guarantee absolute stability */}
            <div className="relative w-full h-[120px] md:h-[200px] flex items-center justify-center">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={activeYear ? activeYear.toString() : inputValue} 
                    readOnly={!!activeYear}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      const cleaned = rawVal.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^0-9]/g, '');
                      setInputValue(cleaned);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isSubmitEnabled && !activeYear) {
                        handleSearch(e as any);
                      }
                    }}
                    onBlur={(e) => {
                      if (isSubmitEnabled && !activeYear) {
                        handleSearch(e as any);
                      }
                    }}
                    placeholder={
                      (() => {
                        const currentYear = new Date().getFullYear();
                        if (selectedEra === '令和') return (currentYear - 2018).toString();
                        if (selectedEra === '平成') return (currentYear - 1988).toString();
                        if (selectedEra === '昭和') return (currentYear - 1925).toString();
                        if (selectedEra === '大正') return (currentYear - 1911).toString();
                        if (selectedEra === '明治') return (currentYear - 1867).toString();
                        return currentYear.toString();
                      })()
                    } 
                    className={`w-full bg-transparent border-none text-7xl md:text-[10rem] font-black placeholder:text-gray-200 focus:outline-none text-center leading-none p-0 m-0 tabular-nums ${activeYear ? 'cursor-default' : ''}`} 
                  />
                  {/* Hidden submit button to ensure mobile keyboards show "Go/Search" */}
                  <button type="submit" className="hidden" aria-hidden="true" />
                </div>

                {/* Bottom Extras Area - Absolute positioning to prevent shifting the center block */}
                <div className="md:absolute md:top-full md:left-0 md:right-0 md:pt-8 w-full z-10 px-4">
                  {activeYear ? (
                    <h2 className="text-3xl md:text-5xl font-bold opacity-40 leading-none mt-4 md:mt-0">
                      {(() => {
                        const eraData = convertAdToJapaneseEra(activeYear);
                        return `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年`;
                      })()}
                    </h2>
                  ) : (
                    <div className="space-y-4 md:space-y-8">
                      <div className="flex justify-center flex-wrap gap-1 md:gap-4 px-2">
                        {(['西暦', '明治', '大正', '昭和', '平成', '令和'] as EraType[]).map(era => (
                          <label key={era} className="flex items-center cursor-pointer">
                            <input type="radio" checked={selectedEra === era} onChange={() => setSelectedEra(era)} className="sr-only" />
                            <span className={`px-2 py-2 text-[10px] md:text-sm font-bold border-2 transition-all whitespace-nowrap ${selectedEra === era ? 'bg-black text-white border-black' : 'border-transparent text-gray-500 hover:text-black'}`}>
                              {era}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-8 hidden md:block">
                        <button 
                          type="submit" 
                          disabled={!isSubmitEnabled} 
                          onClick={(e) => handleSearch(e)}
                          className={`w-full py-10 text-lg font-black uppercase tracking-[1em] relative z-30 ${isSubmitEnabled ? 'bg-black text-white cursor-pointer hover:bg-gray-900' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                        >
                          タイムリープ
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Results Detail Section */}
      {activeYear && (
        <div className="py-16 md:py-32 px-8 bg-white">
          <div className="max-w-2xl mx-auto space-y-16">
            {isTextLoading ? (
              <p className="text-2xl font-medium text-black leading-relaxed tracking-wide opacity-30 animate-pulse text-justify">
                歴史の断片を集めています...
              </p>
            ) : (
              <p className="text-2xl font-medium text-black leading-relaxed tracking-wide text-justify">
                {historicalText}
              </p>
            )}

            {(() => {
              const lifeStage = getLifeStage(birthDate, activeYear);
              return (
                <div className="flex items-baseline gap-10">
                  {lifeStage ? (
                    lifeStage.age >= 0 ? (
                      <div className="flex items-baseline gap-8">
                        <span className="text-2xl font-medium text-black">{lifeStage.age}歳</span>
                        <span className="text-2xl font-medium text-black">{lifeStage.stage}</span>
                      </div>
                    ) : (
                      <span className="text-2xl font-medium text-black">{lifeStage.stage}</span>
                    )
                  ) : (
                    <button onClick={() => setShowSettings(true)} className="text-2xl font-medium text-black hover:opacity-50 transition-opacity">
                      誕生日を設定する
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Settings Modal */}
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
