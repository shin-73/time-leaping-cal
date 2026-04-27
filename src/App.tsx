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
const getLoadingTypingDelay = (char: string) => Math.floor(getTypingDelay(char) * 4);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const REQUEST_TIMEOUT_MS = 60000;
const OVERLAY_OPACITY_MIN = 0.16;
const OVERLAY_OPACITY_MAX = 0.52;
const DEFAULT_OVERLAY_OPACITY = 0.32;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getOverlayClassName = (opacity: number) => {
  if (opacity >= 0.5) return 'hero-overlay hero-overlay-52';
  if (opacity >= 0.45) return 'hero-overlay hero-overlay-46';
  if (opacity >= 0.4) return 'hero-overlay hero-overlay-40';
  if (opacity >= 0.35) return 'hero-overlay hero-overlay-34';
  if (opacity >= 0.3) return 'hero-overlay hero-overlay-28';
  if (opacity >= 0.25) return 'hero-overlay hero-overlay-22';
  return 'hero-overlay hero-overlay-16';
};

const calculateOverlayOpacityFromImage = (imageEl: HTMLImageElement) => {
  try {
    const sampleSize = 48;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return DEFAULT_OVERLAY_OPACITY;

    canvas.width = sampleSize;
    canvas.height = sampleSize;
    context.drawImage(imageEl, 0, 0, sampleSize, sampleSize);

    const { data } = context.getImageData(0, 0, sampleSize, sampleSize);
    let luminanceTotal = 0;
    let pixelCount = 0;

    for (let idx = 0; idx < data.length; idx += 4) {
      const alpha = data[idx + 3];
      if (alpha === 0) continue;
      const red = data[idx];
      const green = data[idx + 1];
      const blue = data[idx + 2];
      // Rec.709 luminance for perceived brightness.
      const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
      luminanceTotal += luminance;
      pixelCount += 1;
    }

    if (pixelCount === 0) return DEFAULT_OVERLAY_OPACITY;
    const averageLuminance = luminanceTotal / pixelCount;
    const darkness = 1 - averageLuminance;
    const overlayOpacity =
      OVERLAY_OPACITY_MIN + darkness * (OVERLAY_OPACITY_MAX - OVERLAY_OPACITY_MIN);
    return clamp(overlayOpacity, OVERLAY_OPACITY_MIN, OVERLAY_OPACITY_MAX);
  } catch {
    return DEFAULT_OVERLAY_OPACITY;
  }
};

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

const toInputBirthDate = (value: string) => value.replace(/[^0-9]/g, '').slice(0, 8);

