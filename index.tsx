import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import {
  Book,
  Heart,
  Award,
  Settings,
  PlusCircle,
  Sparkles,
  Calendar,
  Smile,
  Frown,
  Meh,
  Brain,
  CheckCircle2,
  ChevronRight,
  Lightbulb
} from "lucide-react";

// --- Types ---

type Mood = "very_sad" | "sad" | "neutral" | "happy" | "very_happy";

interface JournalEntry {
  id: string;
  date: string; // ISO string
  content: string;
  mood: Mood;
  negativeThought?: string;
  cbtSuggestion?: string;
  prompt?: string; // If answered a specific prompt
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  condition: (entries: JournalEntry[]) => boolean;
}

interface UserSettings {
  reminderTime: string;
  reminderEnabled: boolean;
}

// --- Configuration & AI Setup ---

const SYSTEM_INSTRUCTION = `
You are an empathetic, warm, and professional CBT (Cognitive Behavioral Therapy) assistant embedded in a gratitude journal.
Your goal is to help the user challenge negative thoughts using CBT techniques (like identifying cognitive distortions, reframing, or reality testing) while validating their feelings.
Keep your response concise (under 150 words), structured, and gentle.
Structure your response in Markdown:
**1. 识别与共情 (Validation):** Briefly validate their emotion.
**2. 思维误区 (Distortion):** Identify potential cognitive distortions (e.g., All-or-nothing thinking, Catastrophizing).
**3. 新的视角 (Reframe):** Offer a healthier, more balanced perspective or a question to ask themselves.
`;

// --- Helper Data ---

const MOODS: { value: Mood; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "very_sad", label: "难过", icon: <Frown />, color: "text-blue-500" },
  { value: "sad", label: "低落", icon: <Meh />, color: "text-indigo-400" },
  { value: "neutral", label: "平静", icon: <Smile />, color: "text-gray-400" },
  { value: "happy", label: "开心", icon: <Smile />, color: "text-yellow-500" },
  { value: "very_happy", label: "极好", icon: <Heart />, color: "text-red-400" },
];

const GUIDED_EXERCISES = [
  {
    id: "daily_small_joy",
    title: "每日微小快乐",
    description: "发现生活中容易被忽视的美好。",
    prompt: "今天有一件什么小事（哪怕很微不足道）让你感到了一丝快乐或平静？",
    frequency: "Daily"
  },
  {
    id: "weekly_relationship",
    title: "人际关系反思",
    description: "回顾本周的连接。",
    prompt: "回顾本周，谁对你提供了支持或善意？你想对他说些什么？",
    frequency: "Weekly"
  },
  {
    id: "strength_focus",
    title: "自我力量确认",
    description: "CBT积极聚焦练习。",
    prompt: "写下你今天克服的一个小困难，这体现了你的什么优点？",
    frequency: "Anytime"
  }
];

// --- Components ---

