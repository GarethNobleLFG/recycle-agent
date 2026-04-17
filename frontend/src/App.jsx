import React, { useState } from 'react';
import { useClassify } from './hooks/classify';

{/* For location-based disposal guidelines, we'll likely end up sending the model's prediction to an LLM like Gemini and let it search and fetch the relevant data.*/ }
const REGIONAL_DATABASE = {
  "90210": { city: "Beverly Hills", instruction: "All plastics 1-7 & glass accepted. Rinse containers." },
  "10001": { city: "New York", instruction: "Metal and rigid plastics only. Bundle paper separately." },
  "94105": { city: "San Francisco", instruction: "Advanced composting available. No soft plastics." }
};

// Explicit class → category mapping. Substring matching is unreliable
// (e.g. "styrofoam_food_containers" accidentally matches "food").
// Each class maps to exactly one disposal pathway.
const CLASS_TO_CATEGORY = {
  // Curbside recycling
  cardboard: 'RECYCLE',
  glass_containers: 'RECYCLE',
  magazines: 'RECYCLE',
  metal_cans: 'RECYCLE',
  newspaper: 'RECYCLE',
  office_paper: 'RECYCLE',
  plastic_beverage_bottles: 'RECYCLE',
  plastic_cup_lids: 'RECYCLE',
  plastic_detergent_bottles: 'RECYCLE',
  plastic_food_containers: 'RECYCLE',

  // Organic waste
  coffee_grounds: 'COMPOST',
  eggshells: 'COMPOST',
  food_waste: 'COMPOST',
  tea_bags: 'COMPOST',

  // Second-life items
  clothing: 'DONATE',
  shoes: 'DONATE',

  // Landfill — includes items that need specialty drop-off
  aerosol_cans: 'TRASH',
  disposable_cups: 'TRASH',
  disposable_plastic_cutlery: 'TRASH',
  plastic_shopping_bags: 'TRASH',
  plastic_straws: 'TRASH',
  plastic_trash_bags: 'TRASH',
  styrofoam_food_containers: 'TRASH'
};

// Map a model label to a category. Falls back to substring matching
// if an unknown class appears, so the app degrades gracefully.
const mapToCategory = (material) => {
  if (!material) return 'TRASH';
  const key = material.toLowerCase().trim();
  if (CLASS_TO_CATEGORY[key]) return CLASS_TO_CATEGORY[key];

  // Graceful fallback for unknown labels
  if (key.includes('glass') || key.includes('metal') || key.includes('paper') ||
      key.includes('cardboard') || key.includes('bottle')) return 'RECYCLE';
  if (key.includes('food') || key.includes('coffee') || key.includes('egg') ||
      key.includes('tea')) return 'COMPOST';
  if (key.includes('cloth') || key.includes('shoe')) return 'DONATE';
  return 'TRASH';
};

