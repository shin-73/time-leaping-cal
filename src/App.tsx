import React, { useState } from 'react';
import { ChevronLeft, Settings } from 'lucide-react';
import { convertAdToJapaneseEra, getLifeStage, getYearData } from './data';

type EraType = '西暦' | '明治' | '大正' | '昭和' | '平成' | '令和';

function App() {
  const [selectedEra, setSelectedEra] = useState<EraType>('西暦');
  const [inputValue, setInputValue] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState(() => localStorage.getItem('birthDate') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [photoInfo, setPhotoInfo] = useState<{ name: string; username: string } | null>(null);

  const getEraColor = (year: number) => {
    if (year >= 2019) return 'f3f4f6'; // Reiwa
    if (year >= 1989) return 'e0e7ff'; // Heisei
    if (year >= 1970) return 'f59e0b'; // Showa Late
    if (year >= 1926) return '9ca3af'; // Showa Early
    if (year >= 1912) return 'fef3c7'; // Taisho
    return '064e3b'; // Meiji
  };

  const saveBirthDate = (date: string) => {
    setBirthDate(date);
    localStorage.setItem('birthDate', date);
    setShowSettings(false);
  };

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
      // Clear previous state immediately
      setBackgroundImageUrl('');
      setIsImageLoading(true);

      // Fetch from Wikimedia Commons
      const searchQuery = `incategory:"${targetYear} in Japan"`;
      const fallbackQuery = `"${targetYear} Japan street" OR "${targetYear} Japan history"`;
      
      const fetchFromWikimedia = async (q: string) => {
        const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srnamespace=6&format=json&origin=*`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        return data.query.search || [];
      };

      const getImageUrl = async (title: string) => {
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`;
        const res = await fetch(infoUrl);
        const data = await res.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        return pages[pageId].imageinfo?.[0];
      };

      const executeLeap = async () => {
        try {
          let results = await fetchFromWikimedia(searchQuery);
          if (results.length === 0) results = await fetchFromWikimedia(fallbackQuery);
          
          if (results.length > 0) {
            // Try first few results to find a non-modern one
            for (const item of results.slice(0, 5)) {
              const info = await getImageUrl(item.title);
              if (info) {
                const metadata = info.extmetadata || {};
                const description = (metadata.ObjectName?.value || "") + (metadata.ImageDescription?.value || "");
                
                // Filtering out modern stuff if year is old
                if (targetYear < 2010 && /modern|2020|2021|2022|2023|2024|2025/i.test(description)) continue;
                
                setBackgroundImageUrl(info.thumburl || info.url);
                setIsImageLoading(false);
                return;
              }
            }
          }
          // No good match
          const color = getEraColor(targetYear);
          setBackgroundImageUrl(`https://placehold.co/1200x800/${color}/${color}`);
          setIsImageLoading(false);
        } catch (err) {
          const color = getEraColor(targetYear);
          setBackgroundImageUrl(`https://placehold.co/1200x800/${color}/${color}`);
          setIsImageLoading(false);
        }
      };

      executeLeap();

      setActiveYear(targetYear);
    } else {
      alert('正しい数字を入力してください（1868年以降）。');
    }
  };

  const isSubmitEnabled = selectedEra === '西暦' 
    ? inputValue.length === 4 
    : inputValue.length >= 1;

  const getPlaceholder = () => {
    if (selectedEra === '西暦') return '2026';
    if (selectedEra === '明治') return '159';
    if (selectedEra === '大正') return '115';
    if (selectedEra === '昭和') return '101';
    if (selectedEra === '平成') return '38';
    if (selectedEra === '令和') return '8';
    return '';
  };

  if (activeYear) {
    const eraData = convertAdToJapaneseEra(activeYear);
    const eraText = `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年`;
    const yearData = getYearData(activeYear, eraData.era);
    const lifeStage = getLifeStage(birthDate, activeYear);

    return (
      <div className="min-h-screen bg-white text-black relative">
        {/* Top 2/3: Image Background */}
        <div className="h-[66vh] relative overflow-hidden flex items-center justify-center border-b border-black bg-[#f0f0f0]">
          {backgroundImageUrl && (
            <img 
              src={backgroundImageUrl} 
              alt={activeYear.toString()}
              onLoad={() => setIsImageLoading(false)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              style={{ objectPosition: 'center 20%' }}
            />
          )}
          
          <div className="absolute bottom-6 right-8 text-[10px] font-bold uppercase tracking-[0.2em] opacity-20 hover:opacity-100 transition-opacity flex items-center gap-2 pointer-events-none select-none">
            <div className="w-4 h-px bg-black opacity-20"></div>
            Wikimedia Commons
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-24 px-4 text-center">
            <h1 className="text-8xl md:text-[10rem] font-black tracking-tighter leading-none">{activeYear}</h1>
            <div className="w-px h-24 md:h-64 bg-black hidden md:block"></div>
            <h1 className="text-6xl md:text-9xl font-bold tracking-tight leading-none">{eraText}</h1>
          </div>
          
          <button 
            onClick={() => {
              setActiveYear(null);
              setInputValue('');
            }}
            className="absolute top-8 left-8 p-4 hover:bg-gray-100 bg-white/50 backdrop-blur-sm"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        </div>

        {/* Bottom Section: Content */}
        <div className="p-8 md:p-16">
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6 border-b border-black pb-2 opacity-40">Main Events</h3>
                <ul className="space-y-6">
                  {yearData.events.map((e, i) => (
                    <li key={i} className="text-xl font-bold leading-tight border-l-4 border-black pl-4">{e}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-12">
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 border-b border-black pb-2 opacity-40">Buzzword</h3>
                  <p className="text-3xl font-black uppercase tracking-tighter">{yearData.buzzwords[0]}</p>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-4 border-b border-black pb-2 opacity-40">Top Hit</h3>
                  <p className="text-3xl font-black uppercase tracking-tighter">{yearData.songs[0]}</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-black/5">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] mb-6 border-b border-black pb-2 opacity-40">Your Timeline</h3>
              {lifeStage ? (
                <div className="flex items-baseline gap-4">
                  <span className="text-7xl font-black">{lifeStage.age}</span>
                  <div>
                    <div className="text-xl font-bold uppercase tracking-widest">Years Old</div>
                    <div className="text-sm font-medium opacity-60 uppercase">{lifeStage.stage}</div>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setShowSettings(true)}
                  className="text-xs font-bold uppercase tracking-widest border border-black/10 px-6 py-4 hover:bg-black hover:text-white transition-colors opacity-40 hover:opacity-100"
                >
                  Set Birth Date
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 bg-white text-black relative md:overflow-hidden">
      {/* Settings Icon (Top Right, Subtle) */}
      <button 
        onClick={() => setShowSettings(true)}
        className="absolute top-8 right-8 p-4 opacity-20 hover:opacity-100 transition-opacity"
      >
        <Settings className="w-6 h-6" />
      </button>

      <div className="w-full max-w-4xl px-4 py-8 space-y-6 md:space-y-8">
        <div className="text-center space-y-2 md:space-y-4">
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none whitespace-nowrap">Time Leap Cal</h1>
          <p className="text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.6em] uppercase opacity-30 font-medium whitespace-nowrap">Chronological Transition System</p>
        </div>

        <form onSubmit={handleSearch} className="space-y-12 md:space-y-16">
          <div className="space-y-6 md:space-y-10">
            <div className="relative">
              <input 
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.replace(/[^0-9]/g, ''))}
                onBlur={() => {
                  if (isSubmitEnabled) {
                    handleSearch();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                placeholder={getPlaceholder()}
                className="w-full px-0 py-6 md:py-8 bg-transparent border-none text-7xl md:text-9xl font-black placeholder:text-gray-200 focus:outline-none text-center"
              />
              <div className="absolute -bottom-12 md:-bottom-16 left-0 right-0 flex flex-row justify-center gap-4 md:gap-8">
                {(['西暦', '明治', '大正', '昭和', '平成', '令和'] as EraType[]).map(era => (
                  <label key={era} className="flex-shrink-0 flex items-center cursor-pointer">
                    <input 
                      type="radio"
                      name="era"
                      checked={selectedEra === era}
                      onChange={() => setSelectedEra(era)}
                      className="sr-only"
                    />
                    <span className={`px-2 md:px-6 py-2 md:py-3 text-xs md:text-lg font-bold border-2 transition-colors whitespace-nowrap ${selectedEra === era ? 'bg-black text-white border-black' : 'border-transparent text-gray-400 hover:text-black'}`}>
                      {era}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 hidden md:block">
            <button 
              type="submit"
              disabled={!isSubmitEnabled}
              className={`w-full py-8 md:py-10 text-xs md:text-lg font-black uppercase tracking-[1em] ${isSubmitEnabled ? 'bg-black text-white cursor-pointer' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
            >
              Leap
            </button>
          </div>
          
          {/* iOS/Android keyboard usually shows "Search" or "Go" for type="search" within a form */}
          <input type="submit" className="hidden" />
        </form>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-12 max-w-md w-full border border-black">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Set Origin</h2>
            <p className="text-xs font-medium mb-12 opacity-60 uppercase tracking-widest">Define your birth coordinates.</p>
            
            <input 
              type="date" 
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full bg-white border border-black px-6 py-4 text-xl font-bold focus:outline-none mb-12"
            />
            
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => saveBirthDate(birthDate)}
                className="w-full py-6 bg-black text-white text-sm font-black uppercase tracking-[0.2em] hover:bg-gray-800"
              >
                Save
              </button>
              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-4 text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 hover:opacity-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