const App = () => {
  // -- State --
  const [activeTab, setActiveTab] = useState<"home" | "journal" | "exercises" | "profile">("home");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ reminderTime: "20:00", reminderEnabled: false });
  const [badges, setBadges] = useState<Badge[]>([
    {
      id: "first_step",
      name: "起步者",
      description: "完成你的第一篇感恩日记。",
      icon: <Book size={20} />,
      unlocked: false,
      condition: (e) => e.length >= 1
    },
    {
      id: "streak_3",
      name: "三日连胜",
      description: "连续记录3天。",
      icon: <Sparkles size={20} />,
      unlocked: false,
      condition: (e) => {
        // Simplified streak logic for demo
        if (e.length < 3) return false;
        return true; 
      }
    },
    {
      id: "cbt_explorer",
      name: "思维探索者",
      description: "完成一次负面思维重构练习。",
      icon: <Brain size={20} />,
      unlocked: false,
      condition: (e) => e.some(entry => !!entry.cbtSuggestion)
    },
    {
      id: "master_10",
      name: "感恩大师",
      description: "累计记录10件感恩之事。",
      icon: <Award size={20} />,
      unlocked: false,
      condition: (e) => e.length >= 10
    }
  ]);

  // -- AI Logic --
  const [isGenerating, setIsGenerating] = useState(false);
  
  // -- Effects --
  useEffect(() => {
    const savedEntries = localStorage.getItem("mm_entries");
    if (savedEntries) setEntries(JSON.parse(savedEntries));
    
    const savedSettings = localStorage.getItem("mm_settings");
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  useEffect(() => {
    localStorage.setItem("mm_entries", JSON.stringify(entries));
    
    // Update badges based on new entries
    setBadges(prev => prev.map(badge => ({
      ...badge,
      unlocked: badge.condition(entries)
    })));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem("mm_settings", JSON.stringify(settings));
  }, [settings]);

  // -- Handlers --
  
  const handleSaveEntry = (entry: JournalEntry) => {
    setEntries([entry, ...entries]);
    setActiveTab("home");
  };

  const handleNavigateToExercise = (prompt: string) => {
    // We need to pass this prompt to the journal tab. 
    // For simplicity in this structure, we'll use a custom event or prop drilling.
    // Here, let's assume the Journal component checks a global or prop.
    // Re-implementing Journal to accept an initial prompt prop is cleaner.
    // For now, we will set a temporary state in a real app, but here I'll handle it via state lifting if needed.
    // Actually, let's pass it via a simple state object for the active view.
    setViewProps({ prompt });
    setActiveTab("journal");
  };

  const [viewProps, setViewProps] = useState<{ prompt?: string }>({});

  // -- Render Views --

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeView entries={entries} badges={badges} onWrite={() => { setViewProps({}); setActiveTab("journal"); }} />;
      case "journal":
        return <JournalView onSave={handleSaveEntry} initialPrompt={viewProps.prompt} />;
      case "exercises":
        return <ExercisesView onSelect={handleNavigateToExercise} />;
      case "profile":
        return <ProfileView entries={entries} badges={badges} settings={settings} setSettings={setSettings} />;
      default:
        return <HomeView entries={entries} badges={badges} onWrite={() => setActiveTab("journal")} />;
    }
  };

  return (
    <div className="min-h-screen bg-sage-50 text-gray-800 font-sans max-w-md mx-auto shadow-xl relative overflow-hidden">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 px-6 py-4 border-b border-sage-100 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-sage-700 tracking-tight">Mindful Moments</h1>
          <p className="text-xs text-gray-500">感恩日记 & 心理疗愈</p>
        </div>
        <div className="flex items-center gap-2 bg-sage-100 px-3 py-1 rounded-full">
          <Sparkles size={14} className="text-sage-700" />
          <span className="text-xs font-bold text-sage-700">{entries.length} 记录</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-24 px-4 pt-6">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 max-w-md mx-auto">
        <NavButton icon={<Book />} label="日记" active={activeTab === "home"} onClick={() => setActiveTab("home")} />
        <NavButton icon={<Lightbulb />} label="练习" active={activeTab === "exercises"} onClick={() => setActiveTab("exercises")} />
        
        <button 
          onClick={() => { setViewProps({}); setActiveTab("journal"); }}
          className="bg-sage-500 hover:bg-sage-700 text-white p-4 rounded-full shadow-lg transform -translate-y-4 transition-all active:scale-95"
          aria-label="New Entry"
        >
          <PlusCircle size={28} />
        </button>
        
        <NavButton icon={<Brain />} label="记录" active={activeTab === "journal"} onClick={() => setActiveTab("journal")} /> 
        {/* Note: "记录" usually means "Write" but mapped to Journal tab logic for UI balance */}
        
        <NavButton icon={<Award />} label="成就" active={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
      </nav>
    </div>
  );
};

// --- Sub Components ---

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-sage-700' : 'text-gray-400'}`}
  >
    {React.cloneElement(icon as React.ReactElement<any>, { size: 20, strokeWidth: active ? 2.5 : 2 })}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