// Per-class prep steps — what to actually do at the bin.
// Kept concise (2–4 steps) and honest: drop-off hints are in TRASH category
// where applicable, since those items aren't curbside recyclable in most US cities.
const CLASS_PREP_STEPS = {
  // --- RECYCLE ---
  cardboard: [
    'Flatten boxes to save space',
    'Remove all tape and labels',
    'Keep dry — wet cardboard is trash'
  ],
  glass_containers: [
    'Rinse thoroughly',
    'Remove metal lids (recycle separately)',
    'Leave labels on — OK to recycle with'
  ],
  magazines: [
    'Remove plastic wrappers',
    'No need to tear off covers',
    'Keep dry and clean'
  ],
  metal_cans: [
    'Rinse food residue',
    'Leave labels attached',
    'Crush if space is tight'
  ],
  newspaper: [
    'Stack flat or bundle',
    'Keep dry and clean',
    'Remove any plastic inserts'
  ],
  office_paper: [
    'Remove staples and paper clips',
    'No shredded paper in curbside bin',
    'Shredded paper needs drop-off'
  ],
  plastic_beverage_bottles: [
    'Empty completely',
    'Leave cap on — most facilities accept',
    'No need to remove label'
  ],
  plastic_cup_lids: [
    'Rinse off residue',
    'Check recycling number (1, 2, 5 common)',
    'Separate from cup if mixed materials'
  ],
  plastic_detergent_bottles: [
    'Rinse out remaining soap',
    'Leave cap on',
    'Labels can stay'
  ],
  plastic_food_containers: [
    'Rinse food residue',
    'Remove film or foil lids',
    'Check number on bottom (1, 2, 5 usually accepted)'
  ],

  // --- COMPOST ---
  coffee_grounds: [
    'Include paper filter if unbleached',
    'No plastic pods or capsules',
    'Great for nitrogen-rich compost'
  ],
  eggshells: [
    'Crush for faster breakdown',
    'Rinse off any egg residue',
    'No need to remove membrane'
  ],
  food_waste: [
    'Break into smaller pieces',
    'Drain excess liquid',
    'No meat or dairy in home compost'
  ],
  tea_bags: [
    'Check bag for plastic (many contain it)',
    'Remove staples and strings',
    'Loose tea leaves always safe'
  ],

  // --- DONATE ---
  clothing: [
    'Confirm item is clean and wearable',
    'Tears or stains? Textile recycling instead',
    'Drop at shelter, thrift store, or H&M take-back'
  ],
  shoes: [
    'Confirm pair is intact and usable',
    'Tie laces together before donating',
    'Worn out? Check Nike Reuse-A-Shoe program'
  ],

  // --- TRASH ---
  aerosol_cans: [
    'Only trash if fully empty',
    'Pressurized cans are hazardous waste',
    'Check local household hazmat drop-off'
  ],
  disposable_cups: [
    'Most have plastic lining — not recyclable',
    'Empty liquid first',
    'Separate plastic lid if recyclable'
  ],
  disposable_plastic_cutlery: [
    'Too small for sorting machinery',
    'Rinse if food-covered',
    'Switch to reusable next time'
  ],
  plastic_shopping_bags: [
    'Never in curbside — clogs equipment',
    'Drop at grocery store front-of-store bins',
    'Bundle multiple bags together'
  ],
  plastic_straws: [
    'Too small for recycling sorters',
    'No drop-off accepts these',
    'Paper or reusable alternatives exist'
  ],
  plastic_trash_bags: [
    'Goes to landfill with contents',
    'Do not put in recycling bin',
    'Reuse larger bags where possible'
  ],
  styrofoam_food_containers: [
    'Rarely accepted curbside',
    'Some UPS stores accept clean pieces',
    'Rinse if visiting a drop-off site'
  ]
};

// Fallback prep by category, used if an unknown class appears.
const CATEGORY_FALLBACK_STEPS = {
  RECYCLE: ['Rinse residue', 'Remove caps & labels', 'Flatten if possible'],
  COMPOST: ['Break into smaller pieces', 'Drain excess liquid', 'Keep free of plastic'],
  DONATE: ['Confirm item is in good condition', 'Clean before donating', 'Find a local drop-off'],
  TRASH: ['Bag securely', 'Avoid liquids', 'Check for hazardous content']
};

// Resolve prep steps for a given class label, with graceful fallback.
const getPrepSteps = (classLabel, category) => {
  if (classLabel && CLASS_PREP_STEPS[classLabel.toLowerCase()]) {
    return CLASS_PREP_STEPS[classLabel.toLowerCase()];
  }
  return CATEGORY_FALLBACK_STEPS[category] || CATEGORY_FALLBACK_STEPS.TRASH;
};