const toStorageBirthDate = (value: string) => {
  if (!/^\d{8}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const candidate = new Date(year, month - 1, day);
  const isValidDate =
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day;
  if (!isValidDate) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
};

function App() {
  const [inputValue, setInputValue] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [selectedEra, setSelectedEra] = useState<EraType>('西暦');
  const [birthDate, setBirthDate] = useState(() => localStorage.getItem('birthDate') || '');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 640px)').matches
      : false,
  );
  const [showSettings, setShowSettings] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState(() => toInputBirthDate(localStorage.getItem('birthDate') || ''));
  const [settingsError, setSettingsError] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [historicalText, setHistoricalText] = useState('');
  const [displayedHistoricalText, setDisplayedHistoricalText] = useState('');
  const [displayedLoadingText, setDisplayedLoadingText] = useState('');
  const [isNarrativeError, setIsNarrativeError] = useState(false);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('onboardingCompleted'));
  const [errorMsg, setErrorMsg] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState(DEFAULT_OVERLAY_OPACITY);
  const narrativeCache = useRef<Record<number, string>>({});

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)');
    const syncMobileState = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', syncMobileState);
    return () => mediaQuery.removeEventListener('change', syncMobileState);
  }, []);

  useEffect(() => {
    if (!isTextLoading) {
      setDisplayedLoadingText('');
      return;
    }
    let cancelled = false;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const typeLoadingMessages = async () => {
      if (prefersReducedMotion) {
        setDisplayedLoadingText(LOADING_MESSAGES[0]);
        return;
      }

      let msgIdx = 0;
      while (!cancelled) {
        const currentMessage = LOADING_MESSAGES[msgIdx];
        setDisplayedLoadingText('');
        for (let idx = 0; idx < currentMessage.length; idx += 1) {
          if (cancelled) return;
          const char = currentMessage[idx];
          setDisplayedLoadingText((prev) => prev + char);
          await sleep(getLoadingTypingDelay(char));
        }
        await sleep(700);
        msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      }
    };

    void typeLoadingMessages();

    return () => {
      cancelled = true;
    };
  }, [isTextLoading]);

  // Scroll to top on page transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeYear]);

  // URL Persistence and Back Button Support
  useEffect(() => {
    const syncUiStateWithUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const year = params.get('year');
      const panel = params.get('panel');

      setShowSettings(panel === 'settings');
      setShowOnboarding(panel === 'help');

      if (!year) {
        setActiveYear(null);
        setInputValue('');
      } else {
        setActiveYear(parseInt(year, 10));
        setInputValue(year);
      }
    };

    const handlePopState = () => {
      syncUiStateWithUrl();
    };

    syncUiStateWithUrl();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openPanel = (panel: 'settings' | 'help') => {
    if (panel === 'settings') {
      setShowSettings(true);
    } else {
      setShowOnboarding(true);
    }

    if (!isMobile) return;

    const url = new URL(window.location.href);
    if (url.searchParams.get('panel') === panel) return;
    url.searchParams.set('panel', panel);
    window.history.pushState({ panel }, '', url);
  };

  const closePanel = (panel: 'settings' | 'help') => {
    if (isMobile) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('panel') === panel) {
        window.history.back();
        return;
      }
    }

    if (panel === 'settings') {
      setShowSettings(false);
    } else {
      setShowOnboarding(false);
    }
  };

  useEffect(() => {
    if (!showSettings) return;
    setBirthDateInput(toInputBirthDate(birthDate));
    setSettingsError('');
  }, [showSettings, birthDate]);

  const fetchHistoricalNarrative = async (year: number) => {
    if (narrativeCache.current[year]) {
      setHistoricalText(narrativeCache.current[year]);
      return;
    }

    setIsTextLoading(true);
    setHistoricalText('');
    setIsNarrativeError(false);
    setDisplayedLoadingText('');
    setDisplayedHistoricalText('');

    const eraData = convertAdToJapaneseEra(year);
    const eraName = `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年`;

    try {
      const prompt = PROMPT_TEMPLATE(year, eraName);
      let narrative = '';

      if (import.meta.env.DEV) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
          throw new Error('Missing VITE_GEMINI_API_KEY');
        }
        const genAI = new GoogleGenerativeAI(apiKey as string);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), REQUEST_TIMEOUT_MS),
        );
        const aiPromise = (async () => {
          const result = await model.generateContent(prompt);
          return result.response.text();
        })();
        narrative = await Promise.race([aiPromise, timeoutPromise]);
      } else {
        const response = await fetch('/api/generate-narrative', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          const error = new Error(payload?.error || `HTTP ${response.status}`);
          (error as Error & { status?: number }).status = response.status;
          throw error;
        }
        narrative = payload?.text as string;
      }

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
            : Math.floor(baseDelay * 1.5);
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
      setOverlayOpacity(DEFAULT_OVERLAY_OPACITY);
      
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
              crossOrigin="anonymous"
              onLoad={(event) => {
                setIsImageLoading(false);
                setOverlayOpacity(calculateOverlayOpacityFromImage(event.currentTarget));
              }}
              className={`hero-bg-image absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
            />
            <div className={`${getOverlayClassName(overlayOpacity)} absolute inset-0 z-[5] transition-colors duration-700`} />
          </>
        )}
        
        {/* Credit Display */}
        {activeYear && (
          <div className="absolute bottom-6 right-8 text-[10px] font-bold tracking-widest opacity-30 z-50 text-black uppercase">
            Source: Wikipedia / CC BY-SA
          </div>
        )}

        {/* Header Icons - Fixed to viewport to prevent shifting and z-index issues */}
        <div className="fixed top-4 right-4 flex items-center gap-2 z-[60] pt-[env(safe-area-inset-top,0px)] pr-[env(safe-area-inset-right,0px)]">
          <button 
            onClick={() => openPanel('help')}
            className="p-4 text-black/30 hover:text-black/50 active:text-black/70 focus-visible:text-black/70 transition-colors"
          >
            <HelpCircle className="w-6 h-6" />
          </button>
          <button 
            onClick={() => openPanel('settings')}
            className="p-4 text-black/30 hover:text-black/50 active:text-black/70 focus-visible:text-black/70 transition-colors"
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
            className="fixed z-[60] top-[max(1.5rem,env(safe-area-inset-top,0px))] left-3 p-3 text-black/30 hover:text-black/50 active:text-black/70 focus-visible:text-black/70 transition-colors"
          >
            <ChevronLeft className="w-7 h-7" />
          </button>
        )}

        <div className="relative z-10 w-full max-w-4xl text-center">
          <div className="flex flex-col items-center">
            {/* Header Area - Fixed height to guarantee absolute stability */}
            <div className="h-[100px] md:h-[140px] flex flex-col justify-center mb-4 md:mb-8">
              <div className={`transition-opacity duration-500 ${activeYear ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <h1 className="text-4xl md:text-7xl font-black tracking-tighter uppercase italic leading-none font-serif">
                  <span>Time</span>
                  <span className="ml-[1px]"> Leap Cal</span>
                </h1>
                <p className="text-xs tracking-[0.08em] uppercase text-black/80 font-medium leading-none mt-4 font-sans">Chronological Transition System</p>
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
                    className={`w-full bg-transparent border-none text-5xl sm:text-7xl md:text-[9rem] placeholder:text-gray-200 focus:outline-none text-center leading-none p-0 m-0 tabular-nums font-number ${activeYear ? 'cursor-default' : ''}`} 
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
                    <h2 className="era-label-result text-2xl sm:text-4xl md:text-5xl leading-none tracking-widest text-black font-number">
                      {(() => {
                        const eraData = convertAdToJapaneseEra(activeYear);
                        return `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年`;
                      })()}
                    </h2>
                  ) : (
                    <div className="space-y-6 md:space-y-8 w-full max-w-sm mx-auto">
                      <div className="grid grid-cols-6 gap-3 md:gap-4 px-2">
                        {(['西暦', '明治', '大正', '昭和', '平成', '令和'] as EraType[]).map(era => (
                          <label key={era} className="flex w-full items-center cursor-pointer">
                            <input type="radio" checked={selectedEra === era} onChange={() => setSelectedEra(era)} className="sr-only" />
                            <span className={`inline-flex w-full items-center justify-center px-2 py-2 text-sm font-bold min-h-[44px] border-2 transition-all whitespace-nowrap ${selectedEra === era ? 'bg-black text-white border-black' : 'border-transparent text-gray-500 hover:text-black'}`}>
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
        <div className="pt-10 pb-16 md:pt-16 md:pb-32 px-8 bg-white">
          <div className="max-w-2xl mx-auto">
            {isTextLoading ? (
              <p className="narrative-serif text-2xl font-medium text-black/55 leading-relaxed">
                {displayedLoadingText}
              </p>
            ) : (
              <div>
                <div>
                  {(() => {
                    const paragraphs = toNarrativeParagraphs(displayedHistoricalText || historicalText);
                    return paragraphs.map((paragraph, idx, arr) => (
                    <p
                      key={`${idx}-${paragraph.slice(0, 8)}`}
                      className={`narrative-serif text-2xl font-medium text-black leading-relaxed ${idx === arr.length - 1 ? '' : 'mb-6'}`}
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
        <div className={`fixed inset-0 z-[110] ${isMobile ? 'bg-white overflow-y-auto' : 'flex items-center justify-center p-4 bg-black/40 backdrop-blur-md'}`}>
          <div className={`${isMobile ? 'min-h-[100dvh] px-6 pb-10 pt-[max(1.5rem,env(safe-area-inset-top,0px))]' : 'bg-white p-12 max-w-md w-full border border-black'}`}>
            {isMobile && (
              <button
                onClick={() => closePanel('settings')}
                className="mb-6 inline-flex items-center justify-center p-3 -ml-3"
                aria-label="戻る"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}
            <h2 className="text-2xl font-black uppercase mb-4">設定</h2>
            <input 
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              enterKeyHint="done"
              placeholder="YYYYMMDD"
              value={birthDateInput}
              onChange={(e) => {
                setBirthDateInput(toInputBirthDate(e.target.value));
                setSettingsError('');
              }} 
              className="w-full box-border bg-white border border-black px-6 py-5 text-center text-xl tracking-[0.08em] focus:outline-none mb-8 font-sans"
            />
            {settingsError && (
              <p className="mb-6 text-xs font-bold text-red-600">{settingsError}</p>
            )}
            <button onClick={() => {
              if (birthDateInput.length === 0) {
                setBirthDate('');
                localStorage.removeItem('birthDate');
                closePanel('settings');
                return;
              }
              const normalizedBirthDate = toStorageBirthDate(birthDateInput);
              if (!normalizedBirthDate) {
                setSettingsError('誕生日は YYYYMMDD の8桁で入力してください。');
                return;
              }
              setBirthDate(normalizedBirthDate);
              localStorage.setItem('birthDate', normalizedBirthDate);
              closePanel('settings');
            }} className="w-full py-6 bg-black text-white text-sm font-black uppercase tracking-widest hover:bg-gray-800">保存</button>
            <button onClick={() => closePanel('settings')} className="w-full py-4 text-[10px] font-bold uppercase tracking-widest opacity-30 mt-4">キャンセル</button>
          </div>
        </div>
      )}

      {/* Onboarding Guide */}
      {showOnboarding && (
        <div className={`fixed inset-0 z-[120] ${isMobile ? 'bg-white overflow-y-auto' : 'flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-md'}`}>
          <div className={`${isMobile ? 'min-h-[100dvh] px-6 pb-10 pt-[max(1.5rem,env(safe-area-inset-top,0px))]' : 'bg-white p-6 sm:p-12 w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] rounded-none border-none sm:border border-black overflow-y-auto'}`}>
            {isMobile && (
              <button
                onClick={() => closePanel('help')}
                className="mb-6 inline-flex items-center justify-center p-3 -ml-3"
                aria-label="戻る"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}
            <div className="mt-8 sm:mt-0 mb-8">
              <h2 className="text-[10px] tracking-[0.5em] uppercase opacity-40 font-bold mb-2">Concept</h2>
              <p className="text-3xl sm:text-4xl font-black leading-tight tracking-tighter">あなたと歴史が<br />重なる場所</p>
            </div>
            
            <div className="space-y-6 text-sm font-medium leading-relaxed text-gray-600 mb-12 max-w-md sm:mx-auto text-left">
              <p>TIME LEAP CALは、西暦と和暦を変換するための道具です。</p>
              <p>同時に、指定された年の歴史的な断片を、AIがひとつの物語として再構成します。</p>
              <p>誕生年を登録し、歴史の大きな流れにあなたの歩みを重ねることで、見慣れた過去の景色が、少しだけ違って見えるかもしれません。</p>
              <p>もちろん、誕生日の登録は必須ではありません。暦を引くための道具として、ご自由にお使いください。</p>
            </div>

            <button 
              onClick={() => {
                closePanel('help');
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