const HomeView = ({ entries, badges, onWrite }: { entries: JournalEntry[], badges: Badge[], onWrite: () => void }) => {
  const recentEntries = entries.slice(0, 3);
  const dailyPrompt = GUIDED_EXERCISES[0]; // Simplified for demo

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-br from-sage-500 to-sage-700 text-white rounded-2xl p-6 shadow-lg shadow-sage-200">
        <h2 className="text-2xl font-bold mb-2">你好, 朋友</h2>
        <p className="opacity-90 text-sm mb-4">每一次记录感恩，都是对大脑的一次积极重塑。</p>
        <button 
          onClick={onWrite}
          className="bg-white text-sage-700 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-opacity-90 transition-colors"
        >
          开始今天的记录
        </button>
      </div>

      {/* Daily Prompt */}
      <div className="bg-apricot-50 border border-apricot-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2 text-orange-400">
          <Lightbulb size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">每日思考</span>
        </div>
        <p className="text-gray-800 font-medium mb-3">{dailyPrompt.prompt}</p>
        <button onClick={onWrite} className="text-xs text-orange-500 font-semibold flex items-center hover:underline">
          回答这个问题 <ChevronRight size={14} />
        </button>
      </div>

      {/* Recent Entries */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-3">近期回忆</h3>
        {recentEntries.length === 0 ? (
          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200">
            <div className="inline-block p-3 bg-gray-50 rounded-full mb-2 text-gray-300"><Book size={24} /></div>
            <p className="text-gray-400 text-sm">还没有记录，今天开始吧！</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map(entry => (
              <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs text-gray-400">{new Date(entry.date).toLocaleDateString()}</span>
                  <div className="scale-75">{MOODS.find(m => m.value === entry.mood)?.icon}</div>
                </div>
                <p className="text-gray-700 text-sm line-clamp-2">{entry.content}</p>
                {entry.cbtSuggestion && (
                   <div className="mt-2 flex items-center gap-1 text-xs text-sage-600 bg-sage-50 px-2 py-1 rounded w-fit">
                      <Sparkles size={12} />
                      <span>包含 AI 疗愈建议</span>
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const JournalView = ({ onSave, initialPrompt }: { onSave: (e: JournalEntry) => void, initialPrompt?: string }) => {
  const [content, setContent] = useState("");
  const [mood, setMood] = useState<Mood>("neutral");
  const [showCBT, setShowCBT] = useState(false);
  const [negativeThought, setNegativeThought] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isAnalysing, setIsAnalysing] = useState(false);

  const handleAnalyzeCBT = async () => {
    if (!negativeThought) return;
    setIsAnalysing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Build the prompt
      const prompt = `
        User's Negative Thought: "${negativeThought}"
        User's Current Mood: ${mood}
        
        Please analyze this thought using CBT principles.
      `;

      // 2. Call API
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { role: "user", parts: [{ text: prompt }] },
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      
      setAiSuggestion(response.text);
    } catch (e) {
      console.error(e);
      setAiSuggestion("抱歉，AI 暂时无法连接。请试着问自己：这个想法是100%真实的吗？");
    } finally {
      setIsAnalysing(false);
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content,
      mood,
      negativeThought: showCBT ? negativeThought : undefined,
      cbtSuggestion: showCBT ? aiSuggestion : undefined,
      prompt: initialPrompt
    };
    onSave(newEntry);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Prompt Display */}
      <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-sage-500">
        <h3 className="text-sm font-semibold text-gray-500 mb-1">今日提示</h3>
        <p className="text-lg font-medium text-sage-800">
          {initialPrompt || "今天发生了什么让你心存感激的事？"}
        </p>
      </div>

      {/* Mood Selector */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">此刻心情</label>
        <div className="flex justify-between px-2">
          {MOODS.map((m) => (
            <button
              key={m.value}
              onClick={() => setMood(m.value)}
              className={`flex flex-col items-center gap-1 transition-transform ${mood === m.value ? 'scale-125' : 'opacity-50 hover:opacity-100'}`}
            >
              <div className={`text-2xl ${mood === m.value ? m.color : 'text-gray-400'}`}>{m.icon}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Input */}
      <div className="bg-white p-4 rounded-xl shadow-sm h-40 relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="在这里写下你的想法..."
          className="w-full h-full resize-none outline-none text-gray-700 placeholder-gray-300 bg-transparent"
        />
      </div>

      {/* CBT Toggle Section */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <button 
          onClick={() => setShowCBT(!showCBT)}
          className="w-full px-4 py-3 flex items-center justify-between bg-apricot-50 text-orange-800 hover:bg-apricot-100 transition-colors"
        >
          <span className="text-sm font-semibold flex items-center gap-2">
            <Brain size={16} />
            有些负面情绪需要处理？
          </span>
          <ChevronRight size={16} className={`transform transition-transform ${showCBT ? 'rotate-90' : ''}`} />
        </button>

        {showCBT && (
          <div className="p-4 bg-apricot-50/50 border-t border-apricot-100">
            <label className="text-xs text-gray-500 mb-2 block">是什么想法让你感到困扰？</label>
            <textarea
              value={negativeThought}
              onChange={(e) => setNegativeThought(e.target.value)}
              placeholder="例如：我觉得我也许做不好这件事..."
              className="w-full p-3 rounded-lg border border-apricot-200 text-sm mb-3 focus:ring-2 focus:ring-orange-200 outline-none bg-white"
              rows={3}
            />
            
            {!aiSuggestion ? (
              <button
                onClick={handleAnalyzeCBT}
                disabled={isAnalysing || !negativeThought}
                className="w-full py-2 bg-white border border-orange-200 text-orange-600 rounded-lg text-sm font-medium shadow-sm hover:bg-orange-50 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isAnalysing ? <span className="animate-pulse">AI 正在思考...</span> : <><Sparkles size={16} /> 获取 CBT 重构建议</>}
              </button>
            ) : (
              <div className="bg-white p-4 rounded-lg border border-sage-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-sage-700">
                  <Sparkles size={16} />
                  <span className="text-sm font-bold">AI 疗愈师建议</span>
                </div>
                <div className="prose prose-sm prose-sage text-gray-600 text-sm leading-relaxed whitespace-pre-line">
                  {aiSuggestion}
                </div>
                <button onClick={() => setAiSuggestion("")} className="text-xs text-gray-400 mt-2 underline">重新生成</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save Action */}
      <button
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="w-full bg-sage-500 text-white py-4 rounded-xl font-semibold shadow-lg shadow-sage-200 hover:bg-sage-600 transition-all disabled:opacity-50 disabled:shadow-none active:scale-98"
      >
        保存日记
      </button>
    </div>
  );
};

const ExercisesView = ({ onSelect }: { onSelect: (prompt: string) => void }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-sage-800 px-1">引导式练习</h2>
      <p className="text-sm text-gray-500 px-1 -mt-2 mb-4">通过科学的提问重塑思维模式。</p>

      {GUIDED_EXERCISES.map((ex) => (
        <div 
          key={ex.id} 
          onClick={() => onSelect(ex.prompt)}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-sage-300 transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${ex.frequency === 'Daily' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
              {ex.frequency === 'Daily' ? '每日' : ex.frequency === 'Weekly' ? '每周' : '随时'}
            </span>
            <ChevronRight className="text-gray-300 group-hover:text-sage-500" size={20} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">{ex.title}</h3>
          <p className="text-sm text-gray-500 mb-3">{ex.description}</p>
          <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 italic border-l-2 border-sage-400">
            "{ex.prompt}"
          </div>
        </div>
      ))}
    </div>
  );
};

const ProfileView = ({ entries, badges, settings, setSettings }: { entries: JournalEntry[], badges: Badge[], settings: UserSettings, setSettings: (s: UserSettings) => void }) => {
  return (
    <div className="space-y-8">
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm text-center border border-gray-50">
          <div className="text-3xl font-bold text-sage-600 mb-1">{entries.length}</div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">总日记数</div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm text-center border border-gray-50">
          <div className="text-3xl font-bold text-orange-400 mb-1">
             {badges.filter(b => b.unlocked).length}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">获得徽章</div>
        </div>
      </div>

      {/* Badges Section */}
      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Award className="text-sage-500" size={20}/> 成就墙
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {badges.map(badge => (
            <div key={badge.id} className={`flex flex-col items-center p-3 rounded-xl border text-center transition-all ${badge.unlocked ? 'bg-white border-sage-200 shadow-sm' : 'bg-gray-50 border-transparent opacity-50 grayscale'}`}>
              <div className={`p-3 rounded-full mb-2 ${badge.unlocked ? 'bg-sage-50 text-sage-600' : 'bg-gray-200 text-gray-400'}`}>
                {badge.icon}
              </div>
              <div className="text-xs font-bold text-gray-700 mb-1">{badge.name}</div>
              {badge.unlocked && <div className="text-[10px] text-gray-400 leading-tight">{badge.description}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Settings className="text-gray-400" size={20}/> 设置
        </h3>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-medium text-gray-700">每日提醒</div>
            <div className="text-xs text-gray-400">建立固定记录习惯</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.reminderEnabled}
              onChange={(e) => setSettings({...settings, reminderEnabled: e.target.checked})} 
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sage-500"></div>
          </label>
        </div>

        {settings.reminderEnabled && (
          <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
            <Calendar size={18} className="text-gray-400"/>
            <input 
              type="time" 
              value={settings.reminderTime}
              onChange={(e) => setSettings({...settings, reminderTime: e.target.value})}
              className="bg-transparent outline-none text-gray-700 font-medium"
            />
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-300 py-4">
        Mindful Moments v1.0 • Created with Gemini
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById("root")!);
root.render(<App />);