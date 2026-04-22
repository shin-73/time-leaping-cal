import React, { useState } from 'react';
import { Search, Calendar, Share, CalendarHeart, ChevronDown, ChevronUp } from 'lucide-react';
import { convertAdToJapaneseEra, convertEraToAdYear, getLifeStage, getYearData, type YearData } from './data';

function App() {
  const [query, setQuery] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState<string>(() => {
    return localStorage.getItem('birthDate') || '';
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isInputExpanded, setIsInputExpanded] = useState(true);

  const saveBirthDate = (date: string) => {
    setBirthDate(date);
    localStorage.setItem('birthDate', date);
    setShowSettings(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    let targetYear = parseInt(query, 10);

    if (isNaN(targetYear) || targetYear < 1000) {
      const eraYear = convertEraToAdYear(query.trim());
      if (eraYear) {
        targetYear = eraYear;
      }
    }

    if (!isNaN(targetYear) && targetYear >= 1868 && targetYear <= new Date().getFullYear() + 5) {
      setActiveYear(targetYear);
      setIsInputExpanded(false);
    } else {
      alert('正しい西暦(1868〜)か和暦(例: 平成7)を入力してください。');
    }
  };

  const shareToTwitter = (yearData: YearData, lifeStageData: { age: number, stage: string } | null) => {
    const eraStr = convertAdToJapaneseEra(yearData.year);
    const eraYearText = eraStr.eraYear === 1 ? '元年' : `${eraStr.eraYear}年`;
    let text = `${yearData.year}年（${eraStr.era}${eraYearText}）の出来事や流行を振り返りました！\n`;
    
    if (lifeStageData) {
      text += `この時私は${lifeStageData.age}歳（${lifeStageData.stage}）でした。\n`;
    }
    text += `主な出来事: ${yearData.events.join(' / ')}\n#TimeLeapCal`;
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const eraData = activeYear ? convertAdToJapaneseEra(activeYear) : null;
  const eraText = eraData ? `${eraData.era}${eraData.eraYear === 1 ? '元' : eraData.eraYear}年` : '';
  const yearData = activeYear ? getYearData(activeYear, eraData!.era) : null;
  const lifeStage = activeYear ? getLifeStage(birthDate, activeYear) : null;

  return (
    <div className="w-full min-h-screen bg-[#FAFAFA] text-[#333] font-sans selection:bg-[#E3EB50] selection:text-[#333]">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row bg-white min-h-screen shadow-[0_0_40px_rgba(0,0,0,0.03)]">
        
        {/* Left/Top Section: Input & Settings */}
        <div className="w-full md:w-[400px] border-b md:border-b-0 md:border-r border-gray-100 p-6 md:p-10 flex flex-col gap-8 z-20 shrink-0 bg-white">
          
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-widest text-[#333]">Time-Leap Cal</h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-gray-400">Chronological Transition System</p>
          </div>

          {/* Mobile Accordion Toggle for Input */}
          <div className="md:hidden">
             <button 
               onClick={() => setIsInputExpanded(!isInputExpanded)}
               className="w-full flex items-center justify-between px-6 py-4 bg-[#f8f8f8] rounded-full text-sm font-bold text-[#333] tracking-wide transition-colors"
             >
               <span>{activeYear ? '検索条件を変更する' : '年を入力して検索'}</span>
               {isInputExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
             </button>
          </div>

          <div className={`space-y-8 ${isInputExpanded ? 'block' : 'hidden'} md:block transition-all duration-300`}>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="西暦または和暦 (例: 1990, 平成2)"
                  className="w-full px-6 py-4 bg-[#f8f8f8] border border-transparent rounded-full text-base font-medium placeholder:text-gray-400 focus:outline-none focus:border-[#E3EB50] focus:bg-white transition-all shadow-inner"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-2 bottom-2 w-12 flex items-center justify-center bg-[#E3EB50] rounded-full text-[#333] hover:bg-[#dceb3b] transition-colors shadow-sm"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="flex justify-center md:justify-start">
              {birthDate ? (
                <button 
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-[#333] transition-colors py-2 px-4 rounded-full hover:bg-gray-50"
                >
                  <CalendarHeart className="w-4 h-4 text-[#dceb3b]" />
                  Profile Active (Edit)
                </button>
              ) : (
                <button 
                  onClick={() => setShowSettings(true)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest border border-gray-200 rounded-full px-6 py-3 hover:bg-[#f5f5f5] transition-colors"
                >
                  <Calendar className="w-4 h-4 text-gray-400" />
                  生年月日を登録する
                </button>
              )}
            </div>
          </div>

          {/* Desktop Supplementary Info (Hidden on Mobile, moved to main column on mobile) */}
          <div className="hidden md:block mt-8">
            {activeYear && yearData && (
              <SupplementaryInfo yearData={yearData} />
            )}
          </div>

        </div>

        {/* Right/Main Content Area */}
        <div className="flex-1 relative flex flex-col bg-white overflow-hidden">
          {activeYear && yearData ? (
            <div className="flex-1 flex flex-col animate-in fade-in duration-500">
              
              {/* Visual Header */}
              <div className="h-[25vh] md:h-[35vh] relative overflow-hidden">
                <img 
                  src={yearData.imageUrl} 
                  alt={`${activeYear}`}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent"></div>
              </div>

              {/* Main Data */}
              <div className="flex-1 flex flex-col p-6 md:p-16 relative -mt-16 z-10">
                <div className="absolute top-0 right-6 md:right-16 bg-white rounded-full shadow-md z-20">
                  <button 
                    onClick={() => shareToTwitter(yearData, lifeStage)}
                    className="flex items-center gap-2 px-6 py-3 hover:bg-gray-50 rounded-full transition-colors text-xs font-bold tracking-widest"
                  >
                    <Share className="w-4 h-4 text-[#D4DF32]" />
                    Share
                  </button>
                </div>

                <div className="space-y-2 mb-10 pt-4">
                  <div className="text-xl md:text-2xl font-bold tracking-[0.2em] text-[#D4DF32] drop-shadow-sm">{activeYear}</div>
                  <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[#333]">
                    {eraText}
                  </h1>
                </div>

                {lifeStage && (
                  <div className="mb-12 bg-[#fdfdfd] border border-gray-100 rounded-[2rem] p-8 shadow-sm">
                    <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#E3EB50] flex items-center justify-center">
                        <Calendar className="w-3 h-3 text-[#333]" />
                      </div>
                      あなたの年齢
                    </h3>
                    {lifeStage.stage === '生まれる前' ? (
                      <p className="text-2xl font-bold text-gray-300">まだ生まれていません</p>
                    ) : (
                      <div className="flex items-baseline gap-4">
                        <span className="text-6xl md:text-7xl font-black text-[#333]">{lifeStage.age}</span>
                        <div className="flex flex-col">
                          <span className="text-lg font-bold">歳</span>
                          <span className="text-sm font-medium text-gray-500">{lifeStage.stage}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Mobile Supplementary Info */}
                <div className="md:hidden mt-4 pt-8 border-t border-gray-100">
                  <SupplementaryInfo yearData={yearData} />
                </div>

              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#fafafa]">
              <div className="w-24 h-24 rounded-full bg-[#f0f0f0] flex items-center justify-center mb-8">
                <Search className="w-10 h-10 text-gray-300" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-400 tracking-wide">
                あの頃へタイムリープ
              </h2>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          birthDate={birthDate} 
          onClose={() => setShowSettings(false)} 
          onSave={saveBirthDate}
        />
      )}
    </div>
  );
}

function SupplementaryInfo({ yearData }: { yearData: YearData }) {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-[#E3EB50] flex items-center justify-center text-[#333]">
            1
          </div>
          主な出来事
        </h3>
        <ul className="space-y-4">
          {yearData.events.map((event, i) => (
            <li key={i} className="text-sm font-medium leading-relaxed text-[#555] pl-4 border-l-[3px] border-[#E3EB50]">
              {event}
            </li>
          ))}
        </ul>
      </section>
      
      <section className="grid grid-cols-1 gap-8">
        <div>
          <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E3EB50] flex items-center justify-center text-[#333]">
              2
            </div>
            流行語
          </h3>
          <p className="text-base font-bold text-[#333] px-2">{yearData.buzzwords[0]}</p>
        </div>
        <div>
          <h3 className="text-xs font-bold tracking-[0.2em] text-gray-400 mb-4 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#E3EB50] flex items-center justify-center text-[#333]">
              3
            </div>
            ヒット曲
          </h3>
          <p className="text-base font-bold text-[#333] px-2">{yearData.songs[0]}</p>
        </div>
      </section>
    </div>
  );
}

function SettingsModal({ birthDate, onClose, onSave }: { birthDate: string, onClose: () => void, onSave: (d: string) => void }) {
  const [date, setDate] = useState(birthDate || '1990-04-01');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] p-8 md:p-12 max-w-md w-full shadow-2xl">
        <h2 className="text-2xl font-bold tracking-tight mb-2 text-[#333]">生年月日を設定</h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          あなたの年齢を計算するために、生年月日を設定してください。
        </p>
        
        <input 
          type="date" 
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-[#f8f8f8] border border-transparent rounded-full px-6 py-4 text-lg font-bold focus:outline-none focus:border-[#E3EB50] focus:bg-white transition-all mb-10"
        />
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => onSave(date)}
            className="w-full py-4 bg-[#333] text-white rounded-full text-sm font-bold tracking-widest hover:bg-[#E3EB50] hover:text-[#333] transition-colors"
          >
            保存する
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 text-xs font-bold text-gray-400 hover:text-[#333] transition-colors rounded-full"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;

