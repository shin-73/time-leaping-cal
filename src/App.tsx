import React, { useState } from 'react';
import { Search, Calendar, Share, CalendarHeart } from 'lucide-react';
import { convertAdToJapaneseEra, convertEraToAdYear, getLifeStage, getYearData, getThemeForEra, type YearData } from './data';

function App() {
  const [query, setQuery] = useState('');
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [birthDate, setBirthDate] = useState<string>(() => {
    return localStorage.getItem('birthDate') || '';
  });
  const [showSettings, setShowSettings] = useState(false);

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
  const theme = activeYear ? getThemeForEra(eraData!.era) : { bg: 'bg-stone-50', text: 'text-stone-800', card: 'bg-white', fontTitle: 'font-serif' };

  return (
    <div className={`flex-1 flex flex-col md:flex-row w-full overflow-hidden transition-colors duration-1000 ${activeYear ? theme.bg : 'bg-stone-100'}`}>
      
      {/* Left Sidebar */}
      <div className="w-full md:w-[400px] md:min-h-screen bg-stone-100/90 backdrop-blur-3xl border-r border-stone-200/50 p-6 flex flex-col gap-6 z-20 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.05)] overflow-y-auto">
        
        {/* Search Form (Top Left - Always displayed) */}
        <div className="bg-white rounded-3xl shadow-xl p-8 space-y-8 text-center shrink-0">
          <div className="space-y-2">
            <h1 className="text-3xl font-serif text-stone-800 tracking-wider">Time-Leap Cal</h1>
            <p className="text-stone-500 font-sans text-xs mt-2">西暦から過去の空気感へタイムスリップ</p>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="1995 または 平成7"
              className="w-full text-center px-6 py-4 bg-stone-50 rounded-2xl text-xl font-serif text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-400 placeholder:text-stone-300 transition border border-stone-100"
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 bottom-2 aspect-square bg-stone-800 text-white rounded-xl flex items-center justify-center hover:bg-stone-700 transition"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>

          {birthDate ? (
            <p className="text-xs text-stone-500 bg-stone-50 py-2 rounded-full border border-stone-100 flex items-center justify-center gap-2">
              <CalendarHeart className="w-4 h-4 text-rose-400" />
              生年月日登録済み
            </p>
          ) : (
            <button 
              onClick={() => setShowSettings(true)}
              className="text-xs text-indigo-500 hover:text-indigo-600 underline font-medium"
            >
              生年月日を登録してパーソナライズする
            </button>
          )}
        </div>

        {/* Events Card (Appears below when inputted) */}
        {activeYear && yearData && (
          <div className={`${theme.card} backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl flex flex-col gap-6 animate-slide-up text-white`}>
            <div>
              <h3 className="text-sm font-sans tracking-widest opacity-70 mb-4 uppercase">主な出来事</h3>
              <ul className="space-y-4">
                {yearData.events.map((event, i) => (
                  <li key={i} className={`text-lg ${theme.fontTitle} leading-snug`}>{event}</li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <div>
                <h4 className="text-xs font-sans opacity-60 mb-2">流行語</h4>
                <p className={`text-sm font-bold ${theme.fontTitle}`}>{yearData.buzzwords[0]}</p>
              </div>
              <div>
                <h4 className="text-xs font-sans opacity-60 mb-2">ヒット曲</h4>
                <p className={`text-sm font-bold ${theme.fontTitle}`}>{yearData.songs[0]}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Content Area (Output result) */}
      <div className={`flex-1 relative overflow-hidden flex flex-col ${activeYear ? theme.text : 'text-stone-800'}`}>
        {activeYear && yearData ? (
          <>
            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
              <img 
                src={yearData.imageUrl} 
                alt={`${activeYear}年の風景`}
                className="w-full h-full object-cover object-center animate-ken-burns scale-105"
              />
              <div className={`absolute inset-0 ${theme.bg} opacity-40 mix-blend-color`}></div>
              <div className={`absolute inset-0 ${theme.bg} opacity-40`}></div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            </div>

            <div className="relative z-10 flex-1 flex flex-col p-6 md:p-12 items-center justify-center min-h-screen">
              <header className="absolute top-6 right-6 z-20">
                <button 
                  onClick={() => shareToTwitter(yearData, lifeStage)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white backdrop-blur-md transition shadow-lg"
                >
                  <Share className="w-5 h-5" />
                  <span className="font-medium font-sans text-sm">シェア</span>
                </button>
              </header>

              <div className="text-center space-y-4 mb-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-2xl md:text-4xl font-sans tracking-[0.2em] opacity-90 uppercase text-white drop-shadow-md">{activeYear}</h2>
                <h1 className={`text-7xl md:text-9xl font-bold tracking-widest ${theme.fontTitle} drop-shadow-2xl text-white`}>
                  {eraText}
                </h1>
              </div>

              {/* Life Stage Card on exactly the output result right pane */}
              {lifeStage && (
                <div className={`${theme.card} backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl animate-slide-up max-w-sm w-full text-white text-center`} style={{ animationDelay: '0.4s' }}>
                  <h3 className="text-sm font-sans tracking-widest opacity-80 mb-6 flex items-center justify-center gap-2 uppercase">
                    <Calendar className="w-4 h-4" />
                    あなたの軌跡
                  </h3>
                  {lifeStage.stage === '生まれる前' ? (
                    <p className={`text-3xl ${theme.fontTitle} leading-relaxed`}>まだこの世に<br/>生まれていません</p>
                  ) : (
                    <>
                      <div className="flex items-end justify-center gap-2 mb-2">
                        <span className={`text-7xl font-bold ${theme.fontTitle}`}>{lifeStage.age}</span>
                        <span className="text-2xl mb-2 opacity-90">歳</span>
                      </div>
                      <p className={`text-3xl ${theme.fontTitle} mt-4`}>{lifeStage.stage}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-40">
            <Search className="w-20 h-20 mb-6 text-stone-400" />
            <h2 className="text-2xl font-serif text-center text-stone-500 leading-relaxed">
              左側のパネルに年を入力して<br/>タイムスリップしましょう
            </h2>
          </div>
        )}
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

function SettingsModal({ birthDate, onClose, onSave }: { birthDate: string, onClose: () => void, onSave: (d: string) => void }) {
  const [date, setDate] = useState(birthDate || '1990-04-01');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
        <h2 className="text-2xl font-bold text-stone-800 mb-2">生年月日を設定</h2>
        <p className="text-stone-500 text-sm mb-6">設定すると、その時あなたが何歳のどんな時期だったかを表示します。</p>
        
        <input 
          type="date" 
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-stone-100 px-4 py-3 rounded-xl border-none focus:ring-2 focus:ring-stone-400 text-stone-800 mb-8"
        />
        
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-stone-600 font-medium hover:bg-stone-100 transition"
          >
            キャンセル
          </button>
          <button 
            onClick={() => onSave(date)}
            className="flex-1 py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 transition shadow-lg shadow-stone-800/20"
          >
            保存する
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
