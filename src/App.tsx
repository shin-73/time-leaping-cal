import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Settings, HelpCircle } from 'lucide-react';
import { convertAdToJapaneseEra, getLifeStage } from './data';
import type { EraType } from './data';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AGE_PHRASES, PROMPT_TEMPLATE, LOADING_MESSAGES } from './constants/aiConfig';

const getTypingDelay = (char: string) => {
  if (char === '\n') return 220;
  if ('。！？'.includes(char)) return 360;
  if ('、,'.includes(char)) return 180;
  return 26;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const toNarrativeParagraphs = (text: string): string[] =>
  text
    .replace(/\r\n/g, '\n')
    .split(/\n+/)
    .flatMap((block) =>
      block
        .split(/(?<=[。！？])/)
        .map((sentence) => sentence.trim())
        .filter(Boolean),
    );

const calculatePersonalNarrative = (birthDate: string, activeYear: number) => {
  const lifeStage = getLifeStage(birthDate, activeYear);
  if (!lifeStage) return null;

  const age = lifeStage.age;
  if (age < 0) {
    return AGE_PHRASES.PRE_BIRTH(Math.abs(age));
  } else if (age === 0) {
    return AGE_PHRASES.BIRTH_YEAR;
  } else {
    return AGE_PHRASES.POST_BIRTH(age);
  }
};

function App() {
  const [inputValue, setInputValue] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [selectedEra, setSelectedEra] = useState<EraType>('西暦');
  const [birthDate, setBirthDate] = useState(() => localStorage.getItem('birthDate') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [historicalText, setHistoricalText] = useState('');
  const [displayedHistoricalText, setDisplayedHistoricalText] = useState('');
  const [isNarrativeError, setIsNarrativeError] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboardingCompleted'));
  const [errorMsg, setErrorMsg] = useState('');
  const narrativeCache = useRef<Record<number, string>>({});

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isTextLoading) {
      interval = setInterval(() => {
        setLoadingMsgIdx(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isTextLoading]);

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
    if (narrativeCache.current[year]) {
      setHistoricalText(narrativeCache.current[year]);
      return;
    }

    setIsTextLoading(true);
    setHistoricalText('');
    setIsNarrativeError(false);
    setLoadingMsgIdx(0);
    setDisplayedHistoricalText('');

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setHistoricalText("※ VITE_GEMINI_API_KEY が設定されていないため、物語を生成できませんでした。");
      setIsNarrativeError(true);
      setIsTextLoading(false);
      return;
    }

    const eraData = convertAdToJapaneseEra(year);
    const eraName = `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年`;

    try {
      // 1. 初期化：バージョン指定を一切行わない
      const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY as string);

      // 2. モデル取得：現在のAPIキーで利用可能な最新のFlashモデルを使用
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
        generationConfig: {
          temperature: 0,
          topP: 0.1,
          topK: 1,
        },
      });

      const prompt = PROMPT_TEMPLATE(year, eraName);

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      );

      const aiPromise = (async () => {
        const result = await model.generateContent(prompt);
        return result.response.text();
      })();

      const narrative = await Promise.race([aiPromise, timeoutPromise]);
      if (narrative && narrative.trim().length > 0) {
        narrativeCache.current[year] = narrative;
      }
      setHistoricalText(narrative);
    } catch (error: unknown) {
      const parsedError = error as { name?: string; status?: number | string; message?: string; toString?: () => string };
      console.error("========== API ERROR DETAILS ==========");
      console.error("Error Type:", parsedError?.name || "Unknown");
      console.error("Status:", parsedError?.status || "N/A");
      console.error("Message:", parsedError?.message || parsedError?.toString?.());
      console.error("Full Error Object:", error);
      console.error("=====================================");
      setHistoricalText(`${year}年（${eraName}）の記憶にアクセスできませんでした。`);
      setIsNarrativeError(true);
    } finally {
      setIsTextLoading(false);
    }
  };

  useEffect(() => {
    if (isTextLoading || !historicalText) return;

    const baseNarrativeText = historicalText.trim();
    const personalNarrative =
      !isNarrativeError && activeYear !== null
        ? calculatePersonalNarrative(birthDate, activeYear)
        : null;
    const fullText = [baseNarrativeText, personalNarrative].filter(Boolean).join('\n\n');
    const ageTextStartIndex = personalNarrative ? baseNarrativeText.length + 2 : Number.POSITIVE_INFINITY;
    let cancelled = false;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const typeNarrative = async () => {
      if (prefersReducedMotion) {
        setDisplayedHistoricalText(fullText);
        return;
      }

      setDisplayedHistoricalText('');

      for (let idx = 0; idx < fullText.length; idx += 1) {
        if (cancelled) break;
        const char = fullText[idx];
        setDisplayedHistoricalText((prev) => prev + char);
        const baseDelay = getTypingDelay(char);
        const delay =
          idx >= ageTextStartIndex
            ? ('、,'.includes(char) ? Math.floor(baseDelay * 2.25) : Math.floor(baseDelay * 3.0625))
            : baseDelay;
        await sleep(delay);
      }

    };

    void typeNarrative();

    return () => {
      cancelled = true;
    };
  }, [activeYear, birthDate, historicalText, isNarrativeError, isTextLoading]);

  const handleSearch = (_e?: React.FormEvent, overrideValue?: string) => {
    if (isTextLoading) return; // 多重送信ガード
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

    if (targetYear < 1868) {
      setErrorMsg('明治以前の記憶は現在対応していません。');
      return;
    }
    setErrorMsg('');

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
        } catch {
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
    } else {
      setErrorMsg('未来または範囲外の年号です。');
    }
  };

  const isSubmitEnabled = selectedEra === '西暦' ? inputValue.length === 4 : inputValue.length >= 1;

  return (
    <div className="min-h-[100dvh] bg-white text-black relative">
      {/* Hero Section */}
      <div className={`w-full relative min-h-[450px] sm:min-h-[500px] justify-start pt-[120px] md:pt-[160px] overflow-hidden flex flex-col items-center ${activeYear ? 'pb-24 border-b border-black bg-[#f0f0f0]' : 'pb-[280px] bg-transparent'}`}>
        {activeYear && backgroundImageUrl && (
          <>
            <img
              src={backgroundImageUrl}
              alt={`${activeYear} background`}
              onLoad={() => setIsImageLoading(false)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ objectPosition: 'center 20%' }}
            />
            {/* Minimal overlay to preserve image texture while ensuring basic legibility */}
            <div className="absolute inset-0 bg-white/10 z-[1]"></div>
          </>
        )}
        {activeYear && <div className="absolute inset-0 bg-white/30 z-[5]"></div>}
        
        {/* Credit Display */}
        {activeYear && (
          <div className="absolute bottom-6 right-8 text-[10px] font-bold tracking-widest opacity-30 z-50 text-black uppercase">
            Source: Wikipedia / CC BY-SA
          </div>
        )}

        {/* Header Icons - Fixed to viewport to prevent shifting and z-index issues */}
        <div className="fixed top-4 right-4 flex items-center gap-2 z-[60] pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)]">
          <button 
            onClick={() => setShowOnboarding(true)} 
            className={`p-4 hover:opacity-100 transition-opacity ${activeYear ? 'opacity-30' : 'opacity-10'}`}
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setShowSettings(true)} 
            className={`p-4 hover:opacity-100 transition-opacity ${activeYear ? 'opacity-30' : 'opacity-10'}`}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {activeYear && (
          <button
            onClick={() => {
              setActiveYear(null);
              setInputValue('');
              const url = new URL(window.location.href);
              url.search = '';
              window.history.pushState({}, '', url);
            }}
            className="fixed top-4 left-4 p-4 hover:bg-gray-100 bg-white/50 backdrop-blur-sm z-[60] mt-[env(safe-area-inset-top,0px)] ml-[env(safe-area-inset-left,0px)]"
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
                <p className="text-xs tracking-tighter uppercase text-black/70 font-medium leading-none mt-4">Chronological Transition System</p>
              </div>
            </div>

            {/* Year Area - Fixed height to guarantee absolute stability */}
            <div className="relative w-full h-[120px] md:h-[200px] flex items-center justify-center">
              <form action="javascript:void(0)" onSubmit={(e) => { e.preventDefault(); if (isSubmitEnabled && !activeYear) handleSearch(e); }} className="w-full">
                <div className="relative">
                  <input 
                    type="search" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    enterKeyHint="go"
                    value={activeYear ? activeYear.toString() : inputValue} 
                    readOnly={!!activeYear}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      // 数字以外の文字（全角数字を除く）を即座に排除
                      let cleaned = rawVal.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).replace(/[^0-9]/g, '');
                      
                      // 4桁までに物理的に制限
                      if (cleaned.length > 4) {
                        cleaned = cleaned.slice(0, 4);
                      }
                      
                      setInputValue(cleaned);
                      setErrorMsg('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.keyCode === 13) {
                        e.preventDefault();
                        if (isSubmitEnabled && !activeYear && e.currentTarget.form) {
                          e.currentTarget.form.requestSubmit();
                        }
                      }
                    }}
                    onBlur={() => {
                      // iOSの「完了」ボタン（Done）が押された際、フォーカスが外れることを利用して遷移を発火
                      if (isSubmitEnabled && !activeYear) {
                        handleSearch();
                      }
                    }}
                    maxLength={4}
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
                    className={`w-full bg-transparent border-none text-6xl sm:text-8xl md:text-[10rem] font-black placeholder:text-gray-200 focus:outline-none text-center leading-none p-0 m-0 tabular-nums ${activeYear ? 'cursor-default' : ''}`} 
                  />
                  {/* Hidden submit button with opacity-0 to ensure mobile keyboards register it correctly without visual display */}
                  <button type="submit" className="opacity-0 absolute pointer-events-none" tabIndex={-1} aria-hidden="true">タイムリープ</button>
                </div>

                {/* Bottom Extras Area - Absolute positioning to prevent shifting the center block */}
                <div className={`absolute top-full left-0 right-0 ${!activeYear ? 'pt-6 sm:pt-10' : 'pt-2 sm:pt-4'} w-full z-10 px-4 flex flex-col items-center`}>
                  {errorMsg && (
                    <div className="absolute top-0 transform -translate-y-full text-red-500 font-bold text-xs sm:text-sm animate-pulse pointer-events-none pb-2">
                      {errorMsg}
                    </div>
                  )}
                  {activeYear ? (
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-black leading-none tracking-widest text-[#d1d1d1]" style={{ textShadow: '1px 1px 0px rgba(255, 255, 255, 1), -1px -1px 0px rgba(0, 0, 0, 0.08)' }}>
                      {(() => {
                        const eraData = convertAdToJapaneseEra(activeYear);
                        return `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年`;
                      })()}
                    </h2>
                  ) : (
                    <div className="space-y-6 md:space-y-8 w-full max-w-sm mx-auto">
                      <div className="flex justify-center flex-wrap gap-2 md:gap-4 px-2">
                        {(['西暦', '明治', '大正', '昭和', '平成', '令和'] as EraType[]).map(era => (
                          <label key={era} className="flex items-center cursor-pointer">
                            <input type="radio" checked={selectedEra === era} onChange={() => setSelectedEra(era)} className="sr-only" />
                            <span className={`px-2 py-2 text-[10px] md:text-sm font-bold border-2 transition-all whitespace-nowrap ${selectedEra === era ? 'bg-black text-white border-black' : 'border-transparent text-gray-500 hover:text-black'}`}>
                              {era}
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="pt-8 hidden sm:block">
                        <button 
                          type="submit" 
                          disabled={!isSubmitEnabled} 
                          onClick={(e) => handleSearch(e)}
                          className={`w-full py-10 text-lg font-black uppercase tracking-[1em] relative z-30 transition-all ${isSubmitEnabled ? 'bg-black text-white cursor-pointer hover:bg-gray-900' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
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
          <div className="max-w-2xl mx-auto">
            {isTextLoading ? (
              <p key={loadingMsgIdx} className="text-2xl font-medium text-black leading-relaxed tracking-wide opacity-30 animate-breathe text-justify">
                {LOADING_MESSAGES[loadingMsgIdx]}
              </p>
            ) : (
              <div className="text-justify">
                <div>
                  {(() => {
                    const paragraphs = toNarrativeParagraphs(displayedHistoricalText || historicalText);
                    return paragraphs.map((paragraph, idx, arr) => (
                    <p
                      key={`${idx}-${paragraph.slice(0, 8)}`}
                      className={`text-2xl font-medium text-black leading-relaxed tracking-wide ${idx === arr.length - 1 ? '' : 'mb-6'}`}
                    >
                      {paragraph}
                    </p>
                    ));
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
          <div className="bg-white p-12 max-w-md w-full border border-black">
            <h2 className="text-2xl font-black uppercase mb-4">設定</h2>
            <input 
              type="date" 
              max="9999-12-31"
              value={birthDate} 
              onChange={(e) => {
                const val = e.target.value;
                if (val) {
                  const parts = val.split('-');
                  let y = parts[0];
                  if (y.length > 4) {
                    y = y.slice(0, 4);
                    setBirthDate(`${y}-${parts[1] || '01'}-${parts[2] || '01'}`);
                    return;
                  }
                }
                setBirthDate(val);
              }} 
              className="w-full bg-white border border-black px-6 py-4 text-xl font-bold focus:outline-none mb-12" 
            />
            <button onClick={() => {
              setBirthDate(birthDate);
              localStorage.setItem('birthDate', birthDate);
              setShowSettings(false);
            }} className="w-full py-6 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-gray-800">保存</button>
            <button onClick={() => setShowSettings(false)} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest opacity-30 mt-4">キャンセル</button>
          </div>
        </div>
      )}

      {/* Onboarding Guide */}
      {showOnboarding && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white p-6 sm:p-12 w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] rounded-none border-none sm:border border-black overflow-y-auto">
            <div className="mt-8 sm:mt-0 mb-8">
              <h2 className="text-[10px] tracking-[0.5em] uppercase opacity-40 font-bold mb-2">Concept</h2>
              <p className="text-3xl sm:text-4xl font-black leading-tight tracking-tighter">あなたと歴史が<br />重なる場所</p>
            </div>
            
            <div className="space-y-6 text-sm font-medium leading-relaxed text-gray-600 mb-12 max-w-md sm:mx-auto text-left sm:text-center">
              <p>TIME LEAP CALは、西暦と和暦を変換するための道具です。</p>
              <p>同時に、指定された年の歴史的な断片を、AIがひとつの物語として再構成します。</p>
              <p>誕生年を登録し、歴史の大きな流れにあなたの歩みを重ねることで、見慣れた過去の景色が、少しだけ違って見えるかもしれません。</p>
              <p>もちろん、誕生日の登録は必須ではありません。暦を引くための道具として、ご自由にお使いください。</p>
            </div>

            <button 
              onClick={() => {
                setShowOnboarding(false);
                localStorage.setItem('onboardingCompleted', 'true');
              }} 
              className="w-full py-6 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-gray-900 transition-colors rounded-none"
            >
              記憶の旅を始める
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