// Convert a raw class label like "plastic_beverage_bottles" into a human-readable
// form like "Plastic Beverage Bottles" for display.
const prettifyLabel = (label) => {
  if (!label) return '';
  return label
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// SVG glyphs for each category — drawn inline so they inherit currentColor.
// Shapes are deliberately minimal to match the editorial aesthetic.
const CategoryIcon = ({ category, className = '' }) => {
  const common = {
    className,
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round',
    strokeLinejoin: 'round'
  };

  if (category === 'RECYCLE') {
    return (
      <svg {...common}>
        <path d="M24 8 L32 22 L16 22 Z" opacity="0.3" />
        <path d="M24 8 L30 18" />
        <path d="M24 8 L18 18" />
        <path d="M10 30 L18 30 L14 37 Z" opacity="0.3" />
        <path d="M38 30 L30 30 L34 37 Z" opacity="0.3" />
        <circle cx="24" cy="24" r="18" opacity="0.15" strokeDasharray="2 3" />
      </svg>
    );
  }
  if (category === 'COMPOST') {
    return (
      <svg {...common}>
        <path d="M12 36 C12 20, 24 12, 36 12 C36 24, 28 36, 12 36 Z" />
        <path d="M12 36 L30 18" opacity="0.5" />
        <path d="M18 30 L24 24" opacity="0.4" />
        <path d="M22 34 L28 28" opacity="0.4" />
        <circle cx="24" cy="24" r="18" opacity="0.15" strokeDasharray="2 3" />
      </svg>
    );
  }
  if (category === 'DONATE') {
    // Open hands holding an item — two curves meeting at the center
    return (
      <svg {...common}>
        <path d="M8 26 C8 22, 12 20, 16 22 L24 28 L32 22 C36 20, 40 22, 40 26" />
        <path d="M12 26 L12 32 C12 34, 14 36, 16 36 L32 36 C34 36, 36 34, 36 32 L36 26" opacity="0.5" />
        <path d="M24 14 L24 22" />
        <path d="M20 18 L24 14 L28 18" opacity="0.7" />
        <circle cx="24" cy="24" r="18" opacity="0.15" strokeDasharray="2 3" />
      </svg>
    );
  }
  // TRASH
  return (
    <svg {...common}>
      <path d="M14 14 L34 14 L32 38 L16 38 Z" />
      <path d="M10 14 L38 14" />
      <path d="M20 10 L28 10" />
      <path d="M20 20 L20 32" opacity="0.5" />
      <path d="M24 20 L24 32" opacity="0.5" />
      <path d="M28 20 L28 32" opacity="0.5" />
      <circle cx="24" cy="24" r="18" opacity="0.15" strokeDasharray="2 3" />
    </svg>
  );
};

// Compute verdict from entropy + margin thresholds.
// Returns { label, description, tone } — tone is used for color accent.
const computeVerdict = (metrics) => {
  const { entropyNormalized, margin } = metrics;

  if (entropyNormalized < 0.35 && margin > 30) {
    return {
      label: 'DECISIVE',
      description: 'High confidence, one class dominates',
      tone: 'strong'
    };
  }
  if (entropyNormalized > 0.75 || margin < 8) {
    return {
      label: 'UNCERTAIN',
      description: 'Distribution is spread; review recommended',
      tone: 'weak'
    };
  }
  return {
    label: 'LIKELY',
    description: 'Leading class clear but not isolated',
    tone: 'medium'
  };
};

// Helper function to calculate mock environmental stats
// Compute real model diagnostics from the prediction distribution.
// Assumes `predictions` is an array of { label, prob } where prob is 0-100.
const calculateMetrics = (predictions) => {
  if (!predictions || predictions.length === 0) {
    return { entropy: 0, entropyNormalized: 0, margin: 0 };
  }

  // Convert percentages to decimals (87 -> 0.87) for the math
  const probs = predictions.map(p => p.prob / 100);

  // Shannon entropy: H = -Σ p_i * log2(p_i)
  // Skip any zero-prob classes to avoid log2(0) = -Infinity
  const entropy = -probs.reduce((sum, p) => {
    if (p <= 0) return sum;
    return sum + p * Math.log2(p);
  }, 0);

  // Normalize to 0-1 range so it's readable.
  // Max entropy for N equally-likely classes is log2(N).
  const maxEntropy = Math.log2(predictions.length);
  const entropyNormalized = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // Margin: gap between top-1 and top-2 confidence (in percentage points)
  const margin = predictions.length >= 2
    ? predictions[0].prob - predictions[1].prob
    : predictions[0].prob;

  return {
    entropy,
    entropyNormalized,
    margin
  };
};

export default function App() {
  const [zip, setZip] = useState('');
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const pendingResultRef = React.useRef(null);

  const { classify, isLoading, error, result, reset } = useClassify();

  // Minimum scan duration in ms — matches one full pass of the scan animation
  const MIN_SCAN_DURATION = 5000;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      setImageFile(file);
      setAnalysis(null);
      setIsScanning(false);
      pendingResultRef.current = null;
      reset();
    }
  };

  const runSmartAnalysis = async () => {
    if (!imageFile || isLoading || isScanning) return;

    const scanStart = Date.now();
    setIsScanning(true);
    setAnalysis(null);
    pendingResultRef.current = null;

    try {
      await classify(imageFile);
    }
    catch (err) {
      console.error('Classification error:', err);
      setIsScanning(false);
      return;
    }

    // Guarantee the scan animation plays through at least one full pass
    const elapsed = Date.now() - scanStart;
    const remaining = Math.max(0, MIN_SCAN_DURATION - elapsed);

    setTimeout(() => {
      if (pendingResultRef.current) {
        setAnalysis(pendingResultRef.current);
      }
      setIsScanning(false);
    }, remaining);
  };

  // Stash result when it arrives — don't show it yet
  React.useEffect(() => {
    if (result && result.length > 0) {
      const topPrediction = result[0];
      const category = mapToCategory(topPrediction.label);

      pendingResultRef.current = {
        result: category,
        material: topPrediction.label,
        confidence: topPrediction.prob,
        top3: result,
        metrics: calculateMetrics(result)
      };
    }
  }, [result]);

  React.useEffect(() => {
    if (error) {
      console.error('Classification failed:', error);
      setAnalysis(null);
      setIsScanning(false);
      pendingResultRef.current = null;
    }
  }, [error]);

  return (
    <div
      className="min-h-screen text-zinc-200 font-sans p-8 overflow-hidden flex flex-col selection:bg-amber-400 selection:text-zinc-950 relative"
      style={{
        background: '#0b0a09',
      }}
    >
      {/* Soft amber glow top-right for warmth without saturation */}
      <div
        className="fixed top-0 right-0 w-[800px] h-[800px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 70% 30%, rgba(251, 191, 36, 0.06) 0%, transparent 55%)'
        }}
      />
      {/* Subtle warm glow bottom-left */}
      <div
        className="fixed bottom-0 left-0 w-[600px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 30% 70%, rgba(168, 162, 158, 0.04) 0%, transparent 60%)'
        }}
      />

      {/* Top Navigation Bar */}
      <header className="flex justify-between items-end mb-12 border-b border-zinc-800 pb-6 relative z-10">
        <div className="flex items-center gap-5">
          <div className="relative">
            <svg width="40" height="40" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 4L37.4545 13.5V32.5L21 42L4.54545 32.5V13.5L21 4Z" className="stroke-zinc-800" strokeWidth="1" />
              <path d="M21 8L34 15.5V29.5L21 37L8 29.5V15.5L21 8Z" className="fill-zinc-900/60 stroke-zinc-500" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="21" cy="22.5" r="3" className="fill-amber-400" />
              <path d="M21 12V15M28 26L25.5 24.5M14 26L16.5 24.5" stroke="#d4d4d8" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[1.75rem] font-light leading-none tracking-tight text-zinc-100" style={{ fontFamily: 'ui-serif, Georgia, serif' }}>
              Eco<span className="italic font-normal text-amber-100/90">sense</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
              <span className="h-[1px] w-4 bg-zinc-700" />
              <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.35em]">Material Classification</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <label className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.3em] mb-1.5 flex items-center gap-1.5">
              <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.25">
                <path d="M6 1 C8.5 1, 10 3, 10 5 C10 7.5, 6 11, 6 11 C6 11, 2 7.5, 2 5 C2 3, 3.5 1, 6 1 Z" />
                <circle cx="6" cy="5" r="1.25" />
              </svg>
              ZIP Code
            </label>
            <div className="relative group">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                className="bg-transparent border-b border-zinc-700 pb-1 px-1 focus:outline-none focus:border-amber-400/60 text-sm font-mono text-zinc-200 w-24 text-right placeholder:text-zinc-700 tracking-[0.2em] tabular-nums transition-colors"
                placeholder="00000"
                value={zip}
                onChange={(e) => {
                  // Allow only digits, cap at 5 chars
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
                  setZip(digits);
                }}
              />
              {/* Validity indicator dot */}
              <span
                className={`absolute -right-3 top-1/2 -translate-y-1/2 h-1 w-1 rounded-full transition-all duration-300 ${
                  zip.length === 5
                    ? 'bg-amber-400 opacity-100'
                    : 'bg-zinc-700 opacity-50'
                }`}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 grid grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full relative z-10">
        {/* Left column — upload */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-6 flex-1 flex flex-col backdrop-blur-md shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em]">01 — Specimen</h3>
              <span className="text-[10px] font-mono text-zinc-600">.jpg / .png</span>
            </div>

            <div className="flex-1 relative rounded-sm border border-dashed border-zinc-800 flex flex-col items-center justify-center overflow-hidden group hover:border-amber-400/40 transition-colors bg-zinc-950/50">
              {!image ? (
                <label className="cursor-pointer text-center p-10 w-full h-full flex flex-col items-center justify-center">
                  <div className="w-12 h-12 border border-zinc-800 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:border-amber-400/50 group-hover:scale-105 transition-all">
                    <svg className="w-4 h-4 text-zinc-500 group-hover:text-amber-400/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4v16m8-8H4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-normal text-sm text-zinc-300 mb-1">Drop or select an image</p>
                  <p className="text-xs text-zinc-600">Max 10MB · processed locally first</p>
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              ) : (
                <>
                  <img src={image} className="w-full h-full object-cover" alt="Target" />
                  {isScanning && (
                    <div className="absolute inset-0 z-10 bg-zinc-950/50 backdrop-blur-[2px] overflow-hidden">
                      {/* Corner brackets — targeting reticle */}
                      <div className="absolute top-3 left-3 w-4 h-4 border-l border-t border-amber-400/70" />
                      <div className="absolute top-3 right-3 w-4 h-4 border-r border-t border-amber-400/70" />
                      <div className="absolute bottom-3 left-3 w-4 h-4 border-l border-b border-amber-400/70" />
                      <div className="absolute bottom-3 right-3 w-4 h-4 border-r border-b border-amber-400/70" />

                      {/* Horizontal scan trail — thick glow that bleeds */}
                      <div
                        className="absolute w-full h-24 pointer-events-none animate-[scanTrail_5s_ease-in-out_infinite]"
                        style={{
                          background: 'linear-gradient(to bottom, transparent 0%, rgba(251, 191, 36, 0.04) 40%, rgba(251, 191, 36, 0.12) 90%, rgba(251, 191, 36, 0.25) 100%)'
                        }}
                      />

                      {/* Horizontal scan line — the sharp edge */}
                      <div
                        className="absolute w-full pointer-events-none animate-[scanLine_5s_ease-in-out_infinite]"
                        style={{
                          height: '1px',
                          background: 'linear-gradient(to right, transparent 0%, rgba(251, 191, 36, 0.4) 20%, #fbbf24 50%, rgba(251, 191, 36, 0.4) 80%, transparent 100%)',
                          boxShadow: '0 0 12px rgba(251, 191, 36, 0.6), 0 0 24px rgba(251, 191, 36, 0.3)'
                        }}
                      />

                      {/* Horizontal scan highlight — subtle glow directly on the line */}
                      <div
                        className="absolute w-full pointer-events-none animate-[scanLine_5s_ease-in-out_infinite]"
                        style={{
                          height: '2px',
                          background: 'rgba(251, 191, 36, 0.15)',
                          filter: 'blur(4px)'
                        }}
                      />

                      {/* Horizontal grid overlay — very faint, sells the "digitizing" idea */}
                      <div
                        className="absolute inset-0 opacity-[0.08] pointer-events-none"
                        style={{
                          backgroundImage: `linear-gradient(to bottom, rgba(251, 191, 36, 0.4) 1px, transparent 1px)`,
                          backgroundSize: '100% 8px'
                        }}
                      />

                      {/* Status readout — bottom left */}
                      <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          <span className="text-[10px] font-mono text-amber-100/90 uppercase tracking-[0.2em]">Scanning</span>
                        </div>
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">ConvNeXt · v1.0</span>
                          <span className="text-[9px] font-mono text-amber-400/70 tabular-nums animate-pulse">extracting features</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setImage(null);
                      setImageFile(null);
                      setAnalysis(null);
                      setIsScanning(false);
                      pendingResultRef.current = null;
                      reset();
                    }}
                    disabled={isScanning}
                    className="absolute top-3 right-3 bg-zinc-950/80 px-3 py-1.5 rounded-sm text-[10px] font-medium border border-zinc-800 backdrop-blur-md hover:bg-amber-400 hover:text-zinc-950 hover:border-amber-400 transition uppercase tracking-wider text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-zinc-950/80 disabled:hover:text-zinc-300 disabled:hover:border-zinc-800"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>

            <button
              onClick={runSmartAnalysis}
              disabled={!image || isLoading || isScanning}
              className="w-full mt-5 py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold uppercase tracking-[0.25em] rounded-sm transition-all disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed active:scale-[0.99] flex items-center justify-center gap-3 shadow-lg shadow-amber-400/10"
            >
              {(isLoading || isScanning) ? (
                <>
                  <span className="w-1 h-1 rounded-full bg-zinc-950 animate-pulse" />
                  Processing
                </>
              ) : (
                <>
                  Classify
                  <span className="text-zinc-700">→</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column — results */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {analysis ? (
            <div className="grid grid-cols-2 gap-6 h-full animate-in fade-in slide-in-from-right-8 duration-500">
              {/* Primary result card */}
              <div className="col-span-2 md:col-span-1 bg-zinc-900/50 border border-zinc-800 rounded-sm p-8 flex flex-col justify-between backdrop-blur-md shadow-2xl shadow-black/40 relative overflow-hidden">
                {/* Subtle amber corner glow to mark this as the primary result */}
                <div
                  className="absolute -top-20 -right-20 w-48 h-48 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, rgba(251, 191, 36, 0.08) 0%, transparent 70%)' }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.3em]">Result</span>
                    </div>
                    <CategoryIcon
                      category={analysis.result}
                      className="w-10 h-10 text-amber-400/80"
                    />
                  </div>

                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.3em] mb-3">Disposition</p>
                  <div
                    className="text-6xl font-light tracking-tight text-zinc-100 mb-6 lowercase leading-none"
                    style={{ fontFamily: 'ui-serif, Georgia, serif' }}
                  >
                    {analysis.result.toLowerCase()}<span className="text-amber-400">.</span>
                  </div>

                  <div className="border-l border-amber-400/30 pl-4 py-1 mb-6">
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.2em] mb-1">Material</p>
                    <p className="text-zinc-300 text-sm">{prettifyLabel(analysis.material)}</p>
                  </div>

                  {/* Disposal prep checklist */}
                  <div>
                    <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.2em] mb-3">Prep Steps</p>
                    <ul className="space-y-2">
                      {getPrepSteps(analysis.material, analysis.result).map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-xs text-zinc-300">
                          <span className="font-mono text-amber-400/60 text-[10px] pt-0.5 tabular-nums">
                            0{i + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-zinc-800 grid grid-cols-3 gap-4 relative">
                  <div className="group relative cursor-help">
                    <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em] mb-1 flex items-center gap-1">
                      Confidence
                    </p>
                    <p className="text-lg font-light text-amber-100">{analysis.confidence}<span className="text-zinc-500 text-sm">%</span></p>
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-48 bg-zinc-950 border border-zinc-800 rounded-sm p-2.5 shadow-xl">
                      <p className="text-[10px] text-zinc-300 leading-snug">Model's probability for the top class.</p>
                    </div>
                  </div>
                  <div className="group relative cursor-help">
                    <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em] mb-1">Margin</p>
                    <p className="text-lg font-light text-zinc-100 font-mono">
                      {analysis.metrics.margin >= 0 ? '+' : ''}{analysis.metrics.margin.toFixed(1)}<span className="text-zinc-500 text-sm">%</span>
                    </p>
                    <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-20 w-52 bg-zinc-950 border border-zinc-800 rounded-sm p-2.5 shadow-xl">
                      <p className="text-[10px] text-zinc-300 leading-snug">Gap between top-1 and top-2. Higher = more decisive.</p>
                    </div>
                  </div>
                  <div className="group relative cursor-help">
                    <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.2em] mb-1">Entropy</p>
                    <p className="text-lg font-light text-zinc-100 font-mono tabular-nums">
                      {analysis.metrics.entropyNormalized.toFixed(2)}
                    </p>
                    <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-20 w-56 bg-zinc-950 border border-zinc-800 rounded-sm p-2.5 shadow-xl">
                      <p className="text-[10px] text-zinc-300 leading-snug">Shannon entropy, normalized 0–1. Lower = more certain.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right stack: predictions + regional */}
              <div className="col-span-2 md:col-span-1 space-y-6 flex flex-col">
                {/* Top-3 predictions */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-sm p-8 flex-1 backdrop-blur-md shadow-2xl shadow-black/40 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em]">Distribution</h3>
                    <span className="text-[10px] font-mono text-zinc-600">top 3</span>
                  </div>
                  <div className="space-y-5 flex-1">
                    {analysis.top3.map((item, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between items-baseline text-xs">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-zinc-600 text-[10px]">0{i + 1}</span>
                            <span className={`font-medium ${i === 0 ? 'text-zinc-100' : 'text-zinc-400'}`}>{prettifyLabel(item.label)}</span>
                          </div>
                          <span className={`font-mono tabular-nums ${i === 0 ? 'text-amber-400' : 'text-zinc-500'}`}>{item.prob}%</span>
                        </div>
                        <div className="h-[2px] w-full bg-zinc-800 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-[1.4s] ease-out ${i === 0 ? 'bg-amber-400' : 'bg-zinc-700'}`}
                            style={{ width: `${item.prob}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Certainty arc + verdict */}
                  {(() => {
                    const verdict = computeVerdict(analysis.metrics);
                    const certainty = 1 - analysis.metrics.entropyNormalized;
                    // Arc is a quarter circle (90 degrees of a full circle).
                    // Circumference of r=28 circle is 2*pi*28 ≈ 175.93.
                    // Quarter arc length = 175.93 / 4 ≈ 43.98.
                    const arcLength = 43.98;
                    const arcFilled = arcLength * certainty;
                    const toneColor =
                      verdict.tone === 'strong' ? 'text-amber-400' :
                      verdict.tone === 'weak' ? 'text-zinc-500' :
                      'text-amber-200/70';

                    return (
                      <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center gap-5">
                        {/* SVG quarter arc */}
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-[135deg]">
                            {/* Background arc track */}
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              className="text-zinc-800"
                              strokeWidth="2"
                              strokeDasharray={`${arcLength} 175.93`}
                              strokeLinecap="round"
                            />
                            {/* Filled arc */}
                            <circle
                              cx="32" cy="32" r="28"
                              fill="none"
                              stroke="currentColor"
                              className={toneColor}
                              strokeWidth="2"
                              strokeDasharray={`${arcFilled} 175.93`}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dasharray 1.4s ease-out' }}
                            />
                          </svg>
                          {/* Center numeric */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className={`text-xs font-mono tabular-nums ${toneColor}`}>
                              {Math.round(certainty * 100)}
                            </span>
                          </div>
                        </div>

                        {/* Verdict text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-[0.25em]">Verdict</p>
                          </div>
                          <p className={`text-sm font-medium uppercase tracking-[0.15em] mb-1 ${toneColor}`}>
                            {verdict.label}
                          </p>
                          <p className="text-[10px] text-zinc-500 leading-snug">
                            {verdict.description}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Regional guidance — cream panel for contrast */}
                <div
                  className="rounded-sm p-8 flex flex-col justify-center shadow-2xl shadow-black/50 relative overflow-hidden"
                  style={{ background: '#f5f1ea' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="h-1 w-1 rounded-full bg-amber-600" />
                    <h3 className="text-[10px] font-medium uppercase tracking-[0.3em] text-zinc-500">
                      {REGIONAL_DATABASE[zip]?.city || "Regional Guidance"}
                    </h3>
                  </div>
                  <p
                    className="text-xl font-light leading-snug text-zinc-900"
                    style={{ fontFamily: 'ui-serif, Georgia, serif' }}
                  >
                    {REGIONAL_DATABASE[zip]?.instruction || "Enter a zip code for locale-specific disposal guidance."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full bg-zinc-900/30 border border-zinc-800 rounded-sm relative overflow-hidden backdrop-blur-md flex flex-col">
              {/* Subtle ambient glow at top */}
              <div
                className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at top, rgba(251, 191, 36, 0.04) 0%, transparent 70%)'
                }}
              />

              <div className="relative z-10 flex-1 flex flex-col p-10 lg:p-14">
                {/* Header line */}
                <div className="flex items-center gap-2 mb-8">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.3em]">Idle · Ready to Classify</span>
                </div>

                {/* Hero statement — editorial, not marketing */}
                <div className="mb-10">
                  <h2
                    className="text-4xl lg:text-5xl font-light tracking-tight text-zinc-100 leading-[1.1] mb-5"
                    style={{ fontFamily: 'ui-serif, Georgia, serif' }}
                  >
                    Less guessing<br />
                    <span className="italic text-amber-100/90">at the bin</span>.
                  </h2>
                  <p className="text-sm text-zinc-400 leading-relaxed max-w-md">
                    Snap a photo of any item and Ecosense identifies the material, points it to the right disposal pathway, and shows you exactly how to prep it.
                  </p>
                </div>

                {/* What it recognizes — class catalog */}
                <div className="mb-10">
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em] mb-4">
                    Recognizes 23 classes across four pathways
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-5 max-w-2xl">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon category="RECYCLE" className="w-4 h-4 text-amber-400/70" />
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-[0.2em]">Recycle</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Glass, metal cans, cardboard, newspaper, magazines, office paper, plastic bottles & containers
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon category="COMPOST" className="w-4 h-4 text-amber-400/70" />
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-[0.2em]">Compost</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Food waste, coffee grounds, eggshells, tea bags
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon category="DONATE" className="w-4 h-4 text-amber-400/70" />
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-[0.2em]">Donate</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Clothing, shoes — if in good condition
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 mb-2">
                        <CategoryIcon category="TRASH" className="w-4 h-4 text-amber-400/70" />
                        <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-[0.2em]">Landfill</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Aerosols, styrofoam, soft plastics, disposable cups & cutlery
                      </p>
                    </div>
                  </div>
                </div>

                {/* How it works — three brief steps */}
                <div className="mb-10">
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em] mb-4">
                    How it works
                  </p>
                  <div className="grid grid-cols-3 gap-4 max-w-2xl">
                    <div>
                      <p className="font-mono text-amber-400/60 text-[10px] mb-1.5">01</p>
                      <p className="text-xs text-zinc-300 leading-snug">Upload a photo of the item</p>
                    </div>
                    <div>
                      <p className="font-mono text-amber-400/60 text-[10px] mb-1.5">02</p>
                      <p className="text-xs text-zinc-300 leading-snug">ConvNeXt classifies the material</p>
                    </div>
                    <div>
                      <p className="font-mono text-amber-400/60 text-[10px] mb-1.5">03</p>
                      <p className="text-xs text-zinc-300 leading-snug">Get prep steps and local rules</p>
                    </div>
                  </div>
                </div>

                {/* Quiet pointer back to the upload pane — pushes to bottom */}
                <div className="mt-auto pt-6 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs font-medium uppercase tracking-[0.2em]">Begin in the upload panel</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-600">v1.0 · ConvNeXt</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-center text-[10px] font-medium text-zinc-500 uppercase tracking-[0.25em] relative z-10">
        <p>Ecosense <span className="text-zinc-700 mx-2">/</span> v1.0</p>
        <div className="flex gap-8">
          <p>ConvNeXt</p>
          <p>FastAPI</p>
          <p>React</p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scanLine {
          0% { top: -2px; opacity: 0; }
          5% { opacity: 1; }
          45% { opacity: 1; }
          50% { top: 100%; opacity: 1; }
          55% { opacity: 0; }
          95% { opacity: 0; }
          100% { top: -2px; opacity: 0; }
        }
        @keyframes scanTrail {
          0% { top: -96px; opacity: 0; }
          5% { opacity: 1; }
          45% { opacity: 1; }
          50% { top: 100%; opacity: 1; }
          55% { opacity: 0; }
          100% { top: -96px; opacity: 0; }
        }
      `}} />
    </div>
  );
}