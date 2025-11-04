import { useEffect, useMemo, useState } from "react";

const REMOTE_URL = "SEM_VLOŽ_RAW_URL_Z_GITHUBU"; // doplň neskôr

const defaultProfile = { sex:"male", age:22, heightCm:180, weightKg:75, activity:1.55, goal:"maintain" };

function mifflinStJeor({sex, age, heightCm, weightKg}){
  return sex==="male" ? 10*weightKg + 6.25*heightCm - 5*age + 5
                      : 10*weightKg + 6.25*heightCm - 5*age - 161;
}
const applyGoal = (tdee, goal) => goal==="cut" ? tdee*0.85 : goal==="bulk" ? tdee*1.10 : tdee;
const toInt = n => Math.round(n);

export default function App(){
  const [profile, setProfile] = useState(()=>JSON.parse(localStorage.getItem("profile")||"null")||defaultProfile);
  const [proteinPerKg, setProteinPerKg] = useState(2.0);
  const [fatPerKg, setFatPerKg] = useState(0.9);
  const [minutesFilter, setMinutesFilter] = useState(20);
  const [category, setCategory] = useState("všetko");
  const [query, setQuery] = useState("");
  const [meals, setMeals] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(()=>{ localStorage.setItem("profile", JSON.stringify(profile)); }, [profile]);

  useEffect(()=>{
    const cached = localStorage.getItem("payload");
    if(cached){ try{ const p=JSON.parse(cached); setMeals(p.meals||[]); setWorkouts(p.workouts||[]);}catch{} }
    if(REMOTE_URL.startsWith("http")){
      fetch(REMOTE_URL).then(r=>r.json()).then(p=>{
        setMeals(p.meals||[]); setWorkouts(p.workouts||[]);
        localStorage.setItem("payload", JSON.stringify(p));
        setLastUpdate(new Date().toISOString());
      }).catch(()=>{});
    }
    const on = ()=>setOnline(true), off = ()=>setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return ()=>{ window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  },[]);

  const stats = useMemo(()=>{
    const bmr = mifflinStJeor(profile);
    const tdee = bmr * profile.activity;
    const target = applyGoal(tdee, profile.goal);
    const p = profile.weightKg * proteinPerKg;
    const f = profile.weightKg * fatPerKg;
    const pk = p*4, fk = f*9;
    const ck = Math.max(target - pk - fk, 0);
    return { bmr:toInt(bmr), tdee:toInt(tdee), calories:toInt(target), proteinG:toInt(p), fatG:toInt(f), carbsG:toInt(ck/4) };
  }, [profile, proteinPerKg, fatPerKg]);

  const mealFiltered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return meals.filter(m => !q || m.name.toLowerCase().includes(q) || (m.tags||[]).some(t=>t.toLowerCase().includes(q)));
  }, [meals, query]);

  const workoutFiltered = useMemo(()=>{
    return workouts
      .filter(w => w.minutes <= minutesFilter)
      .filter(w => category==="všetko" ? true : w.category?.toLowerCase()===category.toLowerCase());
  }, [workouts, minutesFilter, category]);

  return (
    <div className="container">
      <div className="header">
        <h1>Brat Plan</h1>
        <span className="badge">{online ? "Online" : "Offline"}</span>
        {lastUpdate && <span className="badge">Aktualizované: {new Date(lastUpdate).toLocaleString()}</span>}
      </div>

      {/* PROFIL */}
      <section className="card">
        <h2>Profil & ciele</h2>

        <div className="grid grid-2">
          <select value={profile.sex} onChange={e=>setProfile({...profile, sex:e.target.value})}>
            <option value="male">Muž</option><option value="female">Žena</option>
          </select>
          <input type="number" value={profile.age} onChange={e=>setProfile({...profile, age:+e.target.value})} placeholder="Vek" />
          <input type="number" value={profile.heightCm} onChange={e=>setProfile({...profile, heightCm:+e.target.value})} placeholder="Výška (cm)" />
          <input type="number" value={profile.weightKg} onChange={e=>setProfile({...profile, weightKg:+e.target.value})} placeholder="Váha (kg)" />
          <select value={profile.goal} onChange={e=>setProfile({...profile, goal:e.target.value})}>
            <option value="cut">Chudnutie</option><option value="maintain">Udržiavanie</option><option value="bulk">Nárast</option>
          </select>
          <div>
            <label className="small">Aktivita: {profile.activity.toFixed(2)}</label>
            <input type="range" min="1.2" max="1.9" step="0.05"
              value={profile.activity} onChange={e=>setProfile({...profile, activity:+e.target.value})}/>
          </div>
        </div>

        <div className="grid grid-2" style={{marginTop:10}}>
          <div>
            <label className="small">Bielkoviny (g/kg): {proteinPerKg.toFixed(1)}</label>
            <input type="range" min="1.2" max="2.6" step="0.1" value={proteinPerKg} onChange={e=>setProteinPerKg(+e.target.value)} />
          </div>
          <div>
            <label className="small">Tuky (g/kg): {fatPerKg.toFixed(1)}</label>
            <input type="range" min="0.6" max="1.2" step="0.1" value={fatPerKg} onChange={e=>setFatPerKg(+e.target.value)} />
          </div>
        </div>

        <div className="kpi">
          <div>BMR: <b>{stats.bmr}</b> kcal • TDEE: <b>{stats.tdee}</b> kcal</div>
          <div>Cieľ: <b>{stats.calories}</b> kcal • P <b>{stats.proteinG} g</b> • T <b>{stats.fatG} g</b> • S <b>{stats.carbsG} g</b></div>
        </div>
        <div className="help">Tip: Aktivitu drž medzi 1.2–1.9 (sedavé → 1.2, ťažký tréning → 1.8–1.9).</div>
      </section>

      {/* JEDLÁ */}
      <section className="card">
        <div className="toolbar">
          <h2 style={{marginRight:"auto"}}>Jedlá</h2>
          <input placeholder="Hľadaj názov alebo tag (napr. snack)" value={query} onChange={e=>setQuery(e.target.value)} />
          <button onClick={()=>window.location.reload()}>Obnoviť</button>
        </div>

        <ul className="list">
          {mealFiltered.map(m=>(
            <li key={m.id} className="item">
              <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                <div><div style={{fontWeight:600}}>{m.name}</div></div>
                <div className="meta">{m.minutes} min</div>
              </div>
              <div className="meta">{m.kcal} kcal • P{m.protein} • S{m.carbs} • T{m.fat}</div>
              {m.tags?.length ? <div className="chips" style={{marginTop:8}}>
                {m.tags.map(t=><span key={t} className="chip">{t}</span>)}
              </div> : null}
            </li>
          ))}
          {!mealFiltered.length && <li className="item meta">Žiadne jedlá (skús upraviť hľadanie alebo doplniť JSON).</li>}
        </ul>
      </section>

      {/* TRÉNINGY */}
      <section className="card">
        <div className="toolbar">
          <h2 style={{marginRight:"auto"}}>Tréningy</h2>
          <select value={category} onChange={e=>setCategory(e.target.value)}>
            {["všetko","technika","agility","streľba","kondícia"].map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          <label className="small">Minúty ≤ {minutesFilter}</label>
          <input type="range" min="5" max="60" step="5" value={minutesFilter} onChange={e=>setMinutesFilter(+e.target.value)}/>
        </div>

        <ul className="list">
          {workoutFiltered.map(w=>(
            <li key={w.id} className="item">
              <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
                <div><div style={{fontWeight:600}}>{w.name}</div></div>
                <div className="meta">{w.category} • {w.minutes} min</div>
              </div>
              <ul style={{marginTop:6, paddingLeft:16}}>
                {w.items.map((it,i)=><li key={i}>• {it}</li>)}
              </ul>
            </li>
          ))}
          {!workoutFiltered.length && <li className="item meta">Nenašli sa tréningy pre aktuálne filtre.</li>}
        </ul>
      </section>

      <div className="help">Pozn.: Toto nie je zdravotná rada. Uprav ručne, ak má brat špecifické potreby.</div>
    </div>
  );
}
