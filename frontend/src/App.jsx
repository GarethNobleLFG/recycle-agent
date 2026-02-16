import React, { useState } from 'react';
{/* For location-based disposal guidelines, we'll likely end up sending the model's prediction to an LLM like Gemini and let it search and fetch the relevant data.*/}
const REGIONAL_DATABASE = {
  "90210": { city: "Beverly Hills", instruction: "All plastics 1-7 & glass accepted. Rinse containers." },
  "10001": { city: "New York", instruction: "Metal and rigid plastics only. Bundle paper separately." },
  "94105": { city: "San Francisco", instruction: "Advanced composting available. No soft plastics." }
};

export default function App() {
  const [zip, setZip] = useState('');
  const [image, setImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setAnalysis(null);
    }
  };

  const runSmartAnalysis = () => {
    setIsProcessing(true);
    // Mock Data
    setTimeout(() => {
      setAnalysis({
        result: "RECYCLE",
        confidence: 98.4,
        material: "High-Density Polyethylene",
        top3: [
          { label: "PET Plastic", prob: 98.4, color: "bg-emerald-500" },
          { label: "Mixed Glass", prob: 1.2, color: "bg-blue-500" },
          { label: "Cellulose", prob: 0.4, color: "bg-zinc-600" }
        ],
        stats: { carbon: "2.4kg", water: "15L", energy: "4.2kWh" }
      });
      setIsProcessing(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans p-6 overflow-hidden flex flex-col">
      {/* Top Navigation Bar */}
      <header className="flex justify-between items-center mb-10 border-b border-zinc-800/50 pb-6">
        <div className="flex items-center gap-4 group cursor-default">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
              <path d="M21 4L37.4545 13.5V32.5L21 42L4.54545 32.5V13.5L21 4Z" className="stroke-zinc-700" strokeWidth="1" />
              <path d="M21 8L34 15.5V29.5L21 37L8 29.5V15.5L21 8Z" className="fill-emerald-500/10 stroke-emerald-500" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="21" cy="22.5" r="4" className="fill-emerald-500 animate-pulse" />
              <path d="M21 12V16M29 27L25.5 25M13 27L16.5 25" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black leading-none tracking-tighter text-white">
              ECO<span className="text-emerald-500">SENSE</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="h-[1px] w-4 bg-emerald-500/50" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.3em]">Neural Material Lab</span>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-900/80 border border-zinc-800 px-4 py-2.5 rounded-xl flex items-center gap-4 shadow-2xl">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Regional Node</span>
            <input 
              className="bg-transparent border-none p-0 focus:ring-0 text-sm font-mono text-emerald-400 w-24 placeholder:text-zinc-800"
              placeholder="SET ZIP" value={zip} onChange={(e) => setZip(e.target.value)}
            />
          </div>
          <div className="w-[1px] h-6 bg-zinc-800" />
          <div className={`w-2 h-2 rounded-full ${zip ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-zinc-800'} transition-all duration-500`} />
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 grid grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full">
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex-1 flex flex-col">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Image Source</h3>
            <div className="flex-1 relative rounded-2xl border-2 border-dashed border-zinc-800 flex flex-col items-center justify-center overflow-hidden group hover:border-emerald-500/50 transition-colors">
              {!image ? (
                <label className="cursor-pointer text-center p-10">
                  <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <p className="font-bold text-zinc-300">Upload Photo</p>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <>
                  <img src={image} className="w-full h-full object-cover opacity-80" alt="Target" />
                  {isProcessing && (
                    <div className="absolute inset-0 z-10">
                      <div className="h-1 bg-emerald-500 shadow-[0_0_20px_#10b981] absolute w-full animate-[scan_2s_infinite]" />
                      <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
                    </div>
                  )}
                  <button onClick={() => setImage(null)} className="absolute top-4 right-4 bg-black/60 px-3 py-1.5 rounded-md text-[10px] font-bold border border-white/10 backdrop-blur-md hover:bg-red-900/40 transition">REMOVE</button>
                </>
              )}
            </div>
            <button 
              onClick={runSmartAnalysis}
              disabled={!image || isProcessing}
              className="w-full mt-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-20 active:scale-[0.98]"
            >
              {isProcessing ? "Analyzing..." : "Classify Material"}
            </button>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-8 space-y-6">
          {analysis ? (
            <div className="grid grid-cols-2 gap-6 h-full animate-in fade-in slide-in-from-right-12 duration-700">
              <div className="col-span-2 md:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex flex-col justify-between">
                <div>
                  <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 mb-12 inline-block tracking-tighter">Analysis Complete</span>
                  <h2 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-2 text-zinc-600">Final Recommendation</h2>
                  <div className="text-7xl font-black italic tracking-tighter text-emerald-500 mb-4 uppercase">{analysis.result}</div>
                  <p className="text-zinc-400 text-sm font-medium border-l-2 border-emerald-500 pl-4">{analysis.material}</p>
                </div>
                <div className="mt-auto pt-8 flex gap-4">
                   <div className="flex-1 bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800 text-center">
                      <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">Carbon Saved</p>
                      <p className="text-xl font-bold">{analysis.stats.carbon}</p>
                   </div>
                   <div className="flex-1 bg-zinc-800/30 p-4 rounded-2xl border border-zinc-800 text-center">
                      <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">AI Confidence</p>
                      <p className="text-xl font-bold text-emerald-500">{analysis.confidence}%</p>
                   </div>
                </div>
              </div>

              <div className="col-span-2 md:col-span-1 space-y-6">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 h-1/2">
                   <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-6">Top-3 Predictions</h3>
                   <div className="space-y-5">
                      {analysis.top3.map((item, i) => (
                        <div key={i} className="space-y-2">
                           <div className="flex justify-between text-xs font-bold font-mono uppercase">
                              <span className="text-zinc-400">{item.label}</span>
                              <span className="text-emerald-500">{item.prob}%</span>
                           </div>
                           <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color} transition-all duration-[2s]`} style={{ width: `${item.prob}%` }} />
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <div className="bg-emerald-500 text-black rounded-3xl p-8 h-[calc(50%-1.5rem)] flex flex-col justify-center shadow-xl">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Location-Based Rules</h3>
                   <p className="text-2xl font-black leading-tight">
                     {REGIONAL_DATABASE[zip]?.instruction || "Standard disposal rules apply. Provide zip code for localized guidance."}
                   </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-zinc-900/20 border border-dashed border-zinc-800 rounded-[2.5rem] flex items-center justify-center text-zinc-700">
               <p className="text-sm font-black uppercase tracking-[0.2em]">Ready for Analysis</p>
            </div>
          )}
        </div>
      </main>

      <footer className="mt-6 flex justify-center items-center text-[10px] font-black text-zinc-600 uppercase tracking-widest gap-8">
         <p>Neural Core v1.0</p>
         <p>scikit-learn</p>
         <p>FastAPI</p>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan { 0%, 100% { top: 0% } 50% { top: 100% } }
      `}} />
    </div>
  );
}
