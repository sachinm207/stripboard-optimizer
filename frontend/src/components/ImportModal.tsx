import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: any) => Promise<void>;
  onImportCSV?: (csvContent: string, title?: string) => Promise<void>;
  isImporting?: boolean;
}

const SAMPLE_CUSTOM_DATA = {
  production_id: "prod_shadow_protocol",
  title: "Shadow Protocol",
  num_days: 4,
  max_minutes_per_day: 540,
  actors: [
    {
      actor_id: "ACTOR_MAX",
      name: "Max Mercer",
      character_name: "Agent Mercer",
      daily_rate: 6000,
      hold_rate: 2500,
      blackout_days: []
    },
    {
      actor_id: "ACTOR_LILA",
      name: "Lila Chen",
      character_name: "The Cryptographer",
      daily_rate: 4500,
      hold_rate: 2000,
      blackout_days: []
    },
    {
      actor_id: "ACTOR_DRAKE",
      name: "Victor Drake",
      character_name: "The Arms Dealer",
      daily_rate: 3500,
      hold_rate: 1500,
      blackout_days: []
    }
  ],
  scenes: [
    {
      scene_id: "SC_01",
      scene_number: "1",
      slugline: "EXT. CARGO DOCKS - NIGHT",
      setting: "EXT_NIGHT",
      location: "Cargo Docks",
      pages_eighths: 16,
      est_shoot_minutes: 180,
      cast_ids: ["ACTOR_MAX", "ACTOR_DRAKE"],
      description: "Mercer corners Drake during weapons drop."
    },
    {
      scene_id: "SC_02",
      scene_number: "2",
      slugline: "INT. CONTAINER CRANE CAB - NIGHT",
      setting: "INT_NIGHT",
      location: "Cargo Docks",
      pages_eighths: 12,
      est_shoot_minutes: 120,
      cast_ids: ["ACTOR_MAX"],
      description: "Mercer overrides the crane hoist."
    },
    {
      scene_id: "SC_03",
      scene_number: "3",
      slugline: "INT. SAFE HOUSE - DAY",
      setting: "INT_DAY",
      location: "Safe House",
      pages_eighths: 20,
      est_shoot_minutes: 200,
      cast_ids: ["ACTOR_MAX", "ACTOR_LILA"],
      description: "Lila decrypts the encrypted satellite ledger."
    },
    {
      scene_id: "SC_04",
      scene_number: "4",
      slugline: "EXT. SAFE HOUSE ROOF - DAY",
      setting: "EXT_DAY",
      location: "Safe House",
      pages_eighths: 14,
      est_shoot_minutes: 150,
      cast_ids: ["ACTOR_LILA"],
      description: "Lila installs the microwave signal booster."
    },
    {
      scene_id: "SC_05",
      scene_number: "5",
      slugline: "INT. EMBASSY BALLROOM - NIGHT",
      setting: "INT_NIGHT",
      location: "Grand Embassy",
      pages_eighths: 24,
      est_shoot_minutes: 240,
      cast_ids: ["ACTOR_MAX", "ACTOR_DRAKE"],
      description: "Infiltration during the diplomatic gala."
    }
  ]
};

const SAMPLE_CSV_DATA = `scene_number,slugline,setting,location,pages_eighths,est_shoot_minutes,cast_names,description
1,EXT. ROOFTOP - NIGHT,EXT_NIGHT,Downtown Highrise,16,180,"Max Mercer, Victor Drake",Mercer corners Drake during exchange
2,INT. SERVER ROOM - NIGHT,INT_NIGHT,Downtown Highrise,20,190,"Max Mercer, Lila Chen",Lila downloads classified cipher
3,INT. EMBASSY - DAY,INT_DAY,Swiss Embassy,24,210,"Max Mercer, Ambassador Vance",Infiltration during diplomatic gala
4,EXT. ALPS ROAD - DAY,EXT_DAY,Mountain Pass,18,170,"Max Mercer, Victor Drake",High-speed vehicle pursuit
5,INT. SAFE HOUSE - DAY,INT_DAY,Safe House,14,140,"Max Mercer, Lila Chen",Decryption of biometric drive`;

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  onImportCSV,
  isImporting = false,
}) => {
  const [importTab, setImportTab] = useState<'json' | 'csv'>('json');
  const [jsonText, setJsonText] = useState(JSON.stringify(SAMPLE_CUSTOM_DATA, null, 2));
  const [csvText, setCsvText] = useState(SAMPLE_CSV_DATA);
  const [productionTitle, setProductionTitle] = useState('Custom Production');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (importTab === 'json') {
          try {
            JSON.parse(content);
            setJsonText(content);
            setError(null);
          } catch {
            setError('Selected file is not valid JSON');
          }
        } else {
          setCsvText(content);
          setError(null);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = () => {
    if (importTab === 'json') {
      setJsonText(JSON.stringify(SAMPLE_CUSTOM_DATA, null, 2));
    } else {
      setCsvText(SAMPLE_CSV_DATA);
    }
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (importTab === 'json') {
      try {
        const parsed = JSON.parse(jsonText);
        if (!parsed.scenes || !Array.isArray(parsed.scenes)) {
          throw new Error('JSON must contain a "scenes" array');
        }
        if (!parsed.actors || !Array.isArray(parsed.actors)) {
          throw new Error('JSON must contain an "actors" array');
        }
        await onImport(parsed);
        onClose();
      } catch (err: any) {
        setError(err.message || 'Invalid JSON format');
      }
    } else {
      try {
        if (!csvText.trim()) throw new Error('CSV breakdown content is empty');
        if (onImportCSV) {
          await onImportCSV(csvText, productionTitle);
        }
        onClose();
      } catch (err: any) {
        setError(err.message || 'Failed to import CSV');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create New Film Board / Import Breakdown</h3>
              <p className="text-xs text-slate-400">
                Upload screenplay CSV breakdown or JSON specification to initialize a full production workspace
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 pt-2">
          <button
            onClick={() => setImportTab('json')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              importTab === 'json'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            JSON Specification
          </button>
          <button
            onClick={() => setImportTab('csv')}
            className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all ${
              importTab === 'csv'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            CSV / Spreadsheet (Final Draft / StudioBinder format)
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {importTab === 'csv' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Production Title</label>
              <input
                type="text"
                value={productionTitle}
                onChange={(e) => setProductionTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                placeholder="e.g. Shadow Protocol"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <span>{importTab === 'json' ? 'JSON Structure:' : 'CSV Columns (scene_number, slugline, location, cast_names...):'}</span>
            </label>

            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors">
                <span>Upload {importTab.toUpperCase()}</span>
                <input
                  type="file"
                  accept={importTab === 'json' ? '.json' : '.csv'}
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleLoadSample}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition-colors"
              >
                Insert Sample {importTab.toUpperCase()}
              </button>
            </div>
          </div>

          {importTab === 'json' ? (
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={12}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="Paste your production JSON here..."
            />
          ) : (
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              rows={12}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="Paste your CSV breakdown text here..."
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isImporting}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-bold shadow-lg shadow-orange-900/20 transition-all"
            >
              <CheckCircle className="w-4 h-4 text-slate-950" />
              <span>{isImporting ? 'Importing & Optimizing...' : 'Import & Optimize'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
